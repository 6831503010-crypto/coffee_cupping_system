package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.DefectCupEvaluation;

public interface DefectCupEvaluationRepository extends JpaRepository<DefectCupEvaluation, Integer> {
  java.util.List<DefectCupEvaluation> findByEvaluationIdOrderByCupNumber(Integer evaluationId);


}
