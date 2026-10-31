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
      @Min(1900) @Max(2100) Integer harvestYear,
      @Size(max = 255) String growingLocation,
      @Size(max = 255) String ownerProducer) {
  }

  public record SampleChoice(
      @NotBlank(message = "Sample code must be a 3-digit number.") @Pattern(regexp = "[0-9]{3}", message = "Sample code must be a 3-digit number.") String sampleCode,
      Integer sampleId,
      @Valid NewSample newSample) {
  }

  public record CreateRequest(
      @NotBlank @Size(max = 255) String sessionName,
      @Size(max = 500) String description,
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
      List<SessionSample> samples,
      Integer sessionEvaluatorId,
      boolean closed) {
  }

  // Creator assigns an existing account using its registered email.
  public record AssignEvaluatorRequest(
      @NotBlank @Email @Size(max = 255) String email) {
  }

  // Returned only to the session creator.
  // The frontend combines this token with its own origin and /join/.
  public record ParticipationLink(
      String token) {
  }

  // Limited information shown before joining.
  // Deliberately contains no sample details or evaluator email addresses.
  public record JoinPreview(
      Integer sessionId,
      String sessionName,
      int evaluatorLimit,
      int joinedEvaluators,
      boolean alreadyParticipating,
      boolean canJoin,
      String message) {
  }

  // Returned after joining or assigning an evaluator.
  public record ParticipationResult(
      Integer sessionId,
      Integer sessionEvaluatorId,
      boolean alreadyParticipating) {
  }

  // Evaluator information displayed to the session creator.
  public record EvaluatorView(
      Integer sessionEvaluatorId,
      Integer userId,
      String name,
      String email,
      boolean creator) {
  }

  public record EvaluatorCandidate(
      Integer userId,
      String name,
      String email) {
  }
}
