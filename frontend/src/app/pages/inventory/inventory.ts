import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/toast-notification/toast.service';
import { CoffeeInventoryService, InventorySample } from '../../services/coffee-inventory.service';

import {
  SampleFormModal,
  SampleFormSubmission
} from '../../shared/sample-form-modal/sample-form-modal';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, RouterLink, SampleFormModal],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class Inventory implements AfterViewInit {
  private readonly inventory = inject(CoffeeInventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly samples = signal<InventorySample[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly editingId = signal<number | null>(null);

  readonly search = signal('');
  readonly usageFilter = signal<'all' | 'used' | 'unused'>('all');
  readonly sortOrder = signal<'newest' | 'name' | 'harvest'>('newest');
  readonly selectedSampleId = signal<number | null>(null);
  readonly pageSize = 10;
  readonly page = signal(1);
  readonly deleteTarget = signal<InventorySample | null>(null);

  readonly inSessions = computed(() => this.samples().filter(sample => sample.sessionCount > 0).length);
  readonly unusedCount = computed(() => this.samples().length - this.inSessions());
  readonly selectedSample = computed(() =>
    this.samples().find(sample => sample.sampleId === this.selectedSampleId()) ?? null
  );

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const usage = this.usageFilter();
    const sort = this.sortOrder();

    const matching = this.samples().filter(sample => {
      if (usage === 'used' && sample.sessionCount === 0) return false;
      if (usage === 'unused' && sample.sessionCount > 0) return false;
      return !query || [
        sample.sampleName,
        sample.process,
        sample.growingLocation,
        sample.ownerProducer,
        sample.harvestYear?.toString()
      ].some(value => (value ?? '').toLowerCase().includes(query));
    });

    if (sort === 'name') {
      return matching.sort((a, b) => a.sampleName.localeCompare(b.sampleName));
    }
    if (sort === 'harvest') {
      return matching.sort((a, b) => (b.harvestYear ?? 0) - (a.harvestYear ?? 0));
    }
    // The inventory API already returns newest samples first. Preserve that ordering.
    return matching;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  // Clamp the active page if a sample is removed or the result set gets smaller.
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly paginatedSamples = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const start = Math.max(1, Math.min(this.currentPage() - 2, total - 4));
    return Array.from({ length: Math.min(total, 5) }, (_, index) => start + index);
  });

  setPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages() || nextPage === this.currentPage()) return;
    this.page.set(nextPage);
    this.closeDetails();
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.closeDetails();
  }

  setSortOrder(order: 'newest' | 'name' | 'harvest'): void {
    this.sortOrder.set(order);
    this.page.set(1);
    this.closeDetails();
  }

  selectSample(sample: InventorySample): void {
    this.selectedSampleId.set(sample.sampleId);
  }

  closeDetails(): void {
    this.selectedSampleId.set(null);
  }

  setUsageFilter(filter: 'all' | 'used' | 'unused'): void {
    this.usageFilter.set(filter);
    this.page.set(1);
    this.closeDetails();
  }

  clearFilters(): void {
    this.search.set('');
    this.usageFilter.set('all');
    this.sortOrder.set('newest');
    this.page.set(1);
    this.closeDetails();
  }


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
      next: data => {
        this.samples.set(data);
        if (this.selectedSampleId() !== null && !data.some(sample => sample.sampleId === this.selectedSampleId())) {
          this.closeDetails();
        }
      },
      error: () => this.error.set('Could not load your coffee inventory. Please try again.')
    });
  }

  openNew(): void {
    if (this.busy()) return;

    this.editingId.set(null);
    this.sampleFormModal?.open();
  }

  openEdit(sample: InventorySample): void {
    if (this.busy() || sample.sessionCount > 0) return;

    this.editingId.set(sample.sampleId);

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
        this.toast.success('Coffee sample deleted.');
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

    request.pipe(
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: () => {
        modal.complete();
        this.editingId.set(null);
        this.search.set('');
        this.page.set(1);

        this.toast.success(
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
