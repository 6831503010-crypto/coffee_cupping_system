package th.mfu.cupping.model;

import java.io.Serializable;
import java.util.Objects;

public class EvaluationOptionSelectionId implements Serializable {
  private Integer evaluationId;
  private Integer optionId;

  public EvaluationOptionSelectionId() {}
  public EvaluationOptionSelectionId(Integer evaluationId, Integer optionId) {
    this.evaluationId = evaluationId;
    this.optionId = optionId;
  }
  public Integer getEvaluationId() { return evaluationId; }
  public void setEvaluationId(Integer evaluationId) { this.evaluationId = evaluationId; }
  public Integer getOptionId() { return optionId; }
  public void setOptionId(Integer optionId) { this.optionId = optionId; }
  @Override public boolean equals(Object obj) {
    if (this == obj) return true;
    if (!(obj instanceof EvaluationOptionSelectionId other)) return false;
    return Objects.equals(evaluationId, other.evaluationId) && Objects.equals(optionId, other.optionId);
  }
  @Override public int hashCode() { return Objects.hash(evaluationId, optionId); }
}
