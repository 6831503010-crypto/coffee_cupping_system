import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';

export interface CupResult {
  cupNumber: number;
  uniformity: boolean;
  cleanCup: boolean;
  sweetness: boolean;
}

export interface EvaluationSamplePayload {
  sessionSampleId: number;
  dryAroma: number | null;
  breakAroma: number | null;
  colorIntensity: string | null;
  aromaQualityScore: number | null;
  flavorScore: number | null;
  aftertasteScore: number | null;
  acidityScore: number | null;
  bodyScore: number | null;
  balanceScore: number | null;
  overallScore: number | null;
  acidityIntensity: number | null;
  bodyLevel: number | null;
  defectType: string | null;
  aromaQualities: string[];
  flavorQualities: string[];
  cups: CupResult[];
  aromaNotes: string;
  flavorNotes: string;
}

export interface SavedEvaluation {
  evaluationId: number;
  sessionSampleId: number;
  status: 'DRAFT' | 'FINALIZED';
  finalizedAt: string | null;
  totalScore: number | null;
  data: EvaluationSamplePayload;
}

export interface EvaluationHistoryGroup {
  sessionId: number;
  sessionName: string;
  completedAt: string;
  samples: SavedEvaluation[];
}

@Injectable({ providedIn: 'root' })
export class EvaluationSubmissionService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/individual-sessions';

  load(sessionId: number) {
    return this.http.get<SavedEvaluation[]>(
      `${this.base}/${sessionId}/my-evaluations`, { withCredentials: true }
    );
  }

  save(sessionId: number, samples: EvaluationSamplePayload[], finalize: boolean) {
    return this.http.get<{ token: string; headerName: string }>(
      'http://localhost:8080/api/csrf', { withCredentials: true }
    ).pipe(switchMap(csrf =>
      this.http.put<SavedEvaluation[]>(
        `${this.base}/${sessionId}/my-evaluations`, { finalize, samples },
        { withCredentials: true, headers: { [csrf.headerName]: csrf.token } }
      )
    ));
  }

  history() {
    return this.http.get<EvaluationHistoryGroup[]>(
      `${this.base}/my-evaluation-history`, { withCredentials: true }
    );
  }
}
