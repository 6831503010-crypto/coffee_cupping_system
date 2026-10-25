package th.mfu.cupping.dto;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

/** The entire form is saved atomically. Database IDs are never positional sample numbers. */
public final class EvaluationSubmissionDtos {
  private EvaluationSubmissionDtos() {}

  public record Cup(@Min(1) @Max(5) int cupNumber,
                    boolean uniformity, boolean cleanCup, boolean sweetness) {}

  public record Sample(
      @NotNull Integer sessionSampleId,
      Integer dryAroma, Integer breakAroma, String colorIntensity,
      BigDecimal aromaQualityScore,
      BigDecimal flavorScore, BigDecimal aftertasteScore, BigDecimal acidityScore,
      BigDecimal bodyScore, BigDecimal balanceScore, BigDecimal overallScore,
      Integer acidityIntensity, Integer bodyLevel, String defectType,
      List<String> aromaQualities, List<String> flavorQualities,
      List<@Valid Cup> cups,
      String aromaNotes, String flavorNotes) {}

  public record Submission(@JsonProperty("finalize") @NotNull Boolean finalizeEvaluation,
                           @NotEmpty List<@Valid Sample> samples) {}

  public record SavedSample(Integer evaluationId, Integer sessionSampleId,
                            String status, String finalizedAt, BigDecimal totalScore,
                            Sample data) {}

  public record HistoryEntry(Integer sessionId, String sessionName,
                             String completedAt, List<SavedSample> samples) {}
}
