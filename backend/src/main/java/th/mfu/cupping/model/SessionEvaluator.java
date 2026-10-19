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

  @PrePersist
  public void beforeInsert() {
    if (createdAt == null) createdAt = LocalDateTime.now();
  }

  public Integer getSessionEvaluatorId() { return sessionEvaluatorId; }
  public void setSessionEvaluatorId(Integer value) { this.sessionEvaluatorId = value; }

  public Integer getSessionId() { return sessionId; }
  public void setSessionId(Integer value) { this.sessionId = value; }

  public Integer getUserId() { return userId; }
  public void setUserId(Integer value) { this.userId = value; }

  public LocalDateTime getJoinedAt() { return joinedAt; }
  public void setJoinedAt(LocalDateTime value) { this.joinedAt = value; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime value) { this.createdAt = value; }

}
