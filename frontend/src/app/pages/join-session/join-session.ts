import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IndividualSessionService,
  JoinPreview
} from '../../services/individual-session.service';

@Component({
  selector: 'app-join-session',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './join-session.html',
  styleUrl: './join-session.css'
})
export class JoinSession implements OnInit {
  private service = inject(IndividualSessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private token = '';

  preview = signal<JoinPreview | null>(null);
  loading = signal(true);
  joining = signal(false);
  error = signal('');

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.loadPreview();
  }

  loadPreview(keepError = false) {
    if (this.loading() && this.preview()) return;

    this.loading.set(true);
    this.preview.set(null);

    if (!keepError) {
      this.error.set('');
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(this.token)) {
      this.error.set('This participation link is invalid.');
      this.loading.set(false);
      return;
    }

    this.service.previewJoin(this.token).subscribe({
      next: preview => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.handleError(error);
      }
    });
  }

  join() {
    const preview = this.preview();

    if (
      !preview?.canJoin ||
      this.loading() ||
      this.joining()
    ) {
      return;
    }

    this.joining.set(true);
    this.error.set('');

    this.service.joinSession(this.token).subscribe({
      next: result => {
        this.joining.set(false);
        void this.router.navigate(['/individual', result.sessionId]);
      },
      error: (error: HttpErrorResponse) => {
        this.joining.set(false);
        this.handleError(error);

        // Another evaluator may have taken the last place.
        if (error.status === 409 || error.status === 403) {
          this.loadPreview(true);
        }
      }
    });
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 401) {
      void this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: `/join/${this.token}`
        }
      });
      return;
    }

    switch (error.status) {
      case 403:
        this.error.set('You are not allowed to join this session.');
        break;
      case 404:
        this.error.set('This participation link is invalid or unavailable.');
        break;
      case 409:
        this.error.set(
          'The session is full or closed. Its availability has changed.'
        );
        break;
      default:
        this.error.set(
          'Unable to connect. Please refresh the session details and try again.'
        );
    }
  }
}
