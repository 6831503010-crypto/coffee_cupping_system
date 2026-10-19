package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.SessionEvaluator;

public interface SessionEvaluatorRepository extends JpaRepository<SessionEvaluator, Integer> {
  java.util.List<SessionEvaluator> findBySessionId(Integer sessionId);
  boolean existsBySessionIdAndUserId(Integer sessionId, Integer userId);

}
