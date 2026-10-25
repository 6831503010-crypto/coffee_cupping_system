package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.SessionSample;

public interface SessionSampleRepository extends JpaRepository<SessionSample, Integer> {

  java.util.List<SessionSample> findBySampleId(Integer sampleId);
  boolean existsBySampleId(Integer sampleId);
}
