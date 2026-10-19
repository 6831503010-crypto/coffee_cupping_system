
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
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
  SessionView
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
    if (this.sessionIdParam !== null) {
      const id = Number(this.sessionIdParam);

      if (!Number.isSafeInteger(id) || id < 1) {
        this.error.set('Invalid session ID');
        return;
      }

      this.api.get(id).subscribe({
        next: data => this.session.set(data),
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
}
