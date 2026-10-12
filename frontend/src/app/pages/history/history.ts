import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AromaEvaluation {
  qualityScore?: string | number;
  qualities?: string[];
}

interface FlavorEvaluation {
  flavor?: string | number;
  aftertaste?: string | number;
  acidity?: string | number;
  body?: string | number;
  balance?: string | number;
  overall?: string | number;

  uniformity?: boolean[];

  defectType?: string;
  flavorQualities?: string[];
  mainTastes?: string[];
}

interface HistorySample {
  id: number;
  aroma?: AromaEvaluation;
  flavor?: FlavorEvaluation;
  finalScore?: number;
}

interface HistoryRecord {
  id: string;
  completedAt: string;
  samples?: HistorySample[];
}

@Component({
  selector: 'app-history',
  imports: [RouterLink],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {

  private readonly HISTORY_KEY =
    'aromaArtisans.cuppingHistory.v1';

  records = signal<HistoryRecord[]>(this.readHistory());

  openDetails = signal<Set<string>>(new Set());

  sessionCount = computed(() =>
    this.records().length
  );

  sampleCount = computed(() =>
    this.records().reduce(
      (total, record) =>
        total + (record.samples?.length || 0),
      0
    )
  );

  latestDate = computed(() => {
    const records = this.records();

    return records.length
      ? this.formatDate(records[0].completedAt)
      : '—';
  });


  private readHistory(): HistoryRecord[] {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(this.HISTORY_KEY) || '[]'
      );

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }


  private writeHistory(records: HistoryRecord[]) {
    localStorage.setItem(
      this.HISTORY_KEY,
      JSON.stringify(records)
    );

    this.records.set(records);
  }


  formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  formatScore(value: unknown): string {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    return Number.isInteger(number)
      ? String(number)
      : number.toFixed(2);
  }


  text(value: string[] | undefined): string {
    if (!Array.isArray(value) || value.length === 0) {
      return '—';
    }

    return value.join(', ');
  }


  getDefectiveCupCount(
    flavor: FlavorEvaluation
  ): number {

    if (!Array.isArray(flavor.uniformity)) {
      return 0;
    }

    return flavor.uniformity.filter(
      value => !value
    ).length;
  }


  getDefectPoints(
    defectType: string | undefined
  ): number {

    if (defectType === 'taint') {
      return 2;
    }

    if (defectType === 'fault') {
      return 4;
    }

    return 0;
  }


  getDefectLabel(
    defectType: string | undefined
  ): string {

    if (defectType === 'taint') {
      return 'Taint';
    }

    if (defectType === 'fault') {
      return 'Fault';
    }

    return 'None';
  }


  getDefectDeduction(
    flavor: FlavorEvaluation
  ): number {

    return (
      this.getDefectiveCupCount(flavor) *
      this.getDefectPoints(flavor.defectType)
    );
  }


  toggleDetails(
    sessionId: string,
    sampleId: number
  ) {

    const key =
      `${sessionId}-${sampleId}`;

    const updated =
      new Set(this.openDetails());

    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }

    this.openDetails.set(updated);
  }


  isDetailsOpen(
    sessionId: string,
    sampleId: number
  ): boolean {

    return this.openDetails().has(
      `${sessionId}-${sampleId}`
    );
  }


  deleteSession(id: string) {

    const confirmed = window.confirm(
      'Are you sure you want to delete this cupping session? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    const updated =
      this.records().filter(
        record => record.id !== id
      );

    this.writeHistory(updated);
  }


  clearHistory() {

    if (!this.records().length) {
      return;
    }

    const confirmed = window.confirm(
      'Clear all saved cupping history from this browser?'
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      this.HISTORY_KEY
    );

    this.records.set([]);
    this.openDetails.set(new Set());
  }
}
