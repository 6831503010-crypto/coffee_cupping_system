
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
  sessionEvaluatorId: number | null;
  closed: boolean;
  mode: CuppingMode;
}

export interface CreateCuppingSessionRequest {
  sessionName: string;
  description: string | null;
  evaluatorLimit: number;
  creatorParticipates: boolean;
  samples: SampleChoice[];
  mode?: CuppingMode;
}

export interface ParticipationLink {
  token: string;
}

export interface ParticipationResult {
  sessionId: number;
  sessionEvaluatorId: number;
  alreadyParticipating: boolean;
}

export interface JoinPreview {
  sessionId: number;
  sessionName: string;
  evaluatorLimit: number;
  joinedEvaluators: number;
  alreadyParticipating: boolean;
  canJoin: boolean;
  message: string;
}

export interface EvaluatorView {
  sessionEvaluatorId: number;
  userId: number;
  name: string;
  email: string;
  creator: boolean;
}

export interface EvaluatorCandidate {
  userId: number;
  name: string;
  email: string;
}

interface CsrfResponse {
  headerName: string;
  token: string;
}

export interface EvaluatorTimingView {
  sessionEvaluatorId: number;
  completionOutcome:
    | 'IN_PROGRESS'
    | 'FINALIZED'
    | 'INCOMPLETE_SESSION_CLOSED'
    | null;
  evaluatorTimer: {
    startedAt: string | null;
    endedAt: string | null;
    elapsedSeconds: number | null;
  };
}

export interface SessionTimingView {
  sessionId: number;
  serverNow: string;
  sessionClosed: boolean;
  sessionTimer: {
    startedAt: string | null;
    endedAt: string | null;
    elapsedSeconds: number | null;
  };
  evaluators: EvaluatorTimingView[];
}

export type CuppingMode = 'INDIVIDUAL' | 'EVENT';

interface SessionUpdateSource {
  sessionName: string;
  mode: string;
  description: string | null;
  cuppingDate: string | null;
}
@Injectable({ providedIn: 'root' })
export class CuppingSessionService {

  private http = inject(HttpClient);

  private baseUrl =
    'http://localhost:8080/api';

  library() {
    return this.http.get<LibrarySample[]>(
      `${this.baseUrl}/cupping-sessions/library`,
      { withCredentials: true }
    );
  }

  get(id: number) {
    return this.http.get<SessionView>(
      `${this.baseUrl}/cupping-sessions/${id}`,
      { withCredentials: true }
    );
  }

  getSessionDescription(sessionId: number) {
    return this.http.get<{ description: string | null }>(
      `${this.baseUrl}/sessions/${sessionId}`,
      { withCredentials: true }
    );
  }

  getSessionTiming(sessionId: number) {
    return this.http.get<SessionTimingView>(
      `http://localhost:8080/api/sessions/${sessionId}/timing`,
      { withCredentials: true }
    );
  }

  finalizeSession(
    sessionId: number,
    acknowledgeIncomplete: boolean
  ) {
    return this.http.get<SessionUpdateSource>(
      `${this.baseUrl}/sessions/${sessionId}`,
      { withCredentials: true }
    ).pipe(
      switchMap(session =>
        this.http.get<CsrfResponse>(
          `${this.baseUrl}/csrf`,
          { withCredentials: true }
        ).pipe(
          switchMap(csrf =>
            this.http.put<unknown>(
              `${this.baseUrl}/sessions/${sessionId}`,
              {
                sessionName: session.sessionName,
                mode: session.mode,
                description: session.description,
                cuppingDate: session.cuppingDate,
                status: 'FINALIZED',
                acknowledgeIncomplete
              },
              {
                withCredentials: true,
                headers: {
                  [csrf.headerName]: csrf.token
                }
              }
            )
          )
        )
      )
    );
  }

  create(request: CreateCuppingSessionRequest) {
    return this.http.get<CsrfResponse>(
      `${this.baseUrl}/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.post<SessionView>(
          `${this.baseUrl}/cupping-sessions`,
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

  listEvaluators(sessionId: number) {
    return this.http.get<EvaluatorView[]>(
      `${this.baseUrl}/cupping-sessions/${sessionId}/evaluators`,
      { withCredentials: true }
    );
  }

  searchEvaluatorCandidates(sessionId: number, query: string) {
    return this.http.get<EvaluatorCandidate[]>(
      `${this.baseUrl}/cupping-sessions/${sessionId}/evaluator-candidates`,
      {
        withCredentials: true,
        params: {
          q: query.trim()
        }
      }
    );
  }

  assignEvaluator(sessionId: number, email: string) {
    return this.postWithCsrf<ParticipationResult>(
      `/cupping-sessions/${sessionId}/evaluators`,
      { email: email.trim() }
    );
  }

  removeEvaluator(membershipId: number) {
    return this.http.get<CsrfResponse>(
      `${this.baseUrl}/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.delete<void>(
          `${this.baseUrl}/session-evaluators/${membershipId}`,
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

  getParticipationLink(sessionId: number) {
    return this.postWithCsrf<ParticipationLink>(
      `/cupping-sessions/${sessionId}/participation-link`,
      {}
    );
  }

  previewJoin(token: string) {
    return this.http.get<JoinPreview>(
      `${this.baseUrl}/cupping-sessions/join/${encodeURIComponent(token)}`,
      { withCredentials: true }
    );
  }

  joinSession(token: string) {
    return this.postWithCsrf<ParticipationResult>(
      `/cupping-sessions/join/${encodeURIComponent(token)}`,
      {}
    );
  }

  private postWithCsrf<T>(path: string, body: unknown) {
    return this.http.get<CsrfResponse>(
      `${this.baseUrl}/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.post<T>(
          `${this.baseUrl}${path}`,
          body,
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
