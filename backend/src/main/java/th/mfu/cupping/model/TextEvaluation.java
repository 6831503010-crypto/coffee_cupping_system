package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "text_evaluations")
public class TextEvaluation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "text_evaluation_id")
  private Integer textEvaluationId;

  @Column(name = "evaluation_id", nullable = false)
  private Integer evaluationId;

  @Column(name = "`text`", nullable = false, length = 1000)
  private String text;

  public Integer getTextEvaluationId() { return textEvaluationId; }
  public void setTextEvaluationId(Integer value) { this.textEvaluationId = value; }

  public Integer getEvaluationId() { return evaluationId; }
  public void setEvaluationId(Integer value) { this.evaluationId = value; }

  public String getText() { return text; }
  public void setText(String value) { this.text = value; }

}
