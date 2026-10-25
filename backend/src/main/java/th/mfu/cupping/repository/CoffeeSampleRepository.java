package th.mfu.cupping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import th.mfu.cupping.model.CoffeeSample;

public interface CoffeeSampleRepository extends JpaRepository<CoffeeSample, Integer> {


}
