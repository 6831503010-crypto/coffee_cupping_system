import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SampleDraft {
  sampleName: string;
  process: string;
  harvestYear: number | null;
  growingLocation: string;
  ownerProducer: string;
}

export interface SampleFormSubmission {
  sampleCode: string;
  sample: SampleDraft;
}

type Field =
  | 'sampleCode'
  | 'sampleName'
  | 'process'
  | 'harvestYear'
  | 'growingLocation'
  | 'ownerProducer';

@Component({
  selector: 'app-sample-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sample-form-modal.html',
  styleUrl: './sample-form-modal.css'
})
export class SampleFormModal {
  @Input() showSampleCode = false;
  @Input() submitLabel = 'Create sample';
  @Input() description = 'Enter the coffee sample details.';
  @Input() contextMessage = '';
  @Input() submitDisabled = false;
  @Input() title = 'Create a new sample';

  @Output() sampleSubmitted =
    new EventEmitter<SampleFormSubmission>();

  @ViewChild('dialog')
  private dialog?: ElementRef<HTMLDialogElement>;

  readonly pending = signal(false);
  readonly error = signal('');
  readonly fieldErrors =
    signal<Partial<Record<Field, string>>>({});

  readonly textFields = [
    {
      key: 'sampleName',
      label: 'Sample Name *',
      required: true
    },
    {
      key: 'growingLocation',
      label: 'Growing Location',
      required: false
    },
    {
      key: 'ownerProducer',
      label: 'Owner / Producer',
      required: false
    }
  ] as const;

  sampleCode = '';
  draft: SampleDraft = this.emptyDraft();

  get harvestYears(): number[] {
    const year = new Date().getFullYear();
    const years = [year, year - 1, year - 2];

    if (
      this.originalHarvestYear !== null &&
      !years.includes(this.originalHarvestYear)
    ) {
      years.push(this.originalHarvestYear);
    }

    return years.sort((a, b) => b - a);
  }

  private emptyDraft(): SampleDraft {
    return {
      sampleName: '',
      process: '',
      harvestYear: null,
      growingLocation: '',
      ownerProducer: ''
    };
  }

  open(initialSample?: SampleDraft): void {
    const dialog = this.dialog?.nativeElement;
    if (!dialog || dialog.open || this.pending()) return;

    // Copy values so typing does not change the inventory card.
    this.draft = initialSample
      ? { ...initialSample }
      : this.emptyDraft();

    this.sampleCode = '';
    this.originalProcess = initialSample?.process ?? '';
    this.originalHarvestYear = initialSample?.harvestYear ?? null;

    this.error.set('');
    this.fieldErrors.set({});

    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input')?.focus();
  }

  close(): void {
    if (this.pending()) return;
    this.dialog?.nativeElement.close();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  toggleYear(year: number): void {
    this.draft.harvestYear =
      this.draft.harvestYear === year ? null : year;

    this.clearFieldError('harvestYear');
  }

  clearFieldError(field: Field): void {
    this.fieldErrors.update(errors => ({
      ...errors,
      [field]: undefined
    }));
  }

  // Parent calls this after accepting or saving the sample.
  complete(): void {
    this.pending.set(false);
    this.dialog?.nativeElement.close();
    this.sampleCode = '';
    this.draft = this.emptyDraft();
    this.error.set('');
    this.fieldErrors.set({});
    this.originalProcess = '';
    this.originalHarvestYear = null;
  }

  // Parent calls this when accepting or saving fails.
  fail(message: string, field?: Field): void {
    this.pending.set(false);

    if (field) {
      this.fieldErrors.update(errors => ({
        ...errors,
        [field]: message
      }));
      this.focusFirstError();
    } else {
      this.error.set(message);
    }
  }

  private focusFirstError(): void {
  // Wait for Angular to display errors and re-enable the fields.
    setTimeout(() => {
      const dialog = this.dialog?.nativeElement;
      if (!dialog?.open) return;

      // DOM order ensures we select the first invalid field on screen.
      const target = dialog.querySelector<HTMLElement>(
        'input[aria-invalid="true"], ' +
        'select[aria-invalid="true"], ' +
        '.year-options[aria-invalid="true"]'
      );

      if (!target) return;

      target.focus({ preventScroll: true });

      const field = target.closest<HTMLElement>('.field') ?? target;

      field.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });
    }, 0);
  }

  submit(): void {
    if (this.pending() || this.submitDisabled) return;

    this.error.set('');

    const sampleCode = this.sampleCode.trim();
    const sample: SampleDraft = {
      sampleName: this.draft.sampleName.trim(),
      process: this.draft.process,
      harvestYear: this.draft.harvestYear,
      growingLocation: this.draft.growingLocation.trim(),
      ownerProducer: this.draft.ownerProducer.trim()
    };

    const errors: Partial<Record<Field, string>> = {};

    if (this.showSampleCode) {
      if (!sampleCode) {
        errors.sampleCode = 'Enter a sample code.';
      } else if (sampleCode.length > 100) {
        errors.sampleCode = 'Use 100 characters or fewer.';
      }
    }

    if (!sample.sampleName) {
      errors.sampleName = 'Enter a sample name.';
    }

    for (const field of this.textFields) {
      if (sample[field.key].length > 255) {
        errors[field.key] = 'Use 255 characters or fewer.';
      }
    }

    if (
      sample.process &&
      !this.processOptions.includes(sample.process)
    ) {
      errors.process = 'Select a valid process.';
    }

    if (
      sample.harvestYear !== null &&
      !this.harvestYears.includes(sample.harvestYear)
    ) {
      errors.harvestYear = 'Select one of the available years.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length) {
      this.focusFirstError();
      return;
    }

    this.pending.set(true);
    this.sampleSubmitted.emit({
      sampleCode: this.showSampleCode ? sampleCode : '',
      sample
    });
  }

  private originalProcess = '';
  private originalHarvestYear: number | null = null;

  get processOptions(): string[] {
    const options = ['NATURAL', 'WASHED', 'HONEY'];

    if (
      this.originalProcess &&
      !options.includes(this.originalProcess)
    ) {
      options.push(this.originalProcess);
    }

    return options;
  }
}
