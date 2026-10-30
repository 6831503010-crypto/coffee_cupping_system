import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { EvaluationSubmissionService, EvaluationHistoryGroup } from '../../services/evaluation-submission.service';
import { RouterLink } from '@angular/router';
import { CuppingModeModal } from '../../shared/cupping-mode-modal/cupping-mode-modal';
import { IndividualSessionService } from '../../services/individual-session.service';

interface AromaEvaluation {
  qualityScore?: string | number;
  qualities?: string[];
  otherTastingNotes?: string;
}

interface FlavorEvaluation {
  flavor?: string | number;
  aftertaste?: string | number;
  acidity?: string | number;
  body?: string | number;
  balance?: string | number;
  overall?: string | number;

  uniformity?: boolean[];
  cleanCup?: boolean[];
  sweetness?: boolean[];

  defectType?: string;
  flavorQualities?: string[];
  otherTastingNotes?: string;
}

interface HistorySample {
  id: number;
  aroma?: AromaEvaluation;
  flavor?: FlavorEvaluation;
  finalScore?: number | null;
}

interface HistoryRecord {
  id: number;
  sessionName?: string;
  completedAt: string;
  samples?: HistorySample[];
  sessionClosed?: boolean;
  completionOutcome?: EvaluationHistoryGroup['completionOutcome'];
  sessionTimer?: EvaluationHistoryGroup['sessionTimer'];
  evaluatorTimer?: EvaluationHistoryGroup['evaluatorTimer'];
  creatorOnly?: boolean;
}

@Component({
  selector: 'app-history',
  imports: [RouterLink, CuppingModeModal],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History implements OnInit {
  private readonly submissions = inject(EvaluationSubmissionService);
  private readonly sessions = inject(IndividualSessionService);
  private readonly loadingEvaluatorCounts = new Set<number>();
  readonly evaluatorCounts = signal<Record<number, { joined: number; capacity: number }>>({});

  constructor() {
    // Load only the selected session. The existing session endpoint provides
    // joined evaluator count and capacity; historical results are unchanged.
    effect(() => {
      const record = this.activeRecord();
      if (record) {
        this.loadEvaluatorCount(record.id);
      }
    });
  }

  private loadEvaluatorCount(sessionId: number): void {
    if (!Number.isInteger(sessionId) || this.loadingEvaluatorCounts.has(sessionId) ||
        this.evaluatorCounts()[sessionId]) return;

    this.loadingEvaluatorCounts.add(sessionId);
    this.sessions.get(sessionId).subscribe({
      next: session => {
        this.evaluatorCounts.update(current => ({
          ...current,
          [sessionId]: { joined: session.joinedEvaluators, capacity: session.evaluatorLimit }
        }));
        this.loadingEvaluatorCounts.delete(sessionId);
      },
      error: () => this.loadingEvaluatorCounts.delete(sessionId)
    });
  }

  evaluatorCountLabel(record: HistoryRecord): string {
    const count = this.evaluatorCounts()[record.id];
    return count ? `${count.joined} / ${count.capacity}` : '—';
  }

  historyLoadError = signal('');

  ngOnInit(): void {
    this.submissions.history().subscribe({
      next: groups => {
        this.records.set(groups.map(group => this.mapSavedHistory(group)));
        this.historyLoadError.set('');
      },
      error: () => this.historyLoadError.set('Could not load session history. Please refresh and try again.')
    });
  }

  private mapSavedHistory(group: EvaluationHistoryGroup): HistoryRecord {
    return {
      id: group.sessionId,
      sessionName: group.sessionName,
      completedAt: group.completedAt,
      sessionClosed: group.sessionClosed,
      completionOutcome: group.completionOutcome,
      sessionTimer: group.sessionTimer,
      evaluatorTimer: group.evaluatorTimer,
      creatorOnly: group.creatorOnly,
      samples: group.samples.map((item, index) => ({
        id: index + 1, finalScore: item.totalScore,
        aroma: {
          qualityScore: item.data.aromaQualityScore ?? undefined,
          qualities: item.data.aromaQualities,
          otherTastingNotes: item.data.aromaNotes
        },
        flavor: {
          flavor: item.data.flavorScore ?? undefined,
          aftertaste: item.data.aftertasteScore ?? undefined,
          acidity: item.data.acidityScore ?? undefined,
          body: item.data.bodyScore ?? undefined,
          balance: item.data.balanceScore ?? undefined,
          overall: item.data.overallScore ?? undefined,
          uniformity: item.data.cups.map(c => c.uniformity),
          cleanCup: item.data.cups.map(c => c.cleanCup),
          sweetness: item.data.cups.map(c => c.sweetness),
          defectType: item.data.defectType ?? undefined,
          flavorQualities: item.data.flavorQualities,
          otherTastingNotes: item.data.flavorNotes
        }
      }))
    };
  }


  // Session history comes exclusively from the existing backend endpoint.
  records = signal<HistoryRecord[]>([]);

  // Client-side history view state. The backend/API data remains unchanged.
  readonly pageSize = 5;
  readonly currentPage = signal(1);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | 'finalized' | 'closed'>('all');
  readonly selectedSessionId = signal<number | null>(null);
  readonly selectedSampleIndex = signal(0);

  readonly sortedRecords = computed(() =>
    [...this.records()].sort((a, b) => {
      const aTime = Date.parse(a.completedAt);
      const bTime = Date.parse(b.completedAt);
      return (Number.isNaN(bTime) ? 0 : bTime)
        - (Number.isNaN(aTime) ? 0 : aTime);
    })
  );

  readonly filteredRecords = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const status = this.statusFilter();

    return this.sortedRecords().filter(record => {
      const matchesSearch = !query ||
        (record.sessionName || '').toLocaleLowerCase().includes(query);
      const matchesStatus = status === 'all' ||
        (status === 'closed' ? this.isIncomplete(record) :
          !this.isIncomplete(record) && record.completionOutcome !== 'IN_PROGRESS');
      return matchesSearch && matchesStatus;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize))
  );
  readonly pageStartIndex = computed(() =>
    (this.currentPage() - 1) * this.pageSize
  );
  readonly paginatedRecords = computed(() =>
    this.filteredRecords().slice(
      this.pageStartIndex(), this.pageStartIndex() + this.pageSize
    )
  );
  readonly showingFrom = computed(() =>
    this.filteredRecords().length === 0 ? 0 : this.pageStartIndex() + 1
  );
  readonly showingTo = computed(() =>
    Math.min(this.pageStartIndex() + this.pageSize, this.filteredRecords().length)
  );
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const start = Math.max(1, Math.min(this.currentPage() - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
  });
  readonly finalizedCount = computed(() => this.records().filter(record =>
    !this.isIncomplete(record) && record.completionOutcome !== 'IN_PROGRESS'
  ).length);
  readonly closedCount = computed(() => this.records().filter(record =>
    this.isIncomplete(record)
  ).length);

  // The first item on a history page is shown until a user chooses another.
  readonly activeRecord = computed(() => {
    const pageRecords = this.paginatedRecords();
    return pageRecords.find(record => record.id === this.selectedSessionId())
      ?? pageRecords[0] ?? null;
  });
  readonly activeSample = computed(() => {
    const samples = this.activeRecord()?.samples ?? [];
    return samples[Math.min(this.selectedSampleIndex(), samples.length - 1)] ?? null;
  });
  readonly activeSamplePage = computed(() => {
    const count = this.activeRecord()?.samples?.length ?? 0;
    return count === 0 ? 0 : Math.min(this.selectedSampleIndex(), count - 1) + 1;
  });
  readonly activeSessionNumber = computed(() => {
    const active = this.activeRecord();
    if (!active) return 0;
    return this.sortedRecords().findIndex(record => record.id === active.id) + 1;
  });

  setSearch(query: string): void {
    this.searchQuery.set(query);
    this.resetViewSelection();
  }

  setStatusFilter(filter: 'all' | 'finalized' | 'closed'): void {
    this.statusFilter.set(filter);
    this.resetViewSelection();
  }

  private resetViewSelection(): void {
    this.currentPage.set(1);
    this.selectedSessionId.set(null);
    this.selectedSampleIndex.set(0);
    this.closeSampleDetails();
  }

  selectSession(id: number): void {
    this.selectedSessionId.set(id);
    this.selectedSampleIndex.set(0);
    this.closeSampleDetails();
  }

  selectSample(index: number): void {
    const length = this.activeRecord()?.samples?.length ?? 0;
    if (Number.isInteger(index) && index >= 0 && index < length) {
      this.selectedSampleIndex.set(index);
      this.closeSampleDetails();
    }
  }

  readonly samplePageNumbers = computed(() => {
    const count = this.activeRecord()?.samples?.length ?? 0;
    const selected = this.activeSamplePage();
    const start = Math.max(1, Math.min(selected - 2, count - 4));
    return Array.from({ length: Math.min(5, count) }, (_, index) => start + index);
  });

  goToPage(page: number): void {
    if (!Number.isInteger(page) || page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.selectedSessionId.set(null);
    this.selectedSampleIndex.set(0);
    this.closeSampleDetails();
  }

  sessionNumber(indexOnPage: number): number {
    return this.sortedRecords().length - this.pageStartIndex() - indexOnPage;
  }

  statusLabel(record: HistoryRecord): string {
    if (this.isIncomplete(record)) return 'Closed';
    if (record.completionOutcome === 'IN_PROGRESS') return 'In progress';
    return 'Finalized';
  }

  // openDetails = signal<Set<string>>(new Set());
  private readonly historyQualityGroups = [
    { parent: 'Floral', children: [] },
    { parent: 'Fruity', children: ['Berry', 'Dried Fruit', 'Citrus Fruit'] },
    { parent: 'Roasted', children: ['Cereal', 'Burnt', 'Tobacco'] },
    { parent: 'Sour/Fermented', children: ['Sour', 'Fermented'] },
    { parent: 'Nutty/Cocoa', children: ['Nutty', 'Cocoa'] },
    { parent: 'Green/Vegetative', children: [] },
    { parent: 'Spice', children: [] },
    { parent: 'Sweet', children: ['Vanilla/Vanillin', 'Brown Sugar'] },
    { parent: 'Other', children: ['Chemical', 'Musty/Earthy', 'Woody'] }
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

    for (const group of this.historyQualityGroups) {

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

    // Keep older or unrecognized descriptors visible.
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
    const records = this.sortedRecords();

    return records.length
      ? this.formatDate(records[0].completedAt)
      : '—';
  });


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
    if (value === null || value === undefined || value === '') return '—';
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

  getCupScore(values?: boolean[]): number {
    if (!Array.isArray(values)) {
      return 0;
    }

    return values.filter(Boolean).length * 2;
  }


  selectedDetails = signal<{
    sessionNumber: number;
    sample: HistorySample;
  } | null>(null);


  openSampleDetails(
    sample: HistorySample,
    sessionNumber: number
  ) {
    this.selectedDetails.set({
      sample,
      sessionNumber
    });
  }


  closeSampleDetails() {
    this.selectedDetails.set(null);
  }


  formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }

  const total = Math.floor(seconds);

  return [
    Math.floor(total / 3600),
    Math.floor((total % 3600) / 60),
    total % 60
  ]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
}

sessionDurationLabel(record: HistoryRecord): string {
  if (record.sessionTimer?.elapsedSeconds != null) {
    return this.formatDuration(record.sessionTimer.elapsedSeconds);
  }

  if (!record.sessionClosed) {
    return record.sessionTimer?.startedAt
      ? 'In progress'
      : 'Not started';
  }

    return '—';
  }

  completionLabel(record: HistoryRecord): string {
      switch (record.completionOutcome) {
        case 'FINALIZED':
          return 'Finalized';
        case 'INCOMPLETE_SESSION_CLOSED':
          return 'Incomplete — Session Closed';
        case 'IN_PROGRESS':
          return 'In progress';
        default:
          return 'Finalized — legacy record';
      }
    }

    isIncomplete(record: HistoryRecord): boolean {
    return record.completionOutcome === 'INCOMPLETE_SESSION_CLOSED';
  }

  evaluationDurationLabel(record: HistoryRecord): string {
    const timer = record.evaluatorTimer;

    if (
      this.isIncomplete(record) &&
      timer &&
      timer.startedAt === null
    ) {
      return 'Not started';
    }

    return this.formatDuration(timer?.elapsedSeconds);
  }
}
