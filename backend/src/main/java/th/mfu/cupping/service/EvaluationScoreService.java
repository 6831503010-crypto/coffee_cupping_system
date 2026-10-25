package th.mfu.cupping.service;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.mfu.cupping.model.*;
import th.mfu.cupping.repository.*;

@Service
public class EvaluationScoreService {
  private final EvaluationRepository evaluations;
  private final DefectCupEvaluationRepository cups;
  private final DefectTypeRepository defects;

  public EvaluationScoreService(EvaluationRepository evaluations,
                                DefectCupEvaluationRepository cups,
                                DefectTypeRepository defects) {
    this.evaluations = evaluations;
    this.cups = cups;
    this.defects = defects;
  }

  // Null until all seven scored categories and all five cup results exist.
  public BigDecimal calculate(Evaluation e) {
    BigDecimal[] values = {e.getAromaQualityScore(), e.getFlavorScore(),
        e.getAftertasteScore(), e.getAcidityScore(), e.getBodyScore(),
        e.getBalanceScore(), e.getOverallScore()};
    for (BigDecimal value : values) if (value == null) return null;
    // Never trust legacy request values for cup-derived score columns.
    e.setUniformityScore(null);
    e.setCleanCupScore(null);
    e.setSweetnessScore(null);
    List<DefectCupEvaluation> rows = cups.findByEvaluationIdOrderByCupNumber(e.getEvaluationId());
    if (rows.size() != 5 || rows.stream().map(DefectCupEvaluation::getCupNumber).distinct().count() != 5) return null;
    for (var row : rows) if (row.getUniformity() == null || row.getCleanCup() == null || row.getSweetness() == null)
      return null;
    int uniformity = (int) rows.stream().filter(row -> row.getUniformity()).count();
    int clean = (int) rows.stream().filter(row -> row.getCleanCup()).count();
    int sweet = (int) rows.stream().filter(row -> row.getSweetness()).count();
    e.setUniformityScore(BigDecimal.valueOf(uniformity * 2L));
    e.setCleanCupScore(BigDecimal.valueOf(clean * 2L));
    e.setSweetnessScore(BigDecimal.valueOf(sweet * 2L));
    int missing = 5 - uniformity;
    int penalty = 0;
    if (missing > 0) {
      if (e.getDefectTypeId() == null) return null;
      penalty = defects.findById(e.getDefectTypeId()).orElseThrow().getPointsPerCup();
    }
    return CoffeeScoreCalculator.total(e.getAromaQualityScore(), e.getFlavorScore(),
        e.getAftertasteScore(), e.getAcidityScore(), e.getBodyScore(),
        e.getBalanceScore(), e.getOverallScore(), uniformity, clean, sweet,
        missing > 0 ? penalty : null);
  }

  @Transactional
  public void recalculate(Integer evaluationId) {
    Evaluation evaluation = evaluations.findById(evaluationId).orElseThrow();
    evaluation.setTotalScore(calculate(evaluation));
    evaluations.saveAndFlush(evaluation);
  }
}
