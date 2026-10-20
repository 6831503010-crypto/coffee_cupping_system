package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.EvaluationOptionSelection;
import th.mfu.cupping.model.EvaluationOptionSelectionId;

public interface EvaluationOptionSelectionRepository extends JpaRepository<EvaluationOptionSelection, EvaluationOptionSelectionId> {}
