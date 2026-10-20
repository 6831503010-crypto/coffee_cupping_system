package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.Evaluation;

public interface EvaluationRepository extends JpaRepository<Evaluation, Integer> {


}
