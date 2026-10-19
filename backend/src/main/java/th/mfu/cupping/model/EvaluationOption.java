package th.mfu.cupping.model;

import jakarta.persistence.*;

@Entity
@Table(name = "evaluation_options")
public class EvaluationOption {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "option_id")
  private Integer optionId;

  @Column(name = "option_name", nullable = false, length = 255)
  private String optionName;

  @Column(name = "option_type", nullable = false, length = 100)
  private String optionType;

  @Column(name = "parent_option_id")
  private Integer parentOptionId;

  @Column(name = "active", nullable = false)
  private Boolean active;

  @PrePersist
  public void beforeInsert() { if (active == null) active = true; }

  public Integer getOptionId() { return optionId; }
  public void setOptionId(Integer value) { this.optionId = value; }

  public String getOptionName() { return optionName; }
  public void setOptionName(String value) { this.optionName = value; }

  public String getOptionType() { return optionType; }
  public void setOptionType(String value) { this.optionType = value; }

  public Integer getParentOptionId() { return parentOptionId; }
  public void setParentOptionId(Integer value) { this.parentOptionId = value; }

  public Boolean getActive() { return active; }
  public void setActive(Boolean value) { this.active = value; }

}
