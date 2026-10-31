package th.mfu.cupping.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "session_evaluators")
public class SessionEvaluator {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "session_evaluator_id")
  private Integer sessionEvaluatorId;

  @Column(name = "session_id", nullable = false)
  private Integer sessionId;

  @Column(name = "user_id", nullable = false)
  private Integer userId;

  @Column(name = "joined_at")
  private LocalDateTime joinedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "evaluation_started_at")
  private LocalDateTime evaluationStartedAt;

  @Column(name = "evaluation_ended_at")
  private LocalDateTime evaluationEndedAt;

  @Column(name = "elapsed_seconds")
  private Long elapsedSeconds;

  @Column(name = "completion_outcome", length = 32)
  private String completionOutcome;

  @Column(name = "aroma_locked_at")
  private LocalDateTime aromaLockedAt;

  @PrePersist
  public void beforeInsert() {
    if (createdAt == null)
      createdAt = LocalDateTime.now();
  }

  public Integer getSessionEvaluatorId() {
    return sessionEvaluatorId;
  }

  public void setSessionEvaluatorId(Integer value) {
    this.sessionEvaluatorId = value;
  }

  public Integer getSessionId() {
    return sessionId;
  }

  public void setSessionId(Integer value) {
    this.sessionId = value;
  }

  public Integer getUserId() {
    return userId;
  }

  public void setUserId(Integer value) {
    this.userId = value;
  }

  public LocalDateTime getJoinedAt() {
    return joinedAt;
  }

  public void setJoinedAt(LocalDateTime value) {
    this.joinedAt = value;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime value) {
    this.createdAt = value;
  }

  public LocalDateTime getEvaluationStartedAt() {
    return evaluationStartedAt;
  }

  public void setEvaluationStartedAt(LocalDateTime evaluationStartedAt) {
    this.evaluationStartedAt = evaluationStartedAt;
  }

  public LocalDateTime getEvaluationEndedAt() {
    return evaluationEndedAt;
  }

  public void setEvaluationEndedAt(LocalDateTime evaluationEndedAt) {
    this.evaluationEndedAt = evaluationEndedAt;
  }

  public Long getElapsedSeconds() {
    return elapsedSeconds;
  }

  public void setElapsedSeconds(Long elapsedSeconds) {
    this.elapsedSeconds = elapsedSeconds;
  }

  public String getCompletionOutcome() {
    return completionOutcome;
  }

  public void setCompletionOutcome(String completionOutcome) {
    this.completionOutcome = completionOutcome;
  }

  public LocalDateTime getAromaLockedAt() {
    return aromaLockedAt;
  }

  public void setAromaLockedAt(LocalDateTime aromaLockedAt) {
    this.aromaLockedAt = aromaLockedAt;
  }

}
