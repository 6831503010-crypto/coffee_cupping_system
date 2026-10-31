import {
  Component,
  OnInit,
  DestroyRef,
  computed,
  ElementRef,
  inject,
  ViewChild,
  signal
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CoffeeSample } from '../../models/coffee-sample';
import { ScorePicker } from './score-picker';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom,forkJoin } from 'rxjs';
import { EvaluationSubmissionService, EvaluationSamplePayload, SavedEvaluation,EvaluationTiming } from '../../services/evaluation-submission.service';
import {
  IndividualSessionService,
  SessionView
} from '../../services/individual-session.service';


@Component({
  selector: 'app-cupping',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ScorePicker
  ],
  templateUrl: './cupping.html',
  styleUrl: './cupping.css'
})
export class Cupping implements OnInit {

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  private readonly individualSessions = inject(IndividualSessionService);
  private readonly evaluations = inject(EvaluationSubmissionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessionIdParam =
    this.route.snapshot.queryParamMap.get('sessionId');

  readonly isSavedSession = this.sessionIdParam !== null;

  readonly lockingAroma = signal(false);
  readonly aromaLockError = signal('');

  loadingSession = signal(false);
  sessionLoadError = signal('');
  savedSession = signal<SessionView | null>(null);
  savingDraft = signal(false);
  saveFeedback = signal('');
  evaluationReadOnly = signal(false);
  loadingEvaluations = signal(false);
  private readonly officialScores = signal<Record<number, number | null>>({});

  officialScore(position: number): number | null {
    return this.officialScores()[position] ?? null;
  }

  readonly evaluationTiming = signal<EvaluationTiming | null>(null);
readonly beginningEvaluation = signal(false);
readonly beginError = signal('');

  private applyEvaluationTiming(timing: EvaluationTiming): void {

    if (this.destroyRef.destroyed) return;

const previous = this.evaluationTiming();

// Ignore an older response arriving after a newer one.
if (
  previous &&
  Date.parse(timing.serverNow) < Date.parse(previous.serverNow)
) {
  return;
}

this.timingReceivedAt = performance.now();
  this.evaluationTiming.set(timing);

  const terminal =
    timing.sessionClosed ||
    timing.evaluatorTimer.endedAt !== null ||
    timing.completionOutcome === 'FINALIZED' ||
    timing.completionOutcome === 'INCOMPLETE_SESSION_CLOSED';

  // Keep legacy finalized evaluations read-only too.
  if (terminal || this.evaluationReadOnly()) {
    this.evaluationReadOnly.set(true);
    this.aromaForm.disable({ emitEvent: false });
    this.flavorForm.disable({ emitEvent: false });
  }

  this.sessionStarted.set(
    timing.evaluatorTimer.startedAt !== null ||
    terminal ||
    this.evaluationReadOnly()
    );
  this.updateEvaluationTimeDisplay();
}

async beginEvaluation(): Promise<void> {
  const session = this.savedSession();

  if (
    !session ||
    this.beginningEvaluation() ||
    this.loadingEvaluations() ||
    this.evaluationReadOnly() ||
    this.sessionStarted()
  ) {
    return;
  }

  this.beginningEvaluation.set(true);
  this.beginError.set('');

  try {
    const timing = await firstValueFrom(
      this.evaluations.begin(session.sessionId)
    );
    this.applyEvaluationTiming(timing);
  } catch {
    // The request may have succeeded even if its response was lost.
    try {
      const timing = await firstValueFrom(
        this.evaluations.timing(session.sessionId)
      );
      this.applyEvaluationTiming(timing);

      if (!this.sessionStarted()) {
        this.beginError.set(
          'Evaluation could not be started. Please try again.'
        );
      }
    } catch {
      this.beginError.set(
        'Unable to confirm evaluation status. Please try again.'
      );
    }
  } finally {
    this.beginningEvaluation.set(false);
  }
  }

  readonly evaluationTimeDisplay = signal('00:00:00');
readonly timingSyncError = signal('');

private timingReceivedAt = 0;
private timingRefreshBusy = false;

private updateEvaluationTimeDisplay(): void {
  const timing = this.evaluationTiming();
  if (!timing) return;

  const personal = timing.evaluatorTimer;

  if (personal.startedAt === null) {
    this.evaluationTimeDisplay.set(
      timing.sessionClosed ? 'Not started' : '00:00:00'
    );
    return;
  }

  if (personal.elapsedSeconds !== null) {
    this.evaluationTimeDisplay.set(
      this.formatElapsedSeconds(personal.elapsedSeconds)
    );
    return;
  }

  // Older finalized records may not have a recorded duration.
  if (
    personal.endedAt !== null ||
    timing.sessionClosed ||
    timing.completionOutcome === 'FINALIZED' ||
    timing.completionOutcome === 'INCOMPLETE_SESSION_CLOSED'
  ) {
    this.evaluationTimeDisplay.set('—');
    return;
  }

  const serverElapsed =
    Date.parse(timing.serverNow) - Date.parse(personal.startedAt);

  const elapsedSinceResponse =
    performance.now() - this.timingReceivedAt;

  this.evaluationTimeDisplay.set(
    this.formatElapsedSeconds(
      Math.floor((serverElapsed + elapsedSinceResponse) / 1000)
    )
  );
}

private formatElapsedSeconds(value: number): string {
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return [hours, minutes, seconds]
    .map(part => String(part).padStart(2, '0'))
    .join(':');
}

private async refreshEvaluationTiming(): Promise<void> {
  const session = this.savedSession();

  if (
    !session ||
    !this.evaluationTiming() ||
    this.timingRefreshBusy ||
    this.beginningEvaluation() ||
    this.finalizing() ||
    this.destroyRef.destroyed
  ) {
    return;
  }

  this.timingRefreshBusy = true;

  try {
    const timing = await firstValueFrom(
      this.evaluations.timing(session.sessionId)
    );

    if (this.destroyRef.destroyed) return;

    this.applyEvaluationTiming(timing);
    this.timingSyncError.set('');
  } catch {
    if (!this.destroyRef.destroyed) {
      this.timingSyncError.set(
        'Unable to refresh evaluation status. Reconnecting…'
      );
    }
  } finally {
    this.timingRefreshBusy = false;
  }
}

private startTimingUpdates(): void {
  const displayInterval = window.setInterval(
    () => this.updateEvaluationTimeDisplay(),
    1000
  );

  const syncInterval = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void this.refreshEvaluationTiming();
    }
  }, 5000);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.refreshEvaluationTiming();
    }
  };

  const onOnline = () => {
    void this.refreshEvaluationTiming();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(displayInterval);
      window.clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    });
  }


  ngOnInit(): void {
    if (!this.isSavedSession) {
      // A cupping evaluation must belong to a saved database session.
      // Direct legacy /cupping links now open the normal session-creation flow.
      void this.router.navigate(['/individual/new'], { replaceUrl: true });
      return;
    }

    const sessionId = Number(this.sessionIdParam);

    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      this.sessionLoadError.set('Invalid session ID.');
      return;
    }

    this.startTimingUpdates();

    this.loadingSession.set(true);

    this.individualSessions.get(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this.loadingSession.set(false);

          if (session.sessionEvaluatorId == null) {
            this.sessionLoadError.set(
              'You are not an evaluator for this session.'
            );
            return;
          }

          if (session.samples.length === 0) {
            this.sessionLoadError.set(
              'This session does not contain any coffee samples.'
            );
            return;
          }

          if (session.closed) this.evaluationReadOnly.set(true);
          this.savedSession.set(session);

          // Preserve sequential positions for Previous/Next navigation.
          // Database IDs and full sample details remain in savedSession.
          this.samples.set(
            session.samples.map((_, index) =>
              this.createSample(index + 1)
            )
          );

          this.selectedSampleCount.set(session.samples.length);
          this.activeSample.set(1);
          this.currentStage.set('aroma');

          this.aromaLocked.set(false);
          this.aromaValidationActive.set(false);
          this.aromaErrorSamples.set([]);
          this.flavorValidationActive.set(false);
          this.flavorErrorSamples.set([]);

          this.aromaForm.enable({ emitEvent: false });
          this.loadAromaForm(1);

          this.sessionStarted.set(false);
          this.loadingEvaluations.set(true);

          forkJoin({
            saved: this.evaluations.load(sessionId),
            timing: this.evaluations.timing(sessionId),
            progress: this.evaluations.progress(sessionId)
          })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: ({ saved, timing, progress }) => {
                this.restoreEvaluations(saved);
                this.applyEvaluationTiming(timing);

                if (progress.aromaLocked) {
                  this.aromaLocked.set(true);
                  this.aromaForm.disable({ emitEvent: false });

                  // Preserve Review/read-only state for terminal evaluations.
                  if (!this.evaluationReadOnly()) {
                    this.goToFlavor();
                  }
                }

                this.loadingEvaluations.set(false);
              },
              error: () => {
                this.loadingEvaluations.set(false);
                this.evaluationReadOnly.set(true);
                this.sessionLoadError.set(
                  'Unable to load evaluation, timing or stage progress. Refresh before editing.'
                );
              }
            });
        },
        error: () => {
          this.loadingSession.set(false);
          this.sessionLoadError.set(
            'Unable to load this session. Check your login and access, then refresh.'
          );
        }
      });
  }

  sampleDetails(position: number) {
    return this.savedSession()?.samples[position - 1];
  }

  sampleLabel(position: number): string {
    return this.sampleDetails(position)?.sampleCode
      ?? String(position);
  }


  finalizing = signal(false);
  readonly fivePointScale = [1, 2, 3, 4, 5];

  readonly colorOptions = [
    'Low',
    'Medium',
    'High'
  ];

  readonly scoreOptions = Array.from(
    { length: 17 },
    (_, index) => 6 + index * 0.25
  );

  readonly aromaQualityGroups = [
    {
      parent: 'Floral',
      children: []
    },
    {
      parent: 'Fruity',
      children: [
        'Berry',
        'Dried Fruit',
        'Citrus Fruit'
      ]
    },
    {
      parent: 'Roasted',
      children: [
        'Cereal',
        'Burnt',
        'Tobacco'
      ]
    },
    {
      parent: 'Sour/Fermented',
      children: [
        'Sour',
        'Fermented'
      ]
    },
    {
      parent: 'Nutty/Cocoa',
      children: [
        'Nutty',
        'Cocoa'
      ]
    },
    {
      parent: 'Green/Vegetative',
      children: []
    },
    {
      parent: 'Spice',
      children: []
    },
    {
      parent: 'Sweet',
      children: [
        'Vanilla/Vanillin',
        'Brown Sugar'
      ]
    },
    {
      parent: 'Other',
      children: [
        'Chemical',
        'Musty/Earthy',
        'Woody'
      ]
    }
  ];

  groupSelectedQualities(
    values: string[] | undefined
  ): { parent: string; children: string[] }[] {

    if (!Array.isArray(values) || values.length === 0) {
      return [];
    }

    const selected = new Set(values);
    const known = new Set<string>();

    const groups: {
      parent: string;
      children: string[];
    }[] = [];

    for (const group of this.aromaQualityGroups) {

      known.add(group.parent);

      group.children.forEach(
        child => known.add(child)
      );

      const children = group.children.filter(
        child => selected.has(child)
      );

      if (
        selected.has(group.parent) ||
        children.length > 0
      ) {
        groups.push({
          parent: group.parent,
          children
        });
      }
    }

    // Preserve any unrecognized descriptors.
    for (const quality of selected) {
      if (!known.has(quality)) {
        groups.push({
          parent: quality,
          children: []
        });
      }
    }

    return groups;
  }

  private updateQualitySelection(
    current: string[],
    quality: string,
    checked: boolean
  ): string[] {

    const updated = new Set(current);

    const parentGroup = this.aromaQualityGroups.find(
      group => group.parent === quality
    );

    const childGroup = this.aromaQualityGroups.find(
      group => group.children.includes(quality)
    );

    if (checked) {

      // Selecting a child also selects its parent.
      if (childGroup) {
        updated.add(childGroup.parent);
      }

      updated.add(quality);

    } else if (parentGroup) {

      // Unchecking a parent clears its children.
      updated.delete(parentGroup.parent);

      parentGroup.children.forEach(
        child => updated.delete(child)
      );

    } else {

      // Unchecking a child keeps its parent.
      updated.delete(quality);

    }

    return [...updated];
  }


  previousSample() {

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    if (this.activeSample() > 1) {
      this.activeSample.update(
        current => current - 1
      );
    }

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(this.activeSample());
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(this.activeSample());
    }

    this.scrollToFormTop();
  }


  nextSample() {

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    const current = this.activeSample();
    const total = this.samples().length;

    const next =
      current < total
        ? current + 1
        : 1;

    this.activeSample.set(next);

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(next);
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(next);
    }

    this.scrollToFormTop();
  }


  private scrollToFormTop() {

    requestAnimationFrame(() => {

      this.cuppingPanel
        ?.nativeElement
        .scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    });
  }

  confirmAroma(lockConfirmed = false) {

    if (
      this.evaluationReadOnly() ||
      this.aromaLocked() ||
      this.lockingAroma() ||
      this.savingDraft() ||
      this.finalizing()
    ) return;
    this.saveAromaForm();

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isAromaComplete(sample)
        )
        .map(sample => sample.id);

    if (incompleteSamples.length > 0) {

      this.aromaValidationActive.set(true);

      this.aromaErrorSamples.set(
        incompleteSamples
      );

      const firstIncomplete =
        incompleteSamples[0];

      this.activeSample.set(
        firstIncomplete
      );

      this.loadAromaForm(
        firstIncomplete
      );

      this.scrollToFirstError();

      return;
    }




    this.aromaValidationActive.set(false);
    this.aromaErrorSamples.set([]);

    if (!lockConfirmed) {
      this.aromaLockError.set('');
      this.aromaLockDialog?.nativeElement.showModal();
      return;
    }

    void this.persistAromaLock();

    this.aromaForm.disable({
      emitEvent: false
    });
    this.goToFlavor();
  }

  private scrollToFirstError() {

    requestAnimationFrame(() => {

      const firstError =
        this.cuppingPanel
          ?.nativeElement
          .querySelector(
            '.validation-error'
          );

      firstError?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

    });
  }

  isAromaQualitySelected(
    quality: string
  ): boolean {

    return this.aromaForm
      .controls
      .qualities
      .value
      .includes(quality);
  }


  onAromaQualityChange(
    quality: string,
    event: Event
  ) {

    const checkbox =
      event.target as HTMLInputElement;

    const current =
      this.aromaForm.controls.qualities.value;

    const updated = this.updateQualitySelection(
      current,
      quality,
      checkbox.checked
    );

    this.aromaForm
      .controls
      .qualities
      .setValue(updated);

    this.saveAromaForm();

    if (this.aromaValidationActive()) {
      this.refreshAromaValidation();
    }
  }

  aromaForm = new FormGroup({
    dry: new FormControl<number | null>(
      null,
      Validators.required
    ),

    break: new FormControl<number | null>(
      null,
      Validators.required
    ),

    color: new FormControl<string | null>(
      null,
      Validators.required
    ),

    qualityScore: new FormControl<number | null>(
      null,
      Validators.required
    ),

    qualities: new FormControl<string[]>(
      [],
      {
        nonNullable: true
      }
    ),

    otherTastingNotes: new FormControl<string>(
      '',
      {
        nonNullable: true
      }
    )
  });

  flavorForm = new FormGroup({
    flavor: new FormControl<number | null>(
      null,
      Validators.required
    ),

    aftertaste: new FormControl<number | null>(
      null,
      Validators.required
    ),

    acidity: new FormControl<number | null>(
      null,
      Validators.required
    ),

    body: new FormControl<number | null>(
      null,
      Validators.required
    ),

    balance: new FormControl<number | null>(
      null,
      Validators.required
    ),

    overall: new FormControl<number | null>(
      null,
      Validators.required
    ),

    acidityIntensity: new FormControl<number | null>(
      null,
      Validators.required
    ),

    bodyLevel: new FormControl<number | null>(
      null,
      Validators.required
    ),

    flavorQualities: new FormControl<string[]>(
      [],
      {
        nonNullable: true
      }
    ),
    otherTastingNotes: new FormControl<string>(
      '',
      {
        nonNullable: true
      }
    )

  });


  onFlavorFormChange() {

    this.saveFlavorForm();

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  isFlavorQualitySelected(
    quality: string
  ): boolean {

    return this.flavorForm
      .controls
      .flavorQualities
      .value
      .includes(quality);
  }


  onFlavorQualityChange(
    quality: string,
    event: Event
  ) {

    const checkbox =
      event.target as HTMLInputElement;

    const current =
      this.flavorForm
        .controls
        .flavorQualities
        .value;

    const updated = this.updateQualitySelection(
      current,
      quality,
      checkbox.checked
    );

    this.flavorForm
      .controls
      .flavorQualities
      .setValue(updated);

    this.saveFlavorForm();

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

  private getFlavorMissingFields(
    sample: CoffeeSample
  ): string[] {

    const missing: string[] = [];
    const flavor = sample.flavor;

    if (flavor.flavor === null) {
      missing.push('flavor');
    }

    if (flavor.aftertaste === null) {
      missing.push('aftertaste');
    }

    if (flavor.acidity === null) {
      missing.push('acidity');
    }

    if (flavor.body === null) {
      missing.push('body');
    }

    if (flavor.balance === null) {
      missing.push('balance');
    }

    if (flavor.overall === null) {
      missing.push('overall');
    }

    if (flavor.acidityIntensity === null) {
      missing.push('acidityIntensity');
    }

    if (flavor.bodyLevel === null) {
      missing.push('bodyLevel');
    }

    if (
      !flavor.flavorQualities ||
      flavor.flavorQualities.length === 0
    ) {
      missing.push('flavorQualities');
    }


    if (
      this.getDefectiveCupCount(sample) > 0 &&
      flavor.defectType !== 'taint' &&
      flavor.defectType !== 'fault'
    ) {
      missing.push('defectType');
    }

    return missing;
  }


  isFlavorComplete(
    sample: CoffeeSample
  ): boolean {

    return (
      this.getFlavorMissingFields(sample)
        .length === 0
    );
  }


  hasFlavorError(
    field: string
  ): boolean {

    return this.activeFlavorMissingFields()
      .includes(field);
  }


  hasFlavorSampleError(
    sampleId: number
  ): boolean {

    return this.flavorErrorSamples()
      .includes(sampleId);
  }


  private refreshFlavorValidation() {

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isFlavorComplete(sample)
        )
        .map(sample => sample.id);

    this.flavorErrorSamples.set(
      incompleteSamples
    );
  }
goToReview() {

    this.saveFlavorForm();

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isFlavorComplete(sample)
        )
        .map(sample => sample.id);

    if (incompleteSamples.length > 0) {

      this.flavorValidationActive.set(true);

      this.flavorErrorSamples.set(
        incompleteSamples
      );

      const firstIncomplete =
        incompleteSamples[0];

      this.activeSample.set(
        firstIncomplete
      );

      this.loadFlavorForm(
        firstIncomplete
      );

      this.scrollToFirstError();

      return;
    }

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('review');
    this.activeSample.set(1);

    this.reviewSampleId.set(this.samples()[0]?.id ?? 1);

    this.scrollToFormTop();
  }


  private getAromaMissingFields(
  sample: CoffeeSample
): string[] {

  const missing: string[] = [];

  if (!sample.aroma.dry) {
    missing.push('dry');
  }

  if (!sample.aroma.break) {
    missing.push('break');
  }

  if (!sample.aroma.color) {
    missing.push('color');
  }

  if (!sample.aroma.qualityScore) {
    missing.push('qualityScore');
  }

  if (sample.aroma.qualities.length === 0) {
      missing.push('aromaQualities');
    }

    return missing;
  }


  isAromaComplete(
    sample: CoffeeSample
  ): boolean {

    return (
      this.getAromaMissingFields(sample).length === 0
    );
  }


  hasAromaError(
    field: string
  ): boolean {

    return this.activeAromaMissingFields()
      .includes(field);
  }


  hasAromaSampleError(
    sampleId: number
  ): boolean {

    return this.aromaErrorSamples()
      .includes(sampleId);
  }

  onAromaFormChange() {

    if (this.aromaLocked()) {
      return;
    }

    this.saveAromaForm();

    if (this.aromaValidationActive()) {
      this.refreshAromaValidation();
    }
  }

  private refreshAromaValidation() {

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isAromaComplete(sample)
        )
        .map(sample => sample.id);

    this.aromaErrorSamples.set(
      incompleteSamples
    );
  }

  @ViewChild('cuppingPanel')
  cuppingPanel?: ElementRef<HTMLElement>;

  currentStage = signal<'aroma' | 'flavor' | 'review'>('aroma');

  sessionStarted = signal(false);

  selectedSampleCount = signal(0);
  aromaLocked = signal(false);

  aromaValidationActive = signal(false);

  aromaErrorSamples = signal<number[]>([]);

  flavorValidationActive = signal(false);

  flavorErrorSamples = signal<number[]>([]);


  samples = signal<CoffeeSample[]>([]);

  activeSample = signal(1);

  activeSampleData = computed(() =>
    this.samples().find(
      sample => sample.id === this.activeSample()
    )
  );

  activeAromaMissingFields = computed(() => {

    if (!this.aromaValidationActive()) {
      return [];
    }

    const sample = this.activeSampleData();

    return sample
      ? this.getAromaMissingFields(sample)
      : [];
  });


  activeFlavorMissingFields = computed(() => {

    if (!this.flavorValidationActive()) {
      return [];
    }

    const sample = this.activeSampleData();

    return sample
      ? this.getFlavorMissingFields(sample)
      : [];
  });

  private createSample(id: number): CoffeeSample {
    return {
      id,

      aroma: {
        dry: null,
        break: null,
        color: null,
        qualityScore: null,
        qualities: [],
        otherTastingNotes: ''
      },

      flavor: {
        flavor: null,
        aftertaste: null,
        acidity: null,
        body: null,
        balance: null,
        overall: null,

        acidityIntensity: null,
        bodyLevel: null,

        uniformity: Array(5).fill(false),

        cleanCup: Array(5).fill(false),

        sweetness: Array(5).fill(false),

        defectType: null,

        flavorQualities: [],
        otherTastingNotes: ''
      }
    };
  }

  private saveAromaForm() {

    const sampleId = this.activeSample();

    const values =
      this.aromaForm.getRawValue();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          aroma: {
            ...sample.aroma,

            dry: values.dry,
            break: values.break,
            color: values.color,
            qualityScore: values.qualityScore,
            qualities: [...values.qualities],
            otherTastingNotes: values.otherTastingNotes
          }
        };
      })
    );
  }


  private loadAromaForm(sampleId: number) {

    const sample = this.samples().find(
      item => item.id === sampleId
    );

    if (!sample) {
      return;
    }

    this.aromaForm.reset(
      {
        dry: sample.aroma.dry,
        break: sample.aroma.break,
        color: sample.aroma.color,
        qualityScore: sample.aroma.qualityScore,
        qualities: [...sample.aroma.qualities],
        otherTastingNotes:sample.aroma.otherTastingNotes
      },
      {
        emitEvent: false
      }
    );
  }


  calculateCupScore(values: boolean[] | undefined): number {
    if (!Array.isArray(values)) {
      return 0;
    }

    return values.filter(Boolean).length * 2;
  }


  isCupSelected(
    group: 'uniformity' | 'cleanCup' | 'sweetness',
    cupIndex: number
  ): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return sample.flavor[group][cupIndex] ?? false;
  }


  onCupChange(
    group: 'uniformity' | 'cleanCup' | 'sweetness',
    cupIndex: number,
    event: Event
  ) {

    this.saveFlavorForm();

    const checkbox =
      event.target as HTMLInputElement;

    const checked = checkbox.checked;
    const sampleId = this.activeSample();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        const flavor = {
          ...sample.flavor,
          uniformity: [...sample.flavor.uniformity],
          cleanCup: [...sample.flavor.cleanCup],
          sweetness: [...sample.flavor.sweetness]
        };

        if (group === 'sweetness') {
          flavor.sweetness[cupIndex] = checked;
        } else {
          flavor.uniformity[cupIndex] = checked;
          flavor.cleanCup[cupIndex] = checked;
        }

        if (
          flavor.uniformity.filter(value => !value).length === 0
        ) {
          flavor.defectType = null;
        }

        return {
          ...sample,
          flavor
        };
      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

  areUniformityAndCleanCupAllSelected(): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return (
      sample.flavor.uniformity.every(Boolean) &&
      sample.flavor.cleanCup.every(Boolean)
    );
  }


  toggleUniformityAndCleanCupAll() {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    const shouldSelectAll =
      !this.areUniformityAndCleanCupAllSelected();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        const newValues = Array(5).fill(shouldSelectAll);

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            uniformity: [...newValues],
            cleanCup: [...newValues],

            // Any bulk change resets the defect choice.
            // If all cups are checked, there are no defects.
            // If all are unchecked, the user must choose
            // Taint or Fault again.
            defectType: null
          }
        };

      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

  getDefectiveCupCount(
    sample: CoffeeSample | undefined
  ): number {

    if (!sample) {
      return 0;
    }

    return sample.flavor.uniformity
      .filter(value => !value)
      .length;
  }


  cupLabel(count: number): string {
    return count <= 1
      ? 'cup'
      : 'cups';
  }


  getDefectPoints(
    defectType: 'taint' | 'fault' | null
  ): number {

    if (defectType === 'taint') {
      return -2;
    }

    if (defectType === 'fault') {
      return -4;
    }

    return 0;
  }


  getDefectLabel(
    defectType: 'taint' | 'fault' | null
  ): string {

    if (defectType === 'taint') {
      return 'Taint(-2)';
    }

    if (defectType === 'fault') {
      return 'Fault(-4)';
    }

    return '0';
  }


  calculateDefectDeduction(
    sample: CoffeeSample | undefined
  ): number {

    if (!sample) {
      return 0;
    }

    return (
      this.getDefectiveCupCount(sample) *
      this.getDefectPoints(sample.flavor.defectType)
    );
  }


  setDefectType(
    defectType: 'taint' | 'fault'
  ) {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,
            defectType
          }
        };
      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  private saveFlavorForm() {

    const sampleId = this.activeSample();

    const values =
      this.flavorForm.getRawValue();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            flavor: values.flavor,
            aftertaste: values.aftertaste,
            acidity: values.acidity,
            body: values.body,
            balance: values.balance,
            overall: values.overall,
            acidityIntensity: values.acidityIntensity,
            bodyLevel: values.bodyLevel,
            flavorQualities: [...values.flavorQualities],
            otherTastingNotes:values.otherTastingNotes
          }
        };
      })
    );
  }


  private loadFlavorForm(sampleId: number) {

    const sample = this.samples().find(
      item => item.id === sampleId
    );

    if (!sample) {
      return;
    }

    this.flavorForm.reset(
      {
        flavor: sample.flavor.flavor,
        aftertaste: sample.flavor.aftertaste,
        acidity: sample.flavor.acidity,
        body: sample.flavor.body,
        balance: sample.flavor.balance,
        overall: sample.flavor.overall,
        acidityIntensity: sample.flavor.acidityIntensity,
        bodyLevel: sample.flavor.bodyLevel,
        flavorQualities: [...sample.flavor.flavorQualities],
        otherTastingNotes:sample.flavor.otherTastingNotes
      },
      {
        emitEvent: false
      }
    );
  }

  selectSample(id: number) {

    if (id === this.activeSample()) {
      return;
    }

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    this.activeSample.set(id);

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(id);
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(id);
    }
  }


  goToFlavor() {

    if (!this.aromaLocked()) {
      return;
    }

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');

    this.activeSample.set(1);

    this.loadFlavorForm(1);

    this.scrollToFormTop();
  }

  formatScore(value: unknown): string {

    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    return Number.isInteger(number)
      ? String(number)
      : String(
          parseFloat(
            number.toFixed(2)
          )
        );
  }


  formatDefectDeduction(
    sample: CoffeeSample
  ): string {

    return this.formatScore(
      Math.abs(
        this.calculateDefectDeduction(sample)
      )
    );
  }


  backToFlavor() {

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');
    this.activeSample.set(1);

    this.loadFlavorForm(1);

    this.scrollToFormTop();
  }


  editFlavor(id: number) {

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');
    this.activeSample.set(id);

    this.loadFlavorForm(id);

    this.scrollToFormTop();
  }


  private syncCurrentForm(): void {
    if (this.currentStage() === 'aroma' && !this.aromaLocked()) {
      this.saveAromaForm();
    }
    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }
  }

  private submissionSamples(): EvaluationSamplePayload[] {
    const session = this.savedSession();
    if (!session) return [];
    return this.samples().map((sample, index) => {
      const assigned = session.samples[index];
      return {
        sessionSampleId: assigned.sessionSampleId,
        dryAroma: sample.aroma.dry,
        breakAroma: sample.aroma.break,
        colorIntensity: sample.aroma.color,
        aromaQualityScore: sample.aroma.qualityScore,
        flavorScore: sample.flavor.flavor,
        aftertasteScore: sample.flavor.aftertaste,
        acidityScore: sample.flavor.acidity,
        bodyScore: sample.flavor.body,
        balanceScore: sample.flavor.balance,
        overallScore: sample.flavor.overall,
        acidityIntensity: sample.flavor.acidityIntensity,
        bodyLevel: sample.flavor.bodyLevel,
        defectType: sample.flavor.defectType,
        aromaQualities: [...sample.aroma.qualities],
        flavorQualities: [...sample.flavor.flavorQualities],
        cups: Array.from({ length: 5 }, (_, cup) => ({
          cupNumber: cup + 1,
          uniformity: sample.flavor.uniformity[cup],
          cleanCup: sample.flavor.cleanCup[cup],
          sweetness: sample.flavor.sweetness[cup]
        })),
        aromaNotes: sample.aroma.otherTastingNotes,
        flavorNotes: sample.flavor.otherTastingNotes
      };
    });
  }

  private restoreEvaluations(saved: SavedEvaluation[]): void {
    const session = this.savedSession();
    if (!session) return;
    const byId = new Map(saved.map(item => [item.sessionSampleId, item]));
    const scored: Record<number, number | null> = {};
    this.samples.update(samples => samples.map((sample, index) => {
      const persisted = byId.get(session.samples[index].sessionSampleId);
      if (!persisted) return sample;
      const p = persisted.data;
      scored[sample.id] = persisted.totalScore;
      return {
        ...sample,
        aroma: {
          dry: p.dryAroma, break: p.breakAroma, color: p.colorIntensity,
          qualityScore: p.aromaQualityScore, qualities: [...(p.aromaQualities || [])],
          otherTastingNotes: p.aromaNotes || ''
        },
        flavor: {
          flavor: p.flavorScore, aftertaste: p.aftertasteScore,
          acidity: p.acidityScore, body: p.bodyScore, balance: p.balanceScore,
          overall: p.overallScore, acidityIntensity: p.acidityIntensity,
          bodyLevel: p.bodyLevel, defectType: p.defectType as 'taint' | 'fault' | null,
          flavorQualities: [...(p.flavorQualities || [])],
          otherTastingNotes: p.flavorNotes || '',
          uniformity: Array.from({ length: 5 }, (_, cup) =>
            p.cups?.find(c => c.cupNumber === cup + 1)?.uniformity ?? false),
          cleanCup: Array.from({ length: 5 }, (_, cup) =>
            p.cups?.find(c => c.cupNumber === cup + 1)?.cleanCup ?? false),
          sweetness: Array.from({ length: 5 }, (_, cup) =>
            p.cups?.find(c => c.cupNumber === cup + 1)?.sweetness ?? false)
        }
      };
    }));
    this.officialScores.set(scored);
    if (saved.some(item => item.status === 'FINALIZED')) {
      this.evaluationReadOnly.set(true);
      this.aromaLocked.set(true);
      this.aromaForm.disable({ emitEvent: false });
      this.flavorForm.disable({ emitEvent: false });
      this.currentStage.set('review');
    }
    this.loadAromaForm(this.activeSample());
    this.loadFlavorForm(this.activeSample());
  }

  async saveDraft(): Promise<void> {
    const session = this.savedSession();
    if (!session || this.savingDraft() || this.finalizing() ||
        this.evaluationReadOnly() || this.loadingEvaluations()) return;
    this.syncCurrentForm();
    this.savingDraft.set(true);
    this.saveFeedback.set('');
    try {
      const saved = await firstValueFrom(
        this.evaluations.save(session.sessionId, this.submissionSamples(), false)
      );
      this.officialScores.set(Object.fromEntries(saved.map(item => [
        session.samples.findIndex(s => s.sessionSampleId === item.sessionSampleId) + 1,
        item.totalScore
      ])));
      this.saveFeedback.set('Draft saved to the database.');
    } catch {
      this.saveFeedback.set('Draft was not saved. Your current form values are still here; retry.');
    } finally {
      this.savingDraft.set(false);
    }
  }

  async finalizeEvaluation(): Promise<void> {
    if (this.finalizing() || this.loadingEvaluations() || this.evaluationReadOnly()) return;
    this.syncCurrentForm();
    const session = this.savedSession();
    if (!session) {
      // Never finalize an evaluation outside a database-backed session.
      this.saveFeedback.set('Create a cupping session before saving an evaluation.');
      return;
    }
    this.finalizing.set(true);
    this.saveFeedback.set('');
    try {
      const result = await firstValueFrom(
        this.evaluations.save(session.sessionId, this.submissionSamples(), true)
      );
      if (!result.length || result.some(item => item.status !== 'FINALIZED')) {
        throw new Error('Server did not confirm finalization');
      }
      this.evaluationReadOnly.set(true);
      await this.router.navigate(['/history']);
    } catch {
      this.saveFeedback.set(
        'Finalization was not confirmed. Your form values remain intact. Refresh to check database state before retrying.'
      );
    } finally {
      this.finalizing.set(false);
    }
  }

  areAllSweetnessSelected(): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return sample.flavor.sweetness.every(Boolean);
  }


  toggleSweetnessAll() {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    const shouldSelectAll =
      !this.areAllSweetnessSelected();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            sweetness: Array(5).fill(shouldSelectAll)
          }
        };

      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

  readonly returningToSession = signal(false);
  readonly returnToSessionError = signal('');

  async backToSession(): Promise<void> {
    const session = this.savedSession();

    if (
      !session ||
      session.sessionEvaluatorId === null ||
      this.returningToSession() ||
      this.loadingEvaluations() ||
      this.savingDraft() ||
      this.finalizing()
    ) {
      return;
    }

    this.returningToSession.set(true);
    this.returnToSessionError.set('');

    try {
      // Before Begin or after completion, no draft write is needed.
      if (this.sessionStarted() && !this.evaluationReadOnly()) {
        this.syncCurrentForm();

        await firstValueFrom(
          this.evaluations.save(
            session.sessionId,
            this.submissionSamples(),
            false
          )
        );
      }

      await this.router.navigate(['/individual', session.sessionId]);
    } catch {
      this.returnToSessionError.set(
        'Could not save and return. Your form remains here. Retry, or refresh the session status before leaving.'
      );
    } finally {
      this.returningToSession.set(false);
    }
  }

  @ViewChild('aromaLockDialog')
  private aromaLockDialog?: ElementRef<HTMLDialogElement>;

  closeAromaLockDialog(): void {
    if (this.lockingAroma()) return;
    this.aromaLockDialog?.nativeElement.close();
  }

  onAromaLockCancel(event: Event): void {
    event.preventDefault();
    this.closeAromaLockDialog();
  }

  lockAromaAndContinue(): void {
    if (
      this.lockingAroma() ||
      this.savingDraft() ||
      this.finalizing() ||
      this.evaluationReadOnly() ||
      this.aromaLocked()
    ) {
      return;
    }

    this.confirmAroma(true);
  }

  private async persistAromaLock(): Promise<void> {
    this.lockingAroma.set(true);
    this.aromaLockError.set('');

    try {
      const session = this.savedSession();

      if (!session) {
        throw new Error('An active database session is required to lock aroma.');
      }

      const progress = await firstValueFrom(
        this.evaluations.lockAroma(session.sessionId, this.submissionSamples())
      );
      if (!progress.aromaLocked) {
        throw new Error('Backend did not confirm the aroma lock');
      }

      this.aromaLocked.set(true);
      this.aromaForm.disable({ emitEvent: false });
      this.aromaLockDialog?.nativeElement.close();
      this.goToFlavor();
    } catch {
      this.aromaLockError.set(
        'Aroma locking was not confirmed. Your entries remain here. ' +
        'If the connection was interrupted, refresh to retrieve the saved lock before retrying.'
      );
    } finally {
      this.lockingAroma.set(false);
    }
  }

  readonly reviewSampleId = signal(1);

readonly reviewSample = computed(() => {
  const samples = this.samples();

  return samples.find(sample => sample.id === this.reviewSampleId())
    ?? samples[0]
    ?? null;
});

selectReviewSample(sampleId: number): void {
  this.reviewSampleId.set(sampleId);
}

reviewPassedCups(values: boolean[] | undefined): number {
  return Array.isArray(values)
    ? values.filter(value => value === true).length
    : 0;
}

reviewCupSummary(values: boolean[] | undefined): string {
  if (!Array.isArray(values) || values.length !== 5) {
    return 'Cup checks incomplete';
  }

  const passed = this.reviewPassedCups(values);
  const unchecked = values
    .map((value, index) => value ? null : index + 1)
    .filter(value => value !== null);

  return unchecked.length
    ? `${passed}/5 cups · Unchecked: ${unchecked.join(', ')}`
    : '5/5 cups passed';
}

reviewScoreTiles(sample: CoffeeSample) {
  return [
    { label: 'Aroma quality', value: sample.aroma.qualityScore },
    { label: 'Flavor', value: sample.flavor.flavor },
    { label: 'Aftertaste', value: sample.flavor.aftertaste },
    { label: 'Acidity', value: sample.flavor.acidity },
    { label: 'Body', value: sample.flavor.body },
    { label: 'Balance', value: sample.flavor.balance },
    { label: 'Overall', value: sample.flavor.overall },
    {
      label: 'Uniformity',
      value: this.calculateCupScore(sample.flavor.uniformity),
      detail: this.reviewCupSummary(sample.flavor.uniformity)
    },
    {
      label: 'Clean Cup',
      value: this.calculateCupScore(sample.flavor.cleanCup),
      detail: this.reviewCupSummary(sample.flavor.cleanCup)
    },
    {
      label: 'Sweetness',
      value: this.calculateCupScore(sample.flavor.sweetness),
      detail: this.reviewCupSummary(sample.flavor.sweetness)
    }
  ];
}

reviewDefectName(sample: CoffeeSample): string {
  switch (sample.flavor.defectType) {
    case 'taint': return 'Taint';
    case 'fault': return 'Fault';
    default: return 'None';
  }
}

estimatedReviewTotal(sample: CoffeeSample): number | null {
  const rawScores = [
    sample.aroma.qualityScore,
    sample.flavor.flavor,
    sample.flavor.aftertaste,
    sample.flavor.acidity,
    sample.flavor.body,
    sample.flavor.balance,
    sample.flavor.overall
  ];

  if (rawScores.some(value =>
    value === null || value === undefined
  )) {
    return null;
  }

  const scores = rawScores.map(Number);

  if (scores.some(value => !Number.isFinite(value))) {
    return null;
  }

  const cupGroups = [
    sample.flavor.uniformity,
    sample.flavor.cleanCup,
    sample.flavor.sweetness
  ];

  if (cupGroups.some(values =>
    !Array.isArray(values) || values.length !== 5
  )) {
    return null;
  }

  const failedUniformity = 5
    - this.reviewPassedCups(sample.flavor.uniformity);

  if (
    failedUniformity > 0 &&
    !['taint', 'fault'].includes(sample.flavor.defectType ?? '')
  ) {
    return null;
  }

  const cupPoints = cupGroups.reduce(
    (total, values) => total + this.calculateCupScore(values),
    0
  );

  const deduction = failedUniformity * (
    sample.flavor.defectType === 'taint' ? 2
      : sample.flavor.defectType === 'fault' ? 4
      : 0
  );

  return Math.round((
    scores.reduce((total, score) => total + score, 0)
    + cupPoints
    - deduction
  ) * 100) / 100;
}
}
