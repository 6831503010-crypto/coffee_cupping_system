package th.mfu.cupping.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "user_id")
  private Integer userId;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, unique = true, length = 255)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "qualification_status", length = 50)
  private String qualificationStatus;

  @Column(name = "qualification_confirmed_at")
  private LocalDateTime qualificationConfirmedAt;

  public User() {
  }

  @PrePersist
  public void onCreate() {
    if (createdAt == null) {
      createdAt = LocalDateTime.now();
    }
  }

  public Integer getUserId() {
    return userId;
  }

  public void setUserId(Integer userId) {
    this.userId = userId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  @com.fasterxml.jackson.annotation.JsonIgnore
  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public void setQualificationStatus(String qualificationStatus) { this.qualificationStatus = qualificationStatus; }

  public void setQualificationConfirmedAt(LocalDateTime qualificationConfirmedAt) { this.qualificationConfirmedAt = qualificationConfirmedAt; }

  public String getQualificationStatus() { return qualificationStatus; }

  public LocalDateTime getQualificationConfirmedAt() { return qualificationConfirmedAt; }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
