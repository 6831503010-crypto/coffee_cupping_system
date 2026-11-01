import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FeedScores {
  aromaQuality: number | null;
  flavor: number | null;
  aftertaste: number | null;
  acidity: number | null;
  body: number | null;
  balance: number | null;
  overall: number | null;
  uniformity: number | null;
  cleanCup: number | null;
  sweetness: number | null;
  defectDeduction: number | null;
}

export interface FeedJudgeNote {
  judgeName: string;
  aromaNotes: string | null;
  flavorNotes: string | null;
  aromaQualities: string[];
  flavorQualities: string[];
}

export interface FeedCupSummary {
  cupNumber: number;
  judges: number;
  uniformityPasses: number;
  cleanCupPasses: number;
  sweetnessPasses: number;
}

export interface FeedAdditionalDetails {
  dryAromaIntensity: number | null;
  breakAromaIntensity: number | null;
  colorIntensity: string | null;
  acidityIntensity: number | null;
  bodyLevel: number | null;
  cups: FeedCupSummary[];
}

export interface FeedSampleDetails {
  process: string | null;
  harvestYear: number | null;
  growingLocation: string | null;
  ownerProducer: string | null;
}

export interface PublicFeedResult {
  sessionId: number;
  sessionName: string;
  sessionSampleId: number;
  sampleName: string;
  sampleDetails: FeedSampleDetails;
  closedAt: string;
  averageScore: number;
  finalizedJudges: number;
  scores: FeedScores;
  notes: FeedJudgeNote[];
  additionalDetails: FeedAdditionalDetails;
}

@Injectable({ providedIn: 'root' })
export class PublicFeedService {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<PublicFeedResult[]>('http://localhost:8080/api/feed',
      { withCredentials: true });
  }
}
