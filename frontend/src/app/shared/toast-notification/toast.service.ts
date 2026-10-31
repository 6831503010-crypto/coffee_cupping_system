import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly active = signal<ToastMessage[]>([]);

  private lastId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Display the most recent confirmation for five seconds. */
  success(text: string): void {
    this.clearTimer();

    const id = ++this.lastId;
    this.active.set([{ id, text }]);
    this.timer = setTimeout(() => this.dismiss(id), 5000);
  }

  dismiss(id: number): void {
    if (!this.active().some(toast => toast.id === id)) return;
    this.clearTimer();
    this.active.set([]);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
