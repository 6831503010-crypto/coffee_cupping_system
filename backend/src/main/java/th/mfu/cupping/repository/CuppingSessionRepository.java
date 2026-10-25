package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.CuppingSession;

public interface CuppingSessionRepository extends JpaRepository<CuppingSession, Integer> {


}
