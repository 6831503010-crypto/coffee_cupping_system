
import { HttpErrorResponse } from '@angular/common/http';
import {
    EMPTY,
    Subject,
    catchError,
    finalize,
    forkJoin,
    switchMap,
    timer
  } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component,DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  IndividualSessionService,
  LibrarySample,
  NewCoffeeSample,
  SampleChoice,
  SessionView,
  EvaluatorView,
  EvaluatorCandidate
} from '../../services/individual-session.service';

@Component({
  selector: 'app-individual-session',
  imports: [FormsModule, RouterLink],
  templateUrl: './individual-session.html',
  styleUrl: './individual-session.css'
})
export class IndividualSession {

  private readonly api = inject(IndividualSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly savedSamples = signal<LibrarySample[]>([]);
  readonly chosen = signal<SampleChoice[]>([]);
  readonly session = signal<SessionView | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly existingSampleError = signal('');
  readonly existingCodeError = signal('');

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

  evaluatorEmail = '';

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

  @ViewChild('newSampleDialog')
  private newSampleDialog?: ElementRef<HTMLDialogElement>;

  readonly newSampleError = signal('');
  readonly newSampleSuccess = signal('');

  openNewSampleModal(): void {
    if (!this.canAddSample()) return;
    this.newSampleError.set('');
    this.newSampleSuccess.set('');
    this.newSampleDialog?.nativeElement.showModal();
  }

  closeNewSampleModal(): void {
    this.newSampleDialog?.nativeElement.close();
  }

  onNewSampleCancel(event: Event): void {
    event.preventDefault();
    this.closeNewSampleModal();
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

  selectedExistingId: number | null = null;
  existingCode = '';
  newCode = '';

  draft: NewCoffeeSample = this.emptyDraft();

  private emptyDraft(): NewCoffeeSample {
    return {
      sampleName: '',
      process: '',
      harvestYear: null,
      growingLocation: '',
      ownerProducer: ''
    };
  }

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
          }
        },
        error: () => this.error.set(
          'Could not load this session.'
        )
      });
    } else {
      this.api.library().subscribe({
        next: data => this.savedSamples.set(data),
        error: () => this.error.set(
          'Could not load saved coffee samples.'
        )
      });
    }
  }

  addExisting() {
  this.existingSampleError.set('');
  this.existingCodeError.set('');
  this.error.set('');

  if (!this.checkSampleSlot()) return;

  const id = this.selectedExistingId;
  const code = this.existingCode.trim();

  if (id === null) {
    this.existingSampleError.set('Select a coffee sample.');
  } else if (!this.savedSamples().some(s => s.sampleId === id)) {
    this.existingSampleError.set('Select a valid saved sample.');
  } else if (this.chosen().some(s => s.sampleId === id)) {
    this.existingSampleError.set('This sample is already selected.');
  }

  if (!code) {
    this.existingCodeError.set('Enter a sample code.');
  } else if (code.length > 100) {
    this.existingCodeError.set('Sample code must be 100 characters or fewer.');
  } else if (this.chosen().some(
    sample => sample.sampleCode.trim().toLowerCase() === code.toLowerCase()
  )) {
    this.existingCodeError.set(
      'This sample code is already selected. Use a unique code.'
    );
  }

  if (
    id === null ||
    this.existingSampleError() ||
    this.existingCodeError()
  ) {
    return;
  }

  this.chosen.update(items => [
    ...items,
    { sampleId: id, sampleCode: code }
  ]);

  this.selectedExistingId = null;
  this.existingCode = '';
}

  addNew() {
    this.newSampleError.set('');
    this.newSampleSuccess.set('');

    if (!this.canAddSample()) {
      this.newSampleError.set(this.sampleCountMessage());
      return;
    }

    const code = this.newCode.trim();
    const name = this.draft.sampleName.trim();

    if (!code || !name) {
      this.newSampleError.set('Enter a sample code and sample name.');
      return;
    }

    if (code.length > 100 || name.length > 255) {
      this.newSampleError.set('Sample code or name is too long.');
      return;
    }

    if (this.chosen().some(
      sample => sample.sampleCode.trim().toLowerCase() === code.toLowerCase()
    )) {
      this.newSampleError.set('This sample code is already selected. Use a unique code.');
      return;
    }

    if (this.draft.harvestYear !== null && !Number.isInteger(this.draft.harvestYear)) {
      this.newSampleError.set('Enter a whole number for the harvest year.');
      return;
    }

    this.chosen.update(items => [
      ...items,
      {
        sampleCode: code,
        newSample: { ...this.draft, sampleName: name }
      }
    ]);

    this.newCode = '';
    this.draft = this.emptyDraft();
    this.closeNewSampleModal();
  }

  removeSample(index: number) {
    if (this.saving()) return;
    this.chosen.update(items =>
      items.filter((_, i) => i !== index)
    );
  }

  displayName(choice: SampleChoice): string {
    if (choice.newSample) {
      return choice.newSample.sampleName;
    }

    return this.savedSamples().find(
      s => s.sampleId === choice.sampleId
    )?.sampleName ?? 'Unknown sample';
  }

  createSession() {
    if (this.saving()) return;

    const name = this.sessionName.trim();

    if (!name ||
        !Number.isInteger(this.evaluatorLimit) ||
        this.evaluatorLimit < 1 ||
        this.evaluatorLimit > 10) {
      this.error.set(
        'Enter a session name and 1–10 evaluators.'
      );
      return;
    }

    if (!this.hasExactSampleCount()) {
      this.error.set(this.sampleCountMessage());
      return;
    }

    const codes = this.chosen().map(
      s => s.sampleCode.trim().toLowerCase()
    );

    if (new Set(codes).size !== codes.length) {
      this.error.set('Sample codes must be unique.');
      return;
    }

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
            'Removal is unavailable because the evaluator has saved evaluations or the session is closed.'
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
}
