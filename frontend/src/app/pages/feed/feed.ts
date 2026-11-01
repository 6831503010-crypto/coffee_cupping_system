import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeedJudgeNote, PublicFeedResult, PublicFeedService } from '../../services/public-feed.service';

interface CombinedFeedNotes {
  aromaQualities: string[];
  aromaOthers: string[];
  flavorQualities: string[];
  flavorOthers: string[];
  hasAroma: boolean;
  hasFlavor: boolean;
  hasAny: boolean;
}

@Component({
  selector: 'app-feed',
  imports: [RouterLink],
  templateUrl: './feed.html',
  styleUrl: './feed.css'
})
export class Feed implements OnInit {
  private readonly api = inject(PublicFeedService);
  readonly results = signal<PublicFeedResult[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly sort = signal<'latest' | 'highest'>('latest');
  readonly currentPage = signal(1);
  readonly perPage = 10;
  readonly expandedSampleId = signal<number | null>(null);

  // Aggregate once when Feed data changes rather than recomputing on every
  // template check. Each session sample has its own independent note set.
  readonly combinedNotes = computed(() => {
    const notesBySample = new Map<number, CombinedFeedNotes>();
    for (const result of this.results()) {
      notesBySample.set(result.sessionSampleId, this.combineNotes(result.notes ?? []));
    }
    return notesBySample;
  });

  readonly filtered = computed(() => {
    const search = this.search().toLowerCase().trim();
    const items = this.results().filter(item => !search ||
      item.sessionName.toLowerCase().includes(search) || item.sampleName.toLowerCase().includes(search));
    return [...items].sort((a, b) => this.sort() === 'highest'
      ? b.averageScore - a.averageScore || Date.parse(b.closedAt) - Date.parse(a.closedAt)
      : Date.parse(b.closedAt) - Date.parse(a.closedAt) || b.sessionId - a.sessionId);
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.perPage)));
  readonly visible = computed(() => this.filtered().slice(
    (this.currentPage() - 1) * this.perPage, this.currentPage() * this.perPage));

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: results => { this.results.set(results); this.loading.set(false); },
      error: () => { this.error.set('Unable to load public results. Please try again.'); this.loading.set(false); }
    });
  }

  updateSearch(value: string): void { this.search.set(value); this.reset(); }
  updateSort(value: string): void { this.sort.set(value === 'highest' ? 'highest' : 'latest'); this.reset(); }
  private reset(): void { this.currentPage.set(1); this.expandedSampleId.set(null); }
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page); this.expandedSampleId.set(null);
  }
  toggleRow(id: number): void {
    this.expandedSampleId.set(this.expandedSampleId() === id ? null : id);
  }
  format(value: number | null | undefined): string { return value == null ? '—' : Number(value).toFixed(2); }
  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined,
      { year: 'numeric', month: 'short', day: 'numeric' });
  }
  private combineNotes(notes: FeedJudgeNote[]): CombinedFeedNotes {
    const aromaQualities = new Map<string, string>();
    const flavorQualities = new Map<string, string>();
    const aromaOthers = new Map<string, string>();
    const flavorOthers = new Map<string, string>();

    // Compare normalized text, but preserve the first distinct entry's
    // original spelling. Empty or whitespace-only values are ignored.
    const key = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const addQualities = (target: Map<string, string>, values: string[] | null | undefined) => {
      for (const value of values ?? []) {
        if (typeof value !== 'string') continue;
        const normalized = key(value);
        if (normalized && !target.has(normalized)) target.set(normalized, value.trim());
      }
    };
    const addOther = (target: Map<string, string>, text: string | null | undefined) => {
      if (typeof text !== 'string') return;
      const normalized = key(text);
      if (normalized && !target.has(normalized)) target.set(normalized, text.trim());
    };

    for (const note of notes) {
      addQualities(aromaQualities, note.aromaQualities);
      addQualities(flavorQualities, note.flavorQualities);
      addOther(aromaOthers, note.aromaNotes);
      addOther(flavorOthers, note.flavorNotes);
    }

    return {
      aromaQualities: [...aromaQualities.values()],
      aromaOthers: [...aromaOthers.values()],
      flavorQualities: [...flavorQualities.values()],
      flavorOthers: [...flavorOthers.values()],
      hasAroma: !!(aromaQualities.size || aromaOthers.size),
      hasFlavor: !!(flavorQualities.size || flavorOthers.size),
      hasAny: !!(aromaQualities.size || aromaOthers.size || flavorQualities.size || flavorOthers.size)
    };
  }
}
