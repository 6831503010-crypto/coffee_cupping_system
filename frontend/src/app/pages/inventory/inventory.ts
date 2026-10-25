import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit,Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CoffeeInventoryService, InventorySample } from '../../services/coffee-inventory.service';
import { CoffeeSampleFields } from '../../shared/coffee-sample-fields/coffee-sample-fields';

import {
  SampleFormModal,
  SampleFormSubmission
} from '../../shared/sample-form-modal/sample-form-modal';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, RouterLink ,SampleFormModal],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class Inventory implements AfterViewInit {
  private readonly inventory = inject(CoffeeInventoryService);
  private readonly route = inject(ActivatedRoute);

  readonly samples = signal<InventorySample[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly editingId = signal<number | null>(null);

  readonly search = signal('');
  readonly deleteTarget = signal<InventorySample | null>(null);
  readonly inSessions = computed(() => this.samples().filter(s => s.sessionCount > 0).length);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.samples().filter(s => !q ||
      [s.sampleName, s.process, s.growingLocation, s.ownerProducer, s.harvestYear?.toString()]
        .some(value => (value ?? '').toLowerCase().includes(q)));
  });


  @ViewChild('deleteDialog') private deleteDialog?: ElementRef<HTMLDialogElement>;

  @ViewChild(SampleFormModal)
  private sampleFormModal?: SampleFormModal;

  constructor() {
    this.load();
  }

  ngAfterViewInit(): void {
    if (this.route.snapshot.queryParamMap.get('new') === '1') {
      this.openNew();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.inventory.mine().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: data => this.samples.set(data),
      error: () => this.error.set('Could not load your coffee inventory. Please try again.')
    });
  }

  openNew(): void {
    if (this.busy()) return;

    this.editingId.set(null);
    this.message.set('');
    this.sampleFormModal?.open();
  }

  openEdit(sample: InventorySample): void {
    if (this.busy() || sample.sessionCount > 0) return;

    this.editingId.set(sample.sampleId);
    this.message.set('');

    this.sampleFormModal?.open({
      sampleName: sample.sampleName,
      process: sample.process ?? '',
      harvestYear: sample.harvestYear,
      growingLocation: sample.growingLocation ?? '',
      ownerProducer: sample.ownerProducer ?? ''
    });
  }

  askDelete(sample: InventorySample): void {
    if (this.busy() || sample.sessionCount > 0) return;
    this.deleteTarget.set(sample);
    this.deleteDialog?.nativeElement.showModal();
  }

  cancelDelete(): void {
    if (this.busy()) return;
    this.deleteDialog?.nativeElement.close();
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const sample = this.deleteTarget();
    if (!sample || this.busy()) return;
    this.busy.set(true);
    this.inventory.delete(sample.sampleId).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.deleteDialog?.nativeElement.close();
        this.deleteTarget.set(null);
        this.message.set('Coffee sample deleted.');
        this.load();
      },
      error: (response: HttpErrorResponse) => {
        this.deleteDialog?.nativeElement.close();
        this.deleteTarget.set(null);
        this.load();
        this.error.set(response.status === 409
          ? 'This sample is used in a cupping session and cannot be deleted.'
          : 'Could not delete the sample. Please try again.');
      }
    });
  }

  saveSample(submission: SampleFormSubmission): void {
    const modal = this.sampleFormModal;
    if (!modal) return;

    if (this.busy()) {
      modal.fail('Please wait until the current operation finishes.');
      return;
    }

    const id = this.editingId();

    const request = id === null
      ? this.inventory.create(submission.sample)
      : this.inventory.update(id, submission.sample);

    this.busy.set(true);
    this.message.set('');

    request.pipe(
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: () => {
        modal.complete();
        this.editingId.set(null);
        this.search.set('');

        this.message.set(
          id === null
            ? 'Coffee sample saved to your inventory.'
            : 'Coffee sample updated.'
        );

        this.load();
      },
      error: (response: HttpErrorResponse) => {
        modal.fail(
          response.status === 409
            ? 'The operation conflicts with the current sample state. Samples used in sessions cannot be edited.'
            : response.status === 400
              ? 'Check the entered sample details.'
              : response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : response.status === 403
                  ? 'You do not have permission to save this sample.'
                  : 'Could not save your sample. Your entered details are still here.'
        );
      }
    });
  }
}
