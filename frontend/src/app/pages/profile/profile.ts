import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface UserProfile {
  userId: number;
  name: string;
  email: string;
  qualificationStatus: string | null;
  qualificationConfirmedAt: string | null;
  createdAt: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  name = '';

  ngOnInit(): void {
    const user = this.auth.currentUser();

    if (!user) {
      this.loading.set(false);
      this.error.set(
        'Your session could not be identified. Please sign in again.'
      );
      return;
    }

    this.http.get<UserProfile>(
      `http://localhost:8080/api/users/${user.userId}`,
      {
        withCredentials: true
      }
    )
    .pipe(
      finalize(() => this.loading.set(false))
    )
    .subscribe({
      next: profile => {
        this.profile.set(profile);
        this.name = profile.name;
      },
      error: () => {
        this.error.set(
          'Unable to load your profile. Please try again.'
        );
      }
    });
  }

  startEditing(): void {
    const profile = this.profile();

    if (!profile) return;

    this.name = profile.name;
    this.error.set('');
    this.success.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.name = this.profile()?.name ?? '';
    this.editing.set(false);
    this.error.set('');
  }

  saveProfile(): void {
    const profile = this.profile();
    const trimmedName = this.name.trim();

    if (!profile || this.saving()) return;

    if (!trimmedName) {
      this.error.set('Name cannot be empty.');
      return;
    }

    if (trimmedName.length > 100) {
      this.error.set(
        'Name must be 100 characters or fewer.'
      );
      return;
    }

    this.error.set('');
    this.success.set('');
    this.saving.set(true);

    this.http.put<UserProfile>(
      `http://localhost:8080/api/users/${profile.userId}`,
      {
        name: trimmedName
      },
      {
        withCredentials: true
      }
    )
    .pipe(
      finalize(() => this.saving.set(false))
    )
    .subscribe({
      next: updated => {
        this.profile.set(updated);
        this.name = updated.name;

        const current = this.auth.currentUser();

        if (current) {
          this.auth.updateCurrentUser({
            ...current,
            name: updated.name
          });
        }

        this.editing.set(false);

        this.success.set(
          'Your profile has been updated.'
        );
      },
      error: () => {
        this.error.set(
          'Unable to save your changes. Please try again.'
        );
      }
    });
  }

  displayDate(value: string | null): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get initials(): string {
    return (
      this.profile()?.name.trim().charAt(0) || '?'
    ).toLocaleUpperCase();
  }
}