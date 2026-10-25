import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';

export interface CoffeeSampleDraft {
  sampleName: string;
  process: string;
  harvestYear: number | null;
  growingLocation: string;
  ownerProducer: string;
}

export interface InventorySample {
  sampleId: number;
  sampleName: string;
  process: string | null;
  harvestYear: number | null;
  growingLocation: string | null;
  ownerProducer: string | null;
  createdAt: string | null;
  sessionCount: number;
}

interface CsrfResponse { headerName: string; token: string; }

export function emptyCoffeeSample(): CoffeeSampleDraft {
  return { sampleName: '', process: '', harvestYear: null, growingLocation: '', ownerProducer: '' };
}

export function coffeeSampleError(sample: CoffeeSampleDraft): string {
  if (!sample.sampleName.trim()) return 'Enter a sample name.';
  if (sample.sampleName.trim().length > 255) return 'Sample name must be 255 characters or fewer.';
  if (sample.process.trim().length > 100) return 'Process must be 100 characters or fewer.';
  if (sample.growingLocation.trim().length > 255) return 'Location must be 255 characters or fewer.';
  if (sample.ownerProducer.trim().length > 255) return 'Producer must be 255 characters or fewer.';
  if (sample.harvestYear !== null &&
      (!Number.isInteger(sample.harvestYear) || sample.harvestYear < 1900 || sample.harvestYear > 2100)) {
    return 'Harvest year must be a whole number between 1900 and 2100.';
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class CoffeeInventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  mine() {
    return this.http.get<InventorySample[]>(`${this.baseUrl}/samples/mine`, { withCredentials: true });
  }

  create(sample: CoffeeSampleDraft) {
    return this.mutate<CoffeeSampleDraft & { sampleId: number }>('POST', '/samples', sample);
  }

  update(id: number, sample: CoffeeSampleDraft) {
    return this.mutate<CoffeeSampleDraft & { sampleId: number }>('PUT', `/samples/${id}`, sample);
  }

  delete(id: number) {
    return this.mutate<void>('DELETE', `/samples/${id}`);
  }

  private mutate<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: CoffeeSampleDraft) {
    return this.http.get<CsrfResponse>(`${this.baseUrl}/csrf`, { withCredentials: true }).pipe(
      switchMap(csrf => this.http.request<T>(method, `${this.baseUrl}${path}`, {
        body,
        withCredentials: true,
        headers: { [csrf.headerName]: csrf.token }
      }))
    );
  }
}
