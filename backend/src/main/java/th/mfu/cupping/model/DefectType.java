package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "defect_types")
public class DefectType {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "defect_type_id")
  private Integer defectTypeId;

  @Column(name = "defect_name", nullable = false, length = 100)
  private String defectName;

  @Column(name = "points_per_cup", nullable = false)
  private Integer pointsPerCup;

  @Column(name = "description", columnDefinition = "TEXT")
  private String description;

  public Integer getDefectTypeId() { return defectTypeId; }
  public void setDefectTypeId(Integer value) { this.defectTypeId = value; }

  public String getDefectName() { return defectName; }
  public void setDefectName(String value) { this.defectName = value; }

  public Integer getPointsPerCup() { return pointsPerCup; }
  public void setPointsPerCup(Integer value) { this.pointsPerCup = value; }

  public String getDescription() { return description; }
  public void setDescription(String value) { this.description = value; }

}
