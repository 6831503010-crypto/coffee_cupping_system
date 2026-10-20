package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "evaluation_option_selections")
@IdClass(EvaluationOptionSelectionId.class)
public class EvaluationOptionSelection {
  @Id @Column(name = "evaluation_id", nullable = false)
  private Integer evaluationId;
  @Id @Column(name = "option_id", nullable = false)
  private Integer optionId;
  public Integer getEvaluationId() { return evaluationId; }
  public void setEvaluationId(Integer evaluationId) { this.evaluationId = evaluationId; }
  public Integer getOptionId() { return optionId; }
  public void setOptionId(Integer optionId) { this.optionId = optionId; }
}
