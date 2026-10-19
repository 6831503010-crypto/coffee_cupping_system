package th.mfu.cupping.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations")
public class Evaluation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "evaluation_id")
  private Integer evaluationId;

  @Column(name = "session_evaluator_id", nullable = false)
  private Integer sessionEvaluatorId;

  @Column(name = "session_sample_id", nullable = false)
  private Integer sessionSampleId;

  @Column(name = "status", nullable = false, length = 30)
  private String status;

  @Column(name = "dry_aroma")
  private Integer dryAroma;

  @Column(name = "break_aroma")
  private Integer breakAroma;

  @Column(name = "color_intensity", length = 50)
  private String colorIntensity;

  @Column(name = "aroma_quality_score", precision = 5, scale = 2)
  private BigDecimal aromaQualityScore;

  @Column(name = "flavor_score", precision = 5, scale = 2)
  private BigDecimal flavorScore;

  @Column(name = "aftertaste_score", precision = 5, scale = 2)
  private BigDecimal aftertasteScore;

  @Column(name = "acidity_score", precision = 5, scale = 2)
  private BigDecimal acidityScore;

  @Column(name = "body_score", precision = 5, scale = 2)
  private BigDecimal bodyScore;

  @Column(name = "balance_score", precision = 5, scale = 2)
  private BigDecimal balanceScore;

  @Column(name = "uniformity_score", precision = 5, scale = 2)
  private BigDecimal uniformityScore;

  @Column(name = "clean_cup_score", precision = 5, scale = 2)
  private BigDecimal cleanCupScore;

  @Column(name = "sweetness_score", precision = 5, scale = 2)
  private BigDecimal sweetnessScore;

  @Column(name = "overall_score", precision = 5, scale = 2)
  private BigDecimal overallScore;

  @Column(name = "acidity_intensity")
  private Integer acidityIntensity;

  @Column(name = "body_level")
  private Integer bodyLevel;

  @Column(name = "defect_type_id")
  private Integer defectTypeId;

  @Column(name = "total_score", precision = 6, scale = 2)
  private BigDecimal totalScore;

  @Column(name = "finalized_at")
  private LocalDateTime finalizedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  public void beforeInsert() {
    if (createdAt == null) createdAt = LocalDateTime.now();
    if (status == null) status = "DRAFT";
    if (updatedAt == null) updatedAt = createdAt;
  }

  @PreUpdate
  public void beforeUpdate() { updatedAt = LocalDateTime.now(); }

  public Integer getEvaluationId() { return evaluationId; }
  public void setEvaluationId(Integer value) { this.evaluationId = value; }

  public Integer getSessionEvaluatorId() { return sessionEvaluatorId; }
  public void setSessionEvaluatorId(Integer value) { this.sessionEvaluatorId = value; }

  public Integer getSessionSampleId() { return sessionSampleId; }
  public void setSessionSampleId(Integer value) { this.sessionSampleId = value; }

  public String getStatus() { return status; }
  public void setStatus(String value) { this.status = value; }

  public Integer getDryAroma() { return dryAroma; }
  public void setDryAroma(Integer value) { this.dryAroma = value; }

  public Integer getBreakAroma() { return breakAroma; }
  public void setBreakAroma(Integer value) { this.breakAroma = value; }

  public String getColorIntensity() { return colorIntensity; }
  public void setColorIntensity(String value) { this.colorIntensity = value; }

  public BigDecimal getAromaQualityScore() { return aromaQualityScore; }
  public void setAromaQualityScore(BigDecimal value) { this.aromaQualityScore = value; }

  public BigDecimal getFlavorScore() { return flavorScore; }
  public void setFlavorScore(BigDecimal value) { this.flavorScore = value; }

  public BigDecimal getAftertasteScore() { return aftertasteScore; }
  public void setAftertasteScore(BigDecimal value) { this.aftertasteScore = value; }

  public BigDecimal getAcidityScore() { return acidityScore; }
  public void setAcidityScore(BigDecimal value) { this.acidityScore = value; }

  public BigDecimal getBodyScore() { return bodyScore; }
  public void setBodyScore(BigDecimal value) { this.bodyScore = value; }

  public BigDecimal getBalanceScore() { return balanceScore; }
  public void setBalanceScore(BigDecimal value) { this.balanceScore = value; }

  public BigDecimal getUniformityScore() { return uniformityScore; }
  public void setUniformityScore(BigDecimal value) { this.uniformityScore = value; }

  public BigDecimal getCleanCupScore() { return cleanCupScore; }
  public void setCleanCupScore(BigDecimal value) { this.cleanCupScore = value; }

  public BigDecimal getSweetnessScore() { return sweetnessScore; }
  public void setSweetnessScore(BigDecimal value) { this.sweetnessScore = value; }

  public BigDecimal getOverallScore() { return overallScore; }
  public void setOverallScore(BigDecimal value) { this.overallScore = value; }

  public Integer getAcidityIntensity() { return acidityIntensity; }
  public void setAcidityIntensity(Integer value) { this.acidityIntensity = value; }

  public Integer getBodyLevel() { return bodyLevel; }
  public void setBodyLevel(Integer value) { this.bodyLevel = value; }

  public Integer getDefectTypeId() { return defectTypeId; }
  public void setDefectTypeId(Integer value) { this.defectTypeId = value; }

  public BigDecimal getTotalScore() { return totalScore; }
  public void setTotalScore(BigDecimal value) { this.totalScore = value; }

  public LocalDateTime getFinalizedAt() { return finalizedAt; }
  public void setFinalizedAt(LocalDateTime value) { this.finalizedAt = value; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime value) { this.createdAt = value; }

  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime value) { this.updatedAt = value; }

}
