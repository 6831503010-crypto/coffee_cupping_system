package th.mfu.cupping.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EvaluationTimingConfig {

  @Bean("evaluationClock")
  public Clock evaluationClock() {
    return Clock.systemUTC();
  }
}
