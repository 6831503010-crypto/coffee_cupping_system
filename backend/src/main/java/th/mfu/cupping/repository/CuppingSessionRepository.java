package th.mfu.cupping.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import th.mfu.cupping.model.CuppingSession;

public interface CuppingSessionRepository
    extends JpaRepository<CuppingSession, Integer> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
      SELECT session
      FROM CuppingSession session
      WHERE session.sessionId = :id
      """)
  Optional<CuppingSession> findByIdForUpdate(@Param("id") Integer id);
}
