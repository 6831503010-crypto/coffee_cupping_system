package th.mfu.cupping.dto;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import th.mfu.cupping.dto.EvaluationTimingDtos.TimerView;

/**
 * The entire form is saved atomically. Database IDs are never positional sample
 * numbers.
 */
public final class EvaluationSubmissionDtos {
  private EvaluationSubmissionDtos() {
  }

  public record Cup(@Min(1) @Max(5) int cupNumber,
      boolean uniformity, boolean cleanCup, boolean sweetness) {
  }

  public record Sample(
      @NotNull Integer sessionSampleId,
      Integer dryAroma, Integer breakAroma, String colorIntensity,
      BigDecimal aromaQualityScore,
      BigDecimal flavorScore, BigDecimal aftertasteScore, BigDecimal acidityScore,
      BigDecimal bodyScore, BigDecimal balanceScore, BigDecimal overallScore,
      Integer acidityIntensity, Integer bodyLevel, String defectType,
      List<String> aromaQualities, List<String> flavorQualities,
      List<@Valid Cup> cups,
      String aromaNotes, String flavorNotes) {
  }

  public record Submission(@JsonProperty("finalize") @NotNull Boolean finalizeEvaluation,
      @NotEmpty List<@Valid Sample> samples) {
  }

  public record AromaLockRequest(
      @NotEmpty List<@Valid Sample> samples) {
  }

  public record EvaluationProgress(
      boolean aromaLocked,
      String aromaLockedAt) {
  }

  public record SavedSample(Integer evaluationId, Integer sessionSampleId,
      String status, String finalizedAt, BigDecimal totalScore,
      Sample data) {
  }

  // Read-only History view: other judges' names/scores are exposed only to the session creator.
  public record HistoryJudge(
      Integer userId,
      String name,
      String completionOutcome,
      TimerView evaluatorTimer,
      List<SavedSample> samples) {
  }

  public record HistoryEntry(
      Integer sessionId,
      String sessionName,
      String completedAt,
      List<SavedSample> samples,
      boolean sessionClosed,
      String completionOutcome,
      TimerView sessionTimer,
      TimerView evaluatorTimer,
      boolean creatorOnly,
      boolean creator,
      String displayStatus,
      List<Integer> sessionSampleIds,
      List<HistoryJudge> judges,
      int evaluatorCount) {
  }
}
