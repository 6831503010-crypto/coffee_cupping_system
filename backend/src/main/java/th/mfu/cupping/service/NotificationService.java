package th.mfu.cupping.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;

import th.mfu.cupping.dto.NotificationDtos.*;

@Service
public class NotificationService {

  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final CuppingAccessService access;

  public NotificationService(
      JdbcTemplate jdbc,
      @Qualifier("evaluationClock") Clock clock,
      CuppingAccessService access) {

    this.jdbc = jdbc;
    this.clock = clock;
    this.access = access;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void notifyEvaluatorAssigned(
      Integer membershipId,
      Integer creatorId) {

    LocalDateTime createdAt = LocalDateTime.ofInstant(
        clock.instant().truncatedTo(ChronoUnit.MICROS),
        ZoneOffset.UTC);

    int inserted = jdbc.update("""
        INSERT INTO notifications (
            recipient_user_id,
            actor_user_id,
            session_id,
            session_evaluator_id,
            notification_type,
            message,
            created_at
        )
        SELECT
            se.user_id,
            cs.created_by,
            cs.session_id,
            se.session_evaluator_id,
            'EVALUATOR_ASSIGNED',
            CONCAT(
                creator.name,
                ' assigned you to "',
                cs.session_name,
                '".'
            ),
            ?
        FROM session_evaluators se
        JOIN cupping_sessions cs
          ON cs.session_id = se.session_id
        JOIN users creator
          ON creator.user_id = cs.created_by
        WHERE se.session_evaluator_id = ?
          AND cs.created_by = ?
          AND se.user_id <> cs.created_by
        """,
        createdAt,
        membershipId,
        creatorId);

    if (inserted != 1) {
      throw new IllegalStateException(
          "Assignment notification could not be created");
    }
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public NotificationPage list(
      Authentication authentication,
      Long beforeId) {

    int recipientId = access.current(authentication).getUserId();

    if (beforeId != null && beforeId < 1) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid notification cursor");
    }

    List<Object> arguments = new ArrayList<>();
    arguments.add(recipientId);

    String cursorClause = "";

    if (beforeId != null) {
      cursorClause = " AND n.notification_id < ? ";
      arguments.add(beforeId);
    }

    List<NotificationView> rows = jdbc.query("""
        SELECT
            n.notification_id,
            n.notification_type,
            n.message,
            n.session_id,
            n.created_at,
            n.read_at,
            CASE
              WHEN cs.session_id IS NULL THEN FALSE
              WHEN cs.created_by = n.recipient_user_id THEN TRUE
              WHEN EXISTS (
                  SELECT 1
                  FROM session_evaluators se
                  WHERE se.session_id = cs.session_id
                    AND se.user_id = n.recipient_user_id
              ) THEN TRUE
              WHEN cs.result_visibility = 'PUBLIC'
                AND cs.status = 'FINALIZED' THEN TRUE
              ELSE FALSE
            END AS session_accessible
        FROM notifications n
        LEFT JOIN cupping_sessions cs
          ON cs.session_id = n.session_id
        WHERE n.recipient_user_id = ?
        """ + cursorClause + """
        ORDER BY n.notification_id DESC
        LIMIT 21
        """,
        (rs, row) -> {
          LocalDateTime createdAt = rs.getObject(
              "created_at", LocalDateTime.class);

          LocalDateTime readAt = rs.getObject(
              "read_at", LocalDateTime.class);

          return new NotificationView(
              rs.getLong("notification_id"),
              rs.getString("notification_type"),
              rs.getString("message"),
              rs.getObject("session_id", Integer.class),
              rs.getBoolean("session_accessible"),
              createdAt.toInstant(ZoneOffset.UTC),
              readAt == null
                  ? null
                  : readAt.toInstant(ZoneOffset.UTC));
        },
        arguments.toArray());

    Long unread = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM notifications
        WHERE recipient_user_id = ?
          AND read_at IS NULL
        """,
        Long.class,
        recipientId);

    boolean hasMore = rows.size() > 20;
    List<NotificationView> items = List.copyOf(
        rows.subList(0, Math.min(rows.size(), 20)));

    Long nextBeforeId = hasMore
        ? items.get(items.size() - 1).notificationId()
        : null;

    return new NotificationPage(
        items,
        unread == null ? 0L : unread,
        hasMore,
        nextBeforeId);
  }

  @Transactional
  public void markRead(
      Long notificationId,
      Authentication authentication) {

    int recipientId = access.current(authentication).getUserId();

    List<Long> owned = jdbc.query("""
        SELECT notification_id
        FROM notifications
        WHERE notification_id = ?
          AND recipient_user_id = ?
        FOR UPDATE
        """,
        (rs, row) -> rs.getLong(1),
        notificationId,
        recipientId);

    if (owned.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Notification not found");
    }

    LocalDateTime readAt = LocalDateTime.ofInstant(
        clock.instant().truncatedTo(ChronoUnit.MICROS),
        ZoneOffset.UTC);

    jdbc.update("""
        UPDATE notifications
        SET read_at = COALESCE(read_at, ?)
        WHERE notification_id = ?
          AND recipient_user_id = ?
        """,
        readAt,
        notificationId,
        recipientId);
  }
}
