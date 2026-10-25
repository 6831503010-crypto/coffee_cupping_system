package th.mfu.cupping.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coffee_samples")
public class CoffeeSample {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "sample_id")
  private Integer sampleId;

  @Column(name = "created_by", nullable = false)
  private Integer createdBy;

  @Column(name = "sample_name", nullable = false, length = 255)
  private String sampleName;

  @Column(name = "process", length = 100)
  private String process;

  @Column(name = "harvest_year")
  private Integer harvestYear;

  @Column(name = "growing_location", length = 255)
  private String growingLocation;

  @Column(name = "owner_producer", length = 255)
  private String ownerProducer;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  public void beforeInsert() {
    if (createdAt == null) createdAt = LocalDateTime.now();
  }

  public Integer getSampleId() { return sampleId; }
  public void setSampleId(Integer value) { this.sampleId = value; }

  public Integer getCreatedBy() { return createdBy; }
  public void setCreatedBy(Integer value) { this.createdBy = value; }

  public String getSampleName() { return sampleName; }
  public void setSampleName(String value) { this.sampleName = value; }

  public String getProcess() { return process; }
  public void setProcess(String value) { this.process = value; }

  public Integer getHarvestYear() { return harvestYear; }
  public void setHarvestYear(Integer value) { this.harvestYear = value; }

  public String getGrowingLocation() { return growingLocation; }
  public void setGrowingLocation(String value) { this.growingLocation = value; }

  public String getOwnerProducer() { return ownerProducer; }
  public void setOwnerProducer(String value) { this.ownerProducer = value; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime value) { this.createdAt = value; }

}
