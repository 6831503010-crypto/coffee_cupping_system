
package th.mfu.cupping.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class IndividualSessionDtos {

  private IndividualSessionDtos() {
  }

  public record NewSample(
      @NotBlank @Size(max = 255) String sampleName,
      @Size(max = 100) String process,
      Integer harvestYear,
      @Size(max = 255) String growingLocation,
      @Size(max = 255) String ownerProducer) {
  }

  public record SampleChoice(
      @NotBlank @Size(max = 100) String sampleCode,
      Integer sampleId,
      @Valid NewSample newSample) {
  }

  public record CreateRequest(
      @NotBlank @Size(max = 255) String sessionName,
      @NotNull @Min(1) @Max(10) Integer evaluatorLimit,
      @NotNull Boolean creatorParticipates,
      @NotEmpty List<@Valid SampleChoice> samples) {
  }

  public record LibrarySample(
      Integer sampleId,
      String sampleName,
      String process,
      Integer harvestYear,
      String growingLocation,
      String ownerProducer) {
  }

  public record SessionSample(
      Integer sessionSampleId,
      Integer sampleId,
      String sampleCode,
      String sampleName,
      String process,
      Integer harvestYear,
      String growingLocation,
      String ownerProducer) {
  }

  public record SessionView(
      Integer sessionId,
      String sessionName,
      Integer evaluatorLimit,
      Integer joinedEvaluators,
      boolean isCreator,
      boolean canEvaluate,
      boolean finalized,
      boolean sampleDetailsVisible,
      List<SessionSample> samples) {
  }
}
