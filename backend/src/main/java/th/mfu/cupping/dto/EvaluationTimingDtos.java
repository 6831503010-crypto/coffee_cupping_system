package th.mfu.cupping.dto;

import java.time.Instant;
import java.util.List;

public final class EvaluationTimingDtos {

  private EvaluationTimingDtos() {
  }

  public record EvaluatorTimingView(
      Integer sessionEvaluatorId,
      String completionOutcome,
      TimerView evaluatorTimer) {
  }

  public record TimerView(
      Instant startedAt,
      Instant endedAt,
      Long elapsedSeconds) {
  }

  public record TimingView(
      Integer sessionId,
      Integer sessionEvaluatorId,
      Instant serverNow,
      boolean sessionClosed,
      String completionOutcome,
      TimerView sessionTimer,
      TimerView evaluatorTimer) {
  }

  public record SessionTimingView(
      Integer sessionId,
      Instant serverNow,
      boolean sessionClosed,
      TimerView sessionTimer,
      List<EvaluatorTimingView> evaluators) {
  }
}
