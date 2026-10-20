package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "defect_cup_evaluations")
public class DefectCupEvaluation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "defect_cup_evaluation_id")
  private Integer defectCupEvaluationId;

  @Column(name = "evaluation_id", nullable = false)
  private Integer evaluationId;

  @Column(name = "cup_number", nullable = false)
  private Integer cupNumber;

  @Column(name = "uniformity")
  private Boolean uniformity;

  @Column(name = "clean_cup")
  private Boolean cleanCup;

  @Column(name = "sweetness")
  private Boolean sweetness;

  public Integer getDefectCupEvaluationId() { return defectCupEvaluationId; }
  public void setDefectCupEvaluationId(Integer value) { this.defectCupEvaluationId = value; }

  public Integer getEvaluationId() { return evaluationId; }
  public void setEvaluationId(Integer value) { this.evaluationId = value; }

  public Integer getCupNumber() { return cupNumber; }
  public void setCupNumber(Integer value) { this.cupNumber = value; }

  public Boolean getUniformity() { return uniformity; }
  public void setUniformity(Boolean value) { this.uniformity = value; }

  public Boolean getCleanCup() { return cleanCup; }
  public void setCleanCup(Boolean value) { this.cleanCup = value; }

  public Boolean getSweetness() { return sweetness; }
  public void setSweetness(Boolean value) { this.sweetness = value; }

}
