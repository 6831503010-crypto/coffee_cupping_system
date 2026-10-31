
import { HttpErrorResponse } from '@angular/common/http';
import {
    EMPTY,
    Subject,
    catchError,
    finalize,
    forkJoin,
    switchMap,
    timer,
    exhaustMap,
      of,
  } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component,DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  IndividualSessionService,
  LibrarySample,
  SampleChoice,
  SessionView,
  SessionTimingView,
  EvaluatorView,
  EvaluatorCandidate
} from '../../services/individual-session.service';
import {
  CoffeeInventoryService
} from '../../services/coffee-inventory.service';

import {
  SampleFormModal,
  SampleFormSubmission
} from '../../shared/sample-form-modal/sample-form-modal';

@Component({
  selector: 'app-individual-session',
  imports: [FormsModule, RouterLink, SampleFormModal],
  templateUrl: './individual-session.html',
  styleUrl: './individual-session.css'
})
export class IndividualSession {

  private readonly api = inject(IndividualSessionService);
  private readonly inventory = inject(CoffeeInventoryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly sessionTiming = signal<SessionTimingView | null>(null);
  readonly sessionTimeDisplay = signal('00:00:00');
  readonly sessionTimingError = signal('');

  private sessionTimingStarted = false;
  private sessionTimingReceivedAt = 0;

  readonly savedSamples = signal<LibrarySample[]>([]);
  readonly sampleSearch = signal('');
  readonly samplesLoading = signal(true);
  readonly samplesError = signal('');
  readonly chosen = signal<SampleChoice[]>([]);
  readonly session = signal<SessionView | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly evaluators = signal<EvaluatorView[]>([]);
  readonly loadingEvaluators = signal(false);
  readonly evaluatorListError = signal('');

  readonly assigningEvaluator = signal(false);
  readonly evaluatorEmailError = signal('');
  readonly participationSuccess = signal('');

  readonly participationLink = signal('');
  readonly generatingLink = signal(false);
  readonly copyingLink = signal(false);
  readonly linkError = signal('');
  readonly linkMessage = signal('');

  readonly evaluatorTimingDisplays = signal<
    Record<number, { status: string; duration: string }>
  >({});

  evaluatorEmail = '';

  readonly selectedLibraryIds = computed(() =>
    new Set(
      this.chosen()
        .map(choice => choice.sampleId)
        .filter((id): id is number => id !== undefined)
    )
  );

  readonly visibleUnselectedSamples = computed(() => {
    const query = this.sampleSearch().trim().toLowerCase();
    const selected = this.selectedLibraryIds();

    return this.savedSamples().filter(sample =>
      !selected.has(sample.sampleId) &&
      (!query || [
        sample.sampleName,
        sample.growingLocation,
        sample.process
      ].some(value => (value ?? '').toLowerCase().includes(query)))
    );
  });

  private readonly rememberedCodes = new Map<number, string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly evaluatorSearchRequests = new Subject<string>();

  evaluatorSearchText = '';

  readonly evaluatorCandidates = signal<EvaluatorCandidate[]>([]);
  readonly selectedEvaluator = signal<EvaluatorCandidate | null>(null);
  readonly searchingEvaluators = signal(false);
  readonly evaluatorSearchError = signal('');
  readonly evaluatorSearchCompleted = signal(false);
  readonly evaluatorDropdownOpen = signal(false);
  readonly activeCandidateIndex = signal(-1);

  readonly removingEvaluatorId = signal<number | null>(null);
  readonly evaluatorRemovalError = signal('');

  readonly evaluatorToRemove = signal<EvaluatorView | null>(null);

  @ViewChild('removeEvaluatorDialog')
  private removeEvaluatorDialog?: ElementRef<HTMLDialogElement>;

  @ViewChild(SampleFormModal)
  private sampleFormModal?: SampleFormModal;

  openNewSampleModal(): void {
    if (!this.canAddSample()) return;
    this.sampleFormModal?.open();
  }

  setSampleSearch(value: string): void {
    this.sampleSearch.set(value);
  }

  isSelected(sampleId: number): boolean {
    return this.selectedLibraryIds().has(sampleId);
  }

  selectedLibrarySamples(): LibrarySample[] {
    const selected = this.selectedLibraryIds();
    return this.savedSamples().filter(sample => selected.has(sample.sampleId));
  }

  sampleCode(sampleId: number): string {
    return this.chosen().find(choice => choice.sampleId === sampleId)?.sampleCode ?? '';
  }

  sampleCodeError(sampleId: number): string {
    if (!this.creationAttempted()) return '';
    const choice = this.chosen().find(item => item.sampleId === sampleId);
    if (!choice || choice.sampleCode.trim()) return '';
    return 'Enter a session sample code.';
  }

  toggleLibrarySample(sample: LibrarySample): void {
    if (this.saving()) return;

    if (this.isSelected(sample.sampleId)) {
      this.chosen.update(items =>
        items.filter(choice => choice.sampleId !== sample.sampleId)
      );
      return;
    }

    if (!this.checkSampleSlot()) return;

    this.chosen.update(items => [
      ...items,
      {
        sampleId: sample.sampleId,
        sampleCode: this.rememberedCodes.get(sample.sampleId) ?? ''
      }
    ]);
  }

  updateSampleCode(sampleId: number, value: string): void {
    const code = value.slice(0, 100);
    this.rememberedCodes.set(sampleId, code);
    this.chosen.update(items => items.map(choice =>
      choice.sampleId === sampleId
        ? { ...choice, sampleCode: code }
        : choice
    ));
  }

  onSampleCodeInput(sampleId: number, event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.updateSampleCode(sampleId, input.value);
    }
  }


  readonly sessionIdParam =
    this.route.snapshot.paramMap.get('id');

  sessionName = '';
  evaluatorLimit = 1;
  sampleCount: number | null = 1;

  isSampleCountValid(): boolean {
    return this.sampleCount !== null
      && Number.isInteger(this.sampleCount)
      && this.sampleCount >= 1
      && this.sampleCount <= 10;
  }

  sampleCountMessage(): string {
    if (!this.isSampleCountValid()) {
      return 'Enter a whole number from 1 to 10.';
    }
    const selected = this.chosen().length;
    const target = this.sampleCount!;
    if (selected > target) {
      return `Remove ${selected - target} sample(s) to match your chosen count.`;
    }
    if (selected < target) {
      return `Add ${target - selected} more sample(s).`;
    }
    return 'All samples selected. Ready to create the session.';
  }

  canAddSample(): boolean {
    return !this.saving()
      && this.isSampleCountValid()
      && this.chosen().length < this.sampleCount!;
  }

  hasExactSampleCount(): boolean {
    return this.isSampleCountValid()
      && this.chosen().length === this.sampleCount;
  }

  private checkSampleSlot(): boolean {
    if (!this.isSampleCountValid()) {
      this.error.set('Enter a sample count from 1 to 10 first.');
      return false;
    }
    if (this.chosen().length >= this.sampleCount!) {
      this.error.set(
        'The selected sample count is already reached. Remove a sample or increase the count.'
      );
      return false;
    }
    return !this.saving();
  }

  creatorParticipates = false;

  constructor() {
    this.setupEvaluatorSearch();
    if (this.sessionIdParam !== null) {
      const id = Number(this.sessionIdParam);

      if (!Number.isSafeInteger(id) || id < 1) {
        this.error.set('Invalid session ID');
        return;
      }

      this.api.get(id).subscribe({
        next: data => {
          this.session.set(data);

          if (data.isCreator) {
            this.refreshEvaluators();
            this.startSessionTiming(data.sessionId);

            if (!data.closed) {
              this.generateParticipationLink();
            }
          }
        },
        error: () => this.error.set(
          'Could not load this session.'
        )
      });
    } else {
      this.loadLibrary();
    }
  }

  private loadLibrary(selectSampleId?: number): void {
    this.samplesLoading.set(true);
    this.samplesError.set('');
    this.api.library().subscribe({
      next: data => {
        this.savedSamples.set(data);
        this.samplesLoading.set(false);
        if (selectSampleId !== undefined && data.some(sample => sample.sampleId === selectSampleId)) {
          this.toggleLibrarySample(data.find(sample => sample.sampleId === selectSampleId)!);
        }
      },
      error: () => {
        this.samplesLoading.set(false);
        this.samplesError.set('Could not load saved coffee samples. Try again.');
      }
    });
  }

  retryLibrary(): void {
    this.loadLibrary();
  }

  addNew(submission: SampleFormSubmission): void {
  const modal = this.sampleFormModal;
  if (!modal) return;

  if (!this.canAddSample()) {
    modal.fail(
      this.saving()
        ? 'Please wait until session creation finishes.'
        : this.sampleCountMessage()
    );
    return;
  }

    this.inventory.create(submission.sample).subscribe({
      next: created => {
        this.rememberedCodes.set(
          created.sampleId,
          submission.sampleCode.trim()
        );

        modal.complete();
        this.loadLibrary(created.sampleId);
      },
      error: (response: HttpErrorResponse) => {
        modal.fail(
          response.status === 400
            ? 'Check the entered sample details.'
            : response.status === 401
              ? 'Please sign in again.'
              : response.status === 403
                ? 'You do not have permission to create this sample.'
                : 'Could not save your sample. Your entered details are still here.'
        );
      }
    });
}

  createSession() {
    if (this.saving()) return;

    this.creationAttempted.set(true);
    this.error.set('');

    const firstInvalid =
      this.sessionNameError()
        ? '#sessionName'
        : !this.isEvaluatorCountValid()
          ? '#evaluatorLimit'
          : !this.isSampleCountValid()
            ? '#sampleCount'
            : this.selectedSamplesError()
            ? '#sampleSelection'
              : null;

    if (firstInvalid) {
      this.focusCreationError(firstInvalid);
      return;
    }

    const name = this.sessionName.trim();

    this.saving.set(true);
    this.error.set('');

    this.api.create({
      sessionName: name,
      evaluatorLimit: this.evaluatorLimit,
      creatorParticipates: this.creatorParticipates,
      samples: this.chosen()
    }).subscribe({
      next: result => {
        this.saving.set(false);
        this.router.navigate([
          '/individual', result.sessionId
        ]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(
          'Session creation failed. Check the fields and server.'
        );
      }
    });
  }

  adjustEvaluatorCount(change: number): void {
    const current = Number(this.evaluatorLimit);

    this.evaluatorLimit = Number.isInteger(current)
      ? Math.max(1, Math.min(10, current + change))
      : 1;
  }

  adjustSampleCount(change: number): void {
    const current = this.sampleCount;

    this.sampleCount =
      current !== null && Number.isInteger(current)
        ? Math.max(1, Math.min(10, current + change))
        : 1;
  }

  isEvaluatorCountValid(): boolean {
    return Number.isInteger(this.evaluatorLimit)
      && this.evaluatorLimit >= 1
      && this.evaluatorLimit <= 10;
  }

  canSearchEvaluators(): boolean {
    const info = this.session();

    return !!info?.isCreator
      && !info.closed
      && info.joinedEvaluators < info.evaluatorLimit
      && !this.assigningEvaluator()
      && !this.loadingEvaluators()
      && this.removingEvaluatorId() === null;
  }

  private setupEvaluatorSearch(): void {
    this.evaluatorSearchRequests.pipe(
      switchMap(query => {
        // switchMap cancels the previous timer or HTTP request first.
        this.searchingEvaluators.set(false);

        const info = this.session();

        if (
          !info ||
          !this.canSearchEvaluators() ||
          query.length < 2 ||
          query.length > 255
        ) {
          return EMPTY;
        }

        this.searchingEvaluators.set(true);

        return timer(300).pipe(
          switchMap(() =>
            this.api.searchEvaluatorCandidates(info.sessionId, query)
          ),
          catchError((error: HttpErrorResponse) => {
            this.evaluatorSearchError.set(
              error.status === 401
                ? 'Please sign in again.'
                : error.status === 403
                  ? 'Only the session creator can search for evaluators.'
                  : error.status === 409
                    ? 'The session is full or closed. Refresh the evaluator list.'
                    : 'Could not search accounts. Edit the search to try again.'
            );

            return EMPTY;
          }),
          finalize(() => this.searchingEvaluators.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(candidates => {
      this.evaluatorCandidates.set(candidates);
      this.evaluatorSearchCompleted.set(true);
      this.activeCandidateIndex.set(-1);
    });
  }

  onEvaluatorSearchChange(value: string): void {
    this.evaluatorSearchText = value;

    // Editing the text invalidates the previous account selection.
    this.selectedEvaluator.set(null);
    this.evaluatorEmail = '';

    this.evaluatorCandidates.set([]);
    this.activeCandidateIndex.set(-1);
    this.evaluatorSearchCompleted.set(false);
    this.evaluatorSearchError.set('');
    this.evaluatorEmailError.set('');
    this.participationSuccess.set('');

    const query = value.trim();

    this.evaluatorDropdownOpen.set(
      this.canSearchEvaluators() && query.length >= 2
    );

    // Emit even short/empty queries to cancel an older request.
    this.evaluatorSearchRequests.next(query);
  }

  selectEvaluator(candidate: EvaluatorCandidate): void {
    if (!this.canSearchEvaluators()) return;

    this.selectedEvaluator.set(candidate);
    this.evaluatorEmail = candidate.email;
    this.evaluatorSearchText = `${candidate.name} — ${candidate.email}`;
    this.evaluatorEmailError.set('');
    this.evaluatorSearchError.set('');

    this.closeEvaluatorDropdown();
  }

  closeEvaluatorDropdown(): void {
    this.evaluatorSearchRequests.next('');
    this.evaluatorDropdownOpen.set(false);
    this.activeCandidateIndex.set(-1);
  }

  onEvaluatorSearchFocus(): void {
    if (!this.selectedEvaluator() && this.canSearchEvaluators()) {
      this.onEvaluatorSearchChange(this.evaluatorSearchText);
    }
  }

  onEvaluatorSearchKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeEvaluatorDropdown();
      return;
    }

    if (event.key === 'Tab') {
      this.closeEvaluatorDropdown();
      return;
    }

    if (event.key === 'Enter') {
      // Enter selects a suggestion; adding requires the Add button.
      event.preventDefault();

      if (this.evaluatorDropdownOpen()) {
        const candidate =
          this.evaluatorCandidates()[this.activeCandidateIndex()];

        if (candidate) {
          this.selectEvaluator(candidate);
        }
      }

      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    if (!this.canSearchEvaluators() || this.selectedEvaluator()) return;

    event.preventDefault();

    const candidates = this.evaluatorCandidates();
    if (!candidates.length) return;

    this.evaluatorDropdownOpen.set(true);

    const current = this.activeCandidateIndex();
    const next = event.key === 'ArrowDown'
      ? (current + 1) % candidates.length
      : current <= 0 ? candidates.length - 1 : current - 1;

    this.activeCandidateIndex.set(next);
  }

  resetEvaluatorSearch(): void {
    this.closeEvaluatorDropdown();
    this.evaluatorSearchText = '';
    this.evaluatorEmail = '';
    this.selectedEvaluator.set(null);
    this.evaluatorCandidates.set([]);
    this.evaluatorSearchCompleted.set(false);
    this.evaluatorSearchError.set('');
  }

  removeEvaluator(evaluator: EvaluatorView): void {
    const info = this.session();

    if (
      !info?.isCreator ||
      info.closed ||
      this.removingEvaluatorId() !== null ||
      this.assigningEvaluator() ||
      this.loadingEvaluators()
    ) {
      return;
    }

    this.evaluatorToRemove.set(evaluator);
    this.removeEvaluatorDialog?.nativeElement.showModal();
  }

  closeRemoveEvaluatorModal(): void {
    this.removeEvaluatorDialog?.nativeElement.close();
    this.evaluatorToRemove.set(null);
  }

  onRemoveEvaluatorCancel(event: Event): void {
    event.preventDefault();
    this.closeRemoveEvaluatorModal();
  }

  confirmEvaluatorRemoval(): void {
  const evaluator = this.evaluatorToRemove();
  if (!evaluator) return;
  const info = this.session();

  if (
    !info?.isCreator ||
    info.closed ||
    this.removingEvaluatorId() !== null ||
    this.assigningEvaluator() ||
    this.loadingEvaluators()
  ) {
    return;
  }

  this.closeRemoveEvaluatorModal();

  this.resetEvaluatorSearch();
  this.evaluatorRemovalError.set('');
  this.participationSuccess.set('');
  this.removingEvaluatorId.set(evaluator.sessionEvaluatorId);

  this.api.removeEvaluator(evaluator.sessionEvaluatorId).pipe(
    takeUntilDestroyed(this.destroyRef),
    finalize(() => this.removingEvaluatorId.set(null))
  ).subscribe({
    next: () => {
      this.participationSuccess.set(
        evaluator.creator
          ? 'You are no longer an evaluator. You can still manage this session.'
          : `${evaluator.name} was removed from this session.`
      );

      this.refreshEvaluators();
    },
    error: (error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          this.evaluatorRemovalError.set('Please sign in again.');
          break;
        case 403:
          this.evaluatorRemovalError.set(
            'Only the session creator can remove evaluators.'
          );
          break;
        case 404:
          this.evaluatorRemovalError.set(
            'This evaluator membership no longer exists. The list will refresh.'
          );
          break;
        case 409:
            this.evaluatorRemovalError.set(
              'Removal is unavailable because the evaluator has begun evaluation, ' +
              'has saved evaluations, or the session is closed.'
            );
            break;
        default:
          this.evaluatorRemovalError.set(
            'Could not confirm removal. Check the refreshed list before trying again.'
          );
      }

      this.refreshEvaluators();
    }
  });
}

refreshEvaluators(): void {
  const info = this.session();

  if (!info?.isCreator || this.loadingEvaluators()) return;
  this.resetEvaluatorSearch();

  this.loadingEvaluators.set(true);
  this.evaluatorListError.set('');

  forkJoin({
    session: this.api.get(info.sessionId),
    evaluators: this.api.listEvaluators(info.sessionId)
  }).pipe(
    finalize(() => this.loadingEvaluators.set(false))
  ).subscribe({
    next: result => {
      this.session.set(result.session);
      this.evaluators.set(result.evaluators);
    },
    error: () => {
      this.evaluatorListError.set(
        'Could not refresh the evaluator list. Please try again.'
      );
    }
  });
}

assignEvaluator(): void {
  const info = this.session();

  if (!info || !this.canSearchEvaluators()) return;

  this.evaluatorEmailError.set('');
  this.participationSuccess.set('');

  const candidate = this.selectedEvaluator();

  if (!candidate) {
    this.evaluatorEmailError.set(
      'Select an account from the suggestions first.'
    );
    return;
  }

  const email = candidate.email;
  this.closeEvaluatorDropdown();

  this.assigningEvaluator.set(true);

  this.api.assignEvaluator(info.sessionId, email).pipe(
    finalize(() => this.assigningEvaluator.set(false))
  ).subscribe({
    next: result => {
      this.resetEvaluatorSearch();
      this.participationSuccess.set(
        result.alreadyParticipating
          ? 'This account is already an evaluator. No extra place was used.'
          : 'Evaluator added successfully.'
      );

      this.refreshEvaluators();
    },
    error: (error: HttpErrorResponse) => {
      switch (error.status) {
        case 400:
          this.evaluatorEmailError.set('Enter a valid account email address.');
          break;
        case 403:
          this.evaluatorEmailError.set(
            'This assignment is not allowed. A creator who excluded themselves cannot be added.'
          );
          break;
        case 404:
          this.evaluatorEmailError.set(
            'The account or session could not be found. Check the email address.'
          );
          break;
        case 409:
          this.evaluatorEmailError.set(
            'The session is full or closed. No evaluator was added.'
          );
          break;
        case 401:
          this.evaluatorEmailError.set('Please sign in again.');
          break;
        default:
          this.evaluatorEmailError.set(
            'Could not confirm the assignment. Refresh the evaluator list before trying again.'
          );
      }

      this.refreshEvaluators();
    }
  });
}

generateParticipationLink(): void {
  const info = this.session();

  if (!info?.isCreator || info.closed || this.generatingLink()) return;

  this.generatingLink.set(true);
  this.linkError.set('');
  this.linkMessage.set('');

  this.api.getParticipationLink(info.sessionId).pipe(
    finalize(() => this.generatingLink.set(false))
  ).subscribe({
    next: result => {
      const tree = this.router.createUrlTree(['/join', result.token]);
      const path = this.router.serializeUrl(tree);

      this.participationLink.set(
        new URL(path, window.location.origin).href
      );
      this.linkMessage.set('Your participation link is ready to copy.');
    },
    error: (error: HttpErrorResponse) => {
      this.linkError.set(
        error.status === 409
          ? 'This session is closed. A participation link is unavailable.'
          : error.status === 401
            ? 'Please sign in again.'
            : 'Could not get the participation link. Please try again.'
      );
    }
  });
}

async copyParticipationLink(): Promise<void> {
    const link = this.participationLink();

    if (!link || this.copyingLink()) return;

    this.copyingLink.set(true);
    this.linkError.set('');
    this.linkMessage.set('');

    try {
      await navigator.clipboard.writeText(link);
      this.linkMessage.set('Participation link copied.');
    } catch {
      this.linkError.set(
        'Automatic copying is unavailable. Select and copy the link manually.'
      );
    } finally {
      this.copyingLink.set(false);
    }
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly creationAttempted = signal(false);

  sessionNameError(): string {
    if (!this.creationAttempted()) return '';

    const name = this.sessionName.trim();

    if (!name) return 'Enter a session name.';
    if (name.length > 255) return 'Use 255 characters or fewer.';

    return '';
  }

  selectedSamplesError(): string {
    if (!this.creationAttempted() || !this.isSampleCountValid()) {
      return '';
    }

    if (!this.hasExactSampleCount()) {
      return this.sampleCountMessage();
    }

    const codes = this.chosen().map(
      sample => sample.sampleCode.trim().toLowerCase()
    );

    if (codes.some(code => !code)) {
      return 'Each selected sample needs a sample code.';
    }

    if (new Set(codes).size !== codes.length) {
      return 'Sample codes must be unique.';
    }

    return '';
  }

  private focusCreationError(selector: string): void {
    setTimeout(() => {
      const target =
        this.host.nativeElement.querySelector<HTMLElement>(selector);

      if (!target) return;

      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });
    }, 0);
  }

  readonly highlightedSampleIndex = signal<number | null>(null);

  private sampleHighlightTimer?: ReturnType<typeof setTimeout>;

  private revealAddedSample(index: number): void {
    clearTimeout(this.sampleHighlightTimer);
    this.highlightedSampleIndex.set(index);

    // Wait until Angular renders the newly added row.
    setTimeout(() => {
      if (this.destroyRef.destroyed) return;

      const row = this.host.nativeElement.querySelector<HTMLElement>(
        `#selected-sample-${index}`
      );

      if (!row) return;

      row.focus({ preventScroll: true });
      row.scrollIntoView({
        behavior: window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      this.sampleHighlightTimer = setTimeout(() => {
        if (!this.destroyRef.destroyed) {
          this.highlightedSampleIndex.set(null);
        }
      }, 2000);
    }, 0);
  }

  private startSessionTiming(sessionId: number): void {
  if (this.sessionTimingStarted || this.destroyRef.destroyed) return;

  this.sessionTimingStarted = true;

  timer(0, 5000).pipe(
    exhaustMap(() =>
      this.api.getSessionTiming(sessionId).pipe(
        catchError(() => {
          this.sessionTimingError.set(
            'Unable to refresh session time. Reconnecting…'
          );
          return of(null);
        })
      )
    ),
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(timing => {
    if (!timing) return;

    this.sessionTimingReceivedAt = performance.now();
    this.sessionTiming.set(timing);
    this.sessionTimingError.set('');
    this.updateSessionTimeDisplay();
  });

  timer(0, 1000).pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(() => this.updateSessionTimeDisplay());
}

private updateSessionTimeDisplay(): void {
  this.updateEvaluatorTimingDisplays();
  const timing = this.sessionTiming();
  if (!timing) return;

  const clock = timing.sessionTimer;

  if (clock.startedAt === null) {
    this.sessionTimeDisplay.set(
      timing.sessionClosed ? 'Not started' : '00:00:00'
    );
    return;
  }

  if (clock.elapsedSeconds !== null) {
    this.sessionTimeDisplay.set(
      this.formatSessionDuration(clock.elapsedSeconds)
    );
    return;
  }

  if (timing.sessionClosed || clock.endedAt !== null) {
    this.sessionTimeDisplay.set('—');
    return;
  }

  const elapsedMilliseconds =
    Date.parse(timing.serverNow)
    - Date.parse(clock.startedAt)
    + (performance.now() - this.sessionTimingReceivedAt);

    this.sessionTimeDisplay.set(
      this.formatSessionDuration(
        Math.floor(elapsedMilliseconds / 1000)
      )
    );
  }

  private formatSessionDuration(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    return [hours, minutes, remainingSeconds]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }

  private updateEvaluatorTimingDisplays(): void {
    const timing = this.sessionTiming();
    if (!timing) return;

    const displays: Record<
      number,
      { status: string; duration: string }
    > = {};

    const estimatedServerNow =
      Date.parse(timing.serverNow)
      + (performance.now() - this.sessionTimingReceivedAt);

    for (const evaluator of timing.evaluators) {
      const personal = evaluator.evaluatorTimer;
      const outcome = evaluator.completionOutcome;

      let status: string;

      switch (outcome) {
        case 'FINALIZED':
          status = 'Finalized';
          break;
        case 'INCOMPLETE_SESSION_CLOSED':
          status = 'Incomplete — Session Closed';
          break;
        case 'IN_PROGRESS':
          status = timing.sessionClosed
            ? 'Session closed'
            : 'Evaluating';
          break;
        default:
          status = timing.sessionClosed
            ? 'Session closed — outcome unavailable'
            : 'Not started';
      }

      let duration: string;

      if (personal.elapsedSeconds !== null) {
        duration = this.formatSessionDuration(personal.elapsedSeconds);
      } else if (
        personal.startedAt === null &&
        outcome === 'INCOMPLETE_SESSION_CLOSED'
      ) {
        duration = 'Not started';
      } else if (
        personal.startedAt === null &&
        !timing.sessionClosed &&
        outcome === null
      ) {
        duration = '00:00:00';
      } else if (
        personal.startedAt !== null &&
        personal.endedAt === null &&
        outcome === 'IN_PROGRESS' &&
        !timing.sessionClosed
      ) {
        duration = this.formatSessionDuration(
          Math.floor(
            (estimatedServerNow - Date.parse(personal.startedAt)) / 1000
          )
        );
      } else {
        duration = '—';
      }

      displays[evaluator.sessionEvaluatorId] = {
        status,
        duration
      };
    }

    this.evaluatorTimingDisplays.set(displays);
  }

  @ViewChild('finalizeSessionDialog')
  private finalizeSessionDialog?: ElementRef<HTMLDialogElement>;

  readonly finalizingSession = signal(false);
  readonly sessionFinalizationError = signal('');
  readonly sessionFinalizationSuccess = signal('');

  openFinalizeSessionModal(): void {
    const info = this.session();

    if (!info?.isCreator || info.closed || this.finalizingSession()) {
      return;
    }

    this.sessionFinalizationError.set('');
    this.sessionFinalizationSuccess.set('');
    this.finalizeSessionDialog?.nativeElement.showModal();
  }

  closeFinalizeSessionModal(): void {
    if (this.finalizingSession()) return;
    this.finalizeSessionDialog?.nativeElement.close();
  }

  onFinalizeSessionCancel(event: Event): void {
    event.preventDefault();
    this.closeFinalizeSessionModal();
  }

  confirmSessionFinalization(): void {
    const info = this.session();

    if (!info?.isCreator || info.closed || this.finalizingSession()) {
      return;
    }

    this.finalizingSession.set(true);
    this.sessionFinalizationError.set('');

    this.api.finalizeSession(info.sessionId, true).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => this.finishSessionFinalization(),
      error: (error: HttpErrorResponse) => {
        // The response may have been lost after successful closure.
        // Read backend state before allowing another attempt.
        this.api.get(info.sessionId).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: current => {
            this.session.set(current);

            if (current.closed) {
              this.finishSessionFinalization();
              return;
            }

            this.finalizingSession.set(false);
            this.sessionFinalizationError.set(
              error.error?.message ||
              'Session finalization failed. The session remains open.'
            );
          },
          error: () => {
            this.finalizingSession.set(false);
            this.sessionFinalizationError.set(
              'Could not confirm the session status. Refresh the page before trying again.'
            );
          }
        });
      }
    });
  }

  private finishSessionFinalization(): void {
    this.finalizingSession.set(false);
    this.finalizeSessionDialog?.nativeElement.close();
    this.sessionFinalizationSuccess.set(
      'Session closed successfully. Refreshing session details…'
    );
    this.refreshEvaluators();
  }
}
