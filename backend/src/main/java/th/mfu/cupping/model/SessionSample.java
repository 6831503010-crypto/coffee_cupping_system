package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "session_samples")
public class SessionSample {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "session_sample_id")
  private Integer sessionSampleId;

  @Column(name = "session_id", nullable = false)
  private Integer sessionId;

  @Column(name = "sample_id", nullable = false)
  private Integer sampleId;

  @Column(name = "sample_code", nullable = false, length = 100)
  private String sampleCode;

  @Column(name = "display_order", nullable = false)
  private Integer displayOrder;

  public Integer getSessionSampleId() { return sessionSampleId; }
  public void setSessionSampleId(Integer value) { this.sessionSampleId = value; }

  public Integer getSessionId() { return sessionId; }
  public void setSessionId(Integer value) { this.sessionId = value; }

  public Integer getSampleId() { return sampleId; }
  public void setSampleId(Integer value) { this.sampleId = value; }

  public String getSampleCode() { return sampleCode; }
  public void setSampleCode(String value) { this.sampleCode = value; }

  public Integer getDisplayOrder() { return displayOrder; }
  public void setDisplayOrder(Integer value) { this.displayOrder = value; }

}
