import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CoffeeInventoryService, CoffeeSampleDraft, InventorySample,
  coffeeSampleError, emptyCoffeeSample } from '../../services/coffee-inventory.service';
import { CoffeeSampleFields } from '../../shared/coffee-sample-fields/coffee-sample-fields';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, RouterLink, CoffeeSampleFields],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class Inventory {
  private readonly inventory = inject(CoffeeInventoryService);
  private readonly route = inject(ActivatedRoute);

  readonly samples = signal<InventorySample[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly formError = signal('');
  readonly editingId = signal<number | null>(null);
  readonly formOpen = signal(false);
  readonly search = signal('');
  readonly deleteTarget = signal<InventorySample | null>(null);
  readonly inSessions = computed(() => this.samples().filter(s => s.sessionCount > 0).length);
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.samples().filter(s => !q ||
      [s.sampleName, s.process, s.growingLocation, s.ownerProducer, s.harvestYear?.toString()]
        .some(value => (value ?? '').toLowerCase().includes(q)));
  });

  draft: CoffeeSampleDraft = emptyCoffeeSample();
  @ViewChild('deleteDialog') private deleteDialog?: ElementRef<HTMLDialogElement>;

  constructor() {
    this.load();
    if (this.route.snapshot.queryParamMap.get('new') === '1') this.openNew();
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
    this.draft = emptyCoffeeSample();
    this.editingId.set(null);
    this.formError.set('');
    this.message.set('');
    this.formOpen.set(true);
  }

  openEdit(sample: InventorySample): void {
    if (sample.sessionCount > 0) return;
    this.draft = {
      sampleName: sample.sampleName, process: sample.process ?? '',
      harvestYear: sample.harvestYear, growingLocation: sample.growingLocation ?? '',
      ownerProducer: sample.ownerProducer ?? ''
    };
    this.editingId.set(sample.sampleId);
    this.formError.set('');
    this.message.set('');
    this.formOpen.set(true);
  }

  cancel(): void {
    if (this.busy()) return;
    this.formOpen.set(false);
    this.formError.set('');
  }

  save(): void {
    if (this.busy()) return;
    const err = coffeeSampleError(this.draft);
    if (err) { this.formError.set(err); return; }
    const payload: CoffeeSampleDraft = {
      sampleName: this.draft.sampleName.trim(),
      process: this.draft.process.trim(),
      harvestYear: this.draft.harvestYear,
      growingLocation: this.draft.growingLocation.trim(),
      ownerProducer: this.draft.ownerProducer.trim()
    };
    this.busy.set(true);
    this.formError.set('');
    const id = this.editingId();
    const request = id === null ? this.inventory.create(payload) : this.inventory.update(id, payload);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.message.set(id === null ? 'Coffee sample saved to your inventory.' : 'Coffee sample updated.');
        this.load();
      },
      error: (response: HttpErrorResponse) => {
        this.formError.set(response.status === 409
          ? 'This coffee is already used in a session and cannot be edited.'
          : response.status === 400 ? 'Check the entered sample details.'
          : 'Could not save your sample. Your changes are still here.');
      }
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
}
