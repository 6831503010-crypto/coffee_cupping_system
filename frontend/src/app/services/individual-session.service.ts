
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';

export interface NewCoffeeSample {
  sampleName: string;
  process: string;
  harvestYear: number | null;
  growingLocation: string;
  ownerProducer: string;
}

export interface SampleChoice {
  sampleCode: string;
  sampleId?: number;
  newSample?: NewCoffeeSample;
}

export interface LibrarySample {
  sampleId: number;
  sampleName: string;
  process: string | null;
  harvestYear: number | null;
  growingLocation: string | null;
  ownerProducer: string | null;
}

export interface SessionSample {
  sessionSampleId: number;
  sampleId: number | null;
  sampleCode: string;
  sampleName: string | null;
  process: string | null;
  harvestYear: number | null;
  growingLocation: string | null;
  ownerProducer: string | null;
}

export interface SessionView {
  sessionId: number;
  sessionName: string;
  evaluatorLimit: number;
  joinedEvaluators: number;
  isCreator: boolean;
  canEvaluate: boolean;
  samples: SessionSample[];
  finalized: boolean;
  sampleDetailsVisible: boolean;
}

export interface CreateIndividualSessionRequest {
  sessionName: string;
  evaluatorLimit: number;
  creatorParticipates: boolean;
  samples: SampleChoice[];
}

interface CsrfResponse {
  headerName: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class IndividualSessionService {

  private http = inject(HttpClient);

  private baseUrl =
    'http://localhost:8080/api';

  library() {
    return this.http.get<LibrarySample[]>(
      `${this.baseUrl}/individual-sessions/library`,
      { withCredentials: true }
    );
  }

  get(id: number) {
    return this.http.get<SessionView>(
      `${this.baseUrl}/individual-sessions/${id}`,
      { withCredentials: true }
    );
  }

  create(request: CreateIndividualSessionRequest) {
    return this.http.get<CsrfResponse>(
      `${this.baseUrl}/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.post<SessionView>(
          `${this.baseUrl}/individual-sessions`,
          request,
          {
            withCredentials: true,
            headers: {
              [csrf.headerName]: csrf.token
            }
          }
        )
      )
    );
  }
}
