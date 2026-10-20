package th.mfu.cupping.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cupping_sessions")
public class CuppingSession {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "session_id")
  private Integer sessionId;

  @Column(name = "created_by", nullable = false)
  private Integer createdBy;

  @Column(name = "session_name", nullable = false, length = 255)
  private String sessionName;

  @Column(name = "mode", nullable = false, length = 20)
  private String mode;

  @Column(name = "description", columnDefinition = "TEXT")
  private String description;

  @Column(name = "cupping_date")
  private LocalDateTime cuppingDate;

  @Column(name = "status", nullable = false, length = 30)
  private String status;

  @Column(name = "result_visibility", nullable = false, length = 20)
  private String resultVisibility;

  @Column(name = "finalized_at")
  private LocalDateTime finalizedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  public void beforeInsert() {
    if (createdAt == null) createdAt = LocalDateTime.now();
    if (status == null) status = "DRAFT";
    if (resultVisibility == null) resultVisibility = "PRIVATE";
  }

  public Integer getSessionId() { return sessionId; }
  public void setSessionId(Integer value) { this.sessionId = value; }

  public Integer getCreatedBy() { return createdBy; }
  public void setCreatedBy(Integer value) { this.createdBy = value; }

  public String getSessionName() { return sessionName; }
  public void setSessionName(String value) { this.sessionName = value; }

  public String getMode() { return mode; }
  public void setMode(String value) { this.mode = value; }

  public String getDescription() { return description; }
  public void setDescription(String value) { this.description = value; }

  public LocalDateTime getCuppingDate() { return cuppingDate; }
  public void setCuppingDate(LocalDateTime value) { this.cuppingDate = value; }

  public String getStatus() { return status; }
  public void setStatus(String value) { this.status = value; }

  public String getResultVisibility() { return resultVisibility; }
  public void setResultVisibility(String value) { this.resultVisibility = value; }

  public LocalDateTime getFinalizedAt() { return finalizedAt; }
  public void setFinalizedAt(LocalDateTime value) { this.finalizedAt = value; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime value) { this.createdAt = value; }

}
