import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';

export interface NotificationItem {
  notificationId: number;
  notificationType: string;
  message: string;
  sessionId: number | null;
  sessionAccessible: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  nextBeforeId: number | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api';

  list(beforeId?: number) {
    return this.http.get<NotificationPage>(
      `${this.base}/notifications`,
      {
        withCredentials: true,
        params: beforeId === undefined
          ? {}
          : { beforeId: String(beforeId) }
      }
    );
  }

  markRead(notificationId: number) {
    return this.http.get<{
      headerName: string;
      token: string;
    }>(
      `${this.base}/csrf`,
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.post<void>(
          `${this.base}/notifications/${notificationId}/read`,
          {},
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
