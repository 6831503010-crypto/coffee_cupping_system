package th.mfu.cupping.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.IndividualSessionDtos.ParticipationResult;
import th.mfu.cupping.model.User;
import th.mfu.cupping.repository.UserRepository;

import java.security.SecureRandom;
import java.util.Base64;

import th.mfu.cupping.dto.IndividualSessionDtos.ParticipationLink;

import th.mfu.cupping.dto.IndividualSessionDtos.JoinPreview;
import th.mfu.cupping.dto.IndividualSessionDtos.EvaluatorView;

import th.mfu.cupping.dto.IndividualSessionDtos.EvaluatorCandidate;

@Service
public class SessionParticipationService {

  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final SecureRandom secureRandom = new SecureRandom();

  public SessionParticipationService(
      JdbcTemplate jdbc,
      UserRepository users) {
    this.jdbc = jdbc;
    this.users = users;
  }

  private User currentUser(String email) {
    return users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Account not found"));
  }

  private record LockedSession(
      int sessionId,
      int creatorId,
      int capacity,
      boolean creatorParticipates,
      boolean closed) {
  }

  // Hold this lock until the surrounding transaction finishes.
  private LockedSession lockSession(Integer sessionId) {
    List<LockedSession> rows = jdbc.query("""
        SELECT session_id, created_by, evaluator_capacity,
               creator_participates,
               (
                 finalized_at IS NOT NULL
                 OR status IN ('FINALIZED', 'CANCELLED')
               ) AS closed
        FROM cupping_sessions
        WHERE session_id = ? AND mode = 'INDIVIDUAL'
        FOR UPDATE
        """,
        (rs, row) -> new LockedSession(
            rs.getInt("session_id"),
            rs.getInt("created_by"),
            rs.getInt("evaluator_capacity"),
            rs.getBoolean("creator_participates"),
            rs.getBoolean("closed")),
        sessionId);

    if (rows.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Individual session not found");
    }

    return rows.get(0);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ParticipationResult assign(
      Integer sessionId,
      String evaluatorEmail,
      String authenticatedEmail) {

    User creator = currentUser(authenticatedEmail);
    LockedSession session = lockSession(sessionId);

    if (session.creatorId() != creator.getUserId()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the session creator can assign evaluators");
    }

    if (evaluatorEmail == null || evaluatorEmail.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Evaluator email is required");
    }

    User evaluator = users
        .findByEmailIgnoreCase(evaluatorEmail.trim())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "No account exists with that email"));

    return addParticipant(session, evaluator.getUserId());
  }

  // Reused later by link joining, after its token is validated.
  // The caller must already hold the session lock.
  private ParticipationResult addParticipant(
      LockedSession session,
      int userId) {

    if (userId == session.creatorId()
        && !session.creatorParticipates()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "The creator chose not to participate in this session");
    }

    List<Integer> existing = jdbc.query("""
        SELECT session_evaluator_id
        FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        """,
        (rs, row) -> rs.getInt("session_evaluator_id"),
        session.sessionId(), userId);

    // A repeat request makes no changes and uses no extra place.
    if (!existing.isEmpty()) {
      return new ParticipationResult(
          session.sessionId(), existing.get(0), true);
    }

    if (session.closed()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This session is closed to new participants");
    }

    Integer joined = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM session_evaluators
        WHERE session_id = ?
        """,
        Integer.class,
        session.sessionId());

    if (session.capacity() < 1 || session.capacity() > 10) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Session evaluator capacity is invalid");
    }

    if (joined != null && joined >= session.capacity()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This session has reached its evaluator limit");
    }

    jdbc.update("""
        INSERT INTO session_evaluators
            (session_id, user_id, joined_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        """,
        session.sessionId(), userId);

    Integer membershipId = jdbc.queryForObject("""
        SELECT session_evaluator_id
        FROM session_evaluators
        WHERE session_id = ? AND user_id = ?
        """,
        Integer.class,
        session.sessionId(), userId);

    return new ParticipationResult(
        session.sessionId(), membershipId, false);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ParticipationLink getOrCreateLink(
      Integer sessionId,
      String authenticatedEmail) {

    User creator = currentUser(authenticatedEmail);
    LockedSession session = lockSession(sessionId);

    if (session.creatorId() != creator.getUserId()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the session creator can access the participation link");
    }

    if (session.closed()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This session is closed to new participants");
    }

    String token = jdbc.queryForObject("""
        SELECT participation_token
        FROM cupping_sessions
        WHERE session_id = ?
        """,
        String.class,
        sessionId);

    if (token == null) {
      byte[] randomBytes = new byte[32];
      secureRandom.nextBytes(randomBytes);

      token = Base64.getUrlEncoder()
          .withoutPadding()
          .encodeToString(randomBytes);

      jdbc.update("""
          UPDATE cupping_sessions
          SET participation_token = ?
          WHERE session_id = ?
          """,
          token, sessionId);
    }

    return new ParticipationLink(token);
  }

  private Integer sessionIdForToken(String token) {
    if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Invalid participation link");
    }

    List<Integer> ids = jdbc.query("""
        SELECT session_id
        FROM cupping_sessions
        WHERE participation_token = ?
          AND mode = 'INDIVIDUAL'
        """,
        (rs, row) -> rs.getInt("session_id"),
        token);

    if (ids.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Invalid participation link");
    }

    return ids.get(0);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public ParticipationResult join(
      String token,
      String authenticatedEmail) {

    User evaluator = currentUser(authenticatedEmail);
    Integer sessionId = sessionIdForToken(token);

    LockedSession session = lockSession(sessionId);

    // Recheck the token after acquiring the session lock.
    String currentToken = jdbc.queryForObject("""
        SELECT participation_token
        FROM cupping_sessions
        WHERE session_id = ?
        """,
        String.class,
        sessionId);

    if (!token.equals(currentToken)) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Invalid participation link");
    }

    return addParticipant(session, evaluator.getUserId());
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public JoinPreview preview(
      String token,
      String authenticatedEmail) {

    User user = currentUser(authenticatedEmail);
    Integer sessionId = sessionIdForToken(token);

    return jdbc.query("""
        SELECT cs.session_id,
               cs.session_name,
               cs.created_by,
               cs.evaluator_capacity,
               cs.creator_participates,
               (
                 cs.finalized_at IS NOT NULL
                 OR cs.status IN ('FINALIZED', 'CANCELLED')
               ) AS closed,
               (
                 SELECT COUNT(*)
                 FROM session_evaluators se
                 WHERE se.session_id = cs.session_id
               ) AS joined_count,
               EXISTS (
                 SELECT 1
                 FROM session_evaluators se
                 WHERE se.session_id = cs.session_id
                   AND se.user_id = ?
               ) AS already_participating
        FROM cupping_sessions cs
        WHERE cs.session_id = ?
          AND cs.participation_token = ?
          AND cs.mode = 'INDIVIDUAL'
        """,
        (rs, row) -> {
          int capacity = rs.getInt("evaluator_capacity");
          int joined = rs.getInt("joined_count");
          boolean alreadyParticipating = rs.getBoolean("already_participating");

          boolean excludedCreator = rs.getInt("created_by") == user.getUserId()
              && !rs.getBoolean("creator_participates");

          boolean canJoin = false;
          String message;

          if (excludedCreator) {
            message = "You chose not to participate in this session.";
          } else if (alreadyParticipating) {
            message = "You already participate in this session.";
          } else if (rs.getBoolean("closed")) {
            message = "This session is closed to new participants.";
          } else if (capacity < 1 || capacity > 10) {
            message = "Session evaluator capacity is invalid.";
          } else if (joined >= capacity) {
            message = "This session has reached its evaluator limit.";
          } else {
            canJoin = true;
            message = "A place is available for you to join.";
          }

          return new JoinPreview(
              rs.getInt("session_id"),
              rs.getString("session_name"),
              capacity,
              joined,
              alreadyParticipating,
              canJoin,
              message);
        },
        user.getUserId(), sessionId, token)
        .stream()
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Invalid participation link"));
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<EvaluatorView> listEvaluators(
      Integer sessionId,
      String authenticatedEmail) {

    User user = currentUser(authenticatedEmail);

    List<Integer> creators = jdbc.query("""
        SELECT created_by
        FROM cupping_sessions
        WHERE session_id = ?
          AND mode = 'INDIVIDUAL'
        """,
        (rs, row) -> rs.getInt("created_by"),
        sessionId);

    if (creators.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Individual session not found");
    }

    int creatorId = creators.get(0);

    if (creatorId != user.getUserId()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the session creator can view the evaluator list");
    }

    return jdbc.query("""
        SELECT se.session_evaluator_id,
               u.user_id,
               u.name,
               u.email
        FROM session_evaluators se
        JOIN users u ON u.user_id = se.user_id
        WHERE se.session_id = ?
        ORDER BY se.session_evaluator_id
        """,
        (rs, row) -> new EvaluatorView(
            rs.getInt("session_evaluator_id"),
            rs.getInt("user_id"),
            rs.getString("name"),
            rs.getString("email"),
            rs.getInt("user_id") == creatorId),
        sessionId);
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public List<EvaluatorCandidate> searchEvaluatorCandidates(
      Integer sessionId,
      String query,
      String authenticatedEmail) {

    User user = currentUser(authenticatedEmail);

    // Read session rules without locking the session for every search.
    List<LockedSession> sessions = jdbc.query("""
        SELECT session_id, created_by, evaluator_capacity,
               creator_participates,
               (
                 finalized_at IS NOT NULL
                 OR status IN ('FINALIZED', 'CANCELLED')
               ) AS closed
        FROM cupping_sessions
        WHERE session_id = ? AND mode = 'INDIVIDUAL'
        """,
        (rs, row) -> new LockedSession(
            rs.getInt("session_id"),
            rs.getInt("created_by"),
            rs.getInt("evaluator_capacity"),
            rs.getBoolean("creator_participates"),
            rs.getBoolean("closed")),
        sessionId);

    if (sessions.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Individual session not found");
    }

    LockedSession session = sessions.get(0);

    if (session.creatorId() != user.getUserId()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the session creator can search for evaluators");
    }

    if (session.closed()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This session is closed to new participants");
    }

    String search = query == null ? "" : query.trim();

    if (search.length() < 2) {
      return List.of();
    }

    if (search.length() > 255) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Search must be 255 characters or fewer");
    }

    if (session.capacity() < 1 || session.capacity() > 10) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Session evaluator capacity is invalid");
    }

    Integer joined = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM session_evaluators
        WHERE session_id = ?
        """,
        Integer.class,
        sessionId);

    if (joined != null && joined >= session.capacity()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This session has reached its evaluator limit");
    }

    return jdbc.query("""
        SELECT u.user_id, u.name, u.email
        FROM users u
        WHERE (
          LOCATE(LOWER(?), LOWER(u.name)) > 0
          OR LOCATE(LOWER(?), LOWER(u.email)) > 0
        )
        AND NOT EXISTS (
          SELECT 1
          FROM session_evaluators se
          WHERE se.session_id = ?
            AND se.user_id = u.user_id
        )
        AND (u.user_id <> ? OR ? = TRUE)
        ORDER BY LOWER(u.name), LOWER(u.email), u.user_id
        LIMIT 10
        """,
        (rs, row) -> new EvaluatorCandidate(
            rs.getInt("user_id"),
            rs.getString("name"),
            rs.getString("email")),
        search,
        search,
        sessionId,
        session.creatorId(),
        session.creatorParticipates());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public void removeEvaluator(
      Integer membershipId,
      String authenticatedEmail) {

    User user = currentUser(authenticatedEmail);

    List<Integer> sessionIds = jdbc.query("""
        SELECT session_id
        FROM session_evaluators
        WHERE session_evaluator_id = ?
        """,
        (rs, row) -> rs.getInt("session_id"),
        membershipId);

    if (sessionIds.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Evaluator membership not found");
    }

    Integer sessionId = sessionIds.get(0);

    // Use the same session-first lock order as assignment and joining.
    List<Integer> creators = jdbc.query("""
        SELECT created_by
        FROM cupping_sessions
        WHERE session_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getInt("created_by"),
        sessionId);

    if (creators.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Session not found");
    }

    if (!creators.get(0).equals(user.getUserId())) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the session creator can remove evaluators");
    }

    Boolean closed = jdbc.queryForObject("""
        SELECT (
          finalized_at IS NOT NULL
          OR status IN ('FINALIZED', 'CANCELLED')
        )
        FROM cupping_sessions
        WHERE session_id = ?
        """,
        Boolean.class,
        sessionId);

    if (Boolean.TRUE.equals(closed)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Evaluators cannot be removed from a closed session");
    }

    // Recheck and lock the membership after acquiring the session lock.
    List<Integer> memberships = jdbc.query("""
        SELECT session_evaluator_id
        FROM session_evaluators
        WHERE session_evaluator_id = ?
          AND session_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getInt("session_evaluator_id"),
        membershipId,
        sessionId);

    if (memberships.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Evaluator membership no longer exists");
    }

    Boolean hasEvaluations = jdbc.queryForObject("""
        SELECT EXISTS (
          SELECT 1
          FROM evaluations
          WHERE session_evaluator_id = ?
        )
        """,
        Boolean.class,
        membershipId);

    if (Boolean.TRUE.equals(hasEvaluations)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This evaluator has saved evaluations and cannot be removed");
    }

    jdbc.update("""
        DELETE FROM session_evaluators
        WHERE session_evaluator_id = ?
          AND session_id = ?
        """,
        membershipId,
        sessionId);
  }
}
