import { Component, ElementRef,OnInit, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize,switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast-notification/toast.service';

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
  private readonly verificationDialog =
    viewChild<ElementRef<HTMLDialogElement>>('verificationDialog');
  private readonly profileSaveDialog =
  viewChild<ElementRef<HTMLDialogElement>>('profileSaveDialog');
  private readonly toast = inject(ToastService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly verificationOpen = signal(false);
  readonly verifying = signal(false);
  readonly verificationError = signal('');

  certificateName = '';
  licenseCode = '';

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

    if (
      !profile ||
      this.saving() ||
      this.verifying() ||
      this.verificationOpen()
    ) return;

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

    this.http.get<{
      headerName: string;
      token: string;
    }>(
      'http://localhost:8080/api/csrf',
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.put<UserProfile>(
          `http://localhost:8080/api/users/${profile.userId}`,
          { name: trimmedName },
          {
            withCredentials: true,
            headers: {
              [csrf.headerName]: csrf.token
            }
          }
        )
      ),
      finalize(() => this.saving.set(false))
    )
    .subscribe({
      next: updated => {
        const verificationCleared =
          profile.qualificationStatus === 'QUALIFIED' &&
          updated.qualificationStatus !== 'QUALIFIED';

        this.profile.set(updated);
        this.name = updated.name;

        const current = this.auth.currentUser();

        if (current) {
          this.auth.updateCurrentUser({
            ...current,
            name: updated.name,
            qualificationStatus: updated.qualificationStatus
          });
        }

        this.editing.set(false);

        this.toast.success(
          verificationCleared
            ? 'Profile updated. Your name changed, so qualification verification is required again.'
            : 'Your profile has been updated.'
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

  openVerification(): void {
    const profile = this.profile();
    const dialog = this.verificationDialog()?.nativeElement;

    if (
      !profile ||
      !dialog ||
      this.editing() ||
      this.saving() ||
      this.verifying() ||
      profile.qualificationStatus === 'QUALIFIED'
    ) {
      return;
    }

    this.certificateName = profile.name;
    this.licenseCode = '';
    this.verificationError.set('');
    this.success.set('');
    this.verificationOpen.set(true);

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  closeVerification(): void {
    if (this.verifying()) return;

    this.verificationDialog()?.nativeElement.close();
    this.resetVerificationForm();
  }

  onVerificationCancel(event: Event): void {
    // Escape must follow the same rules as Cancel.
    event.preventDefault();
    this.closeVerification();
  }

  onVerificationClosed(): void {
    this.resetVerificationForm();
  }

  private resetVerificationForm(): void {
    this.verificationOpen.set(false);
    this.verificationError.set('');
    this.certificateName = '';
    this.licenseCode = '';
  }

  verifyQualification(): void {
    if (!this.profile() || this.verifying()) return;

    const certificateName = this.certificateName.trim();

    this.verificationError.set('');

    if (!certificateName) {
      this.verificationError.set('Enter the certificate name.');
      return;
    }

    if (certificateName.length > 100) {
      this.verificationError.set(
        'Certificate name must be 100 characters or fewer.'
      );
      return;
    }

    if (!/^Q-[0-9]{6}$/.test(this.licenseCode)) {
      this.verificationError.set(
        'License code must use the format Q-123456.'
      );
      return;
    }

    this.verifying.set(true);

    this.http.get<{
      headerName: string;
      token: string;
    }>(
      'http://localhost:8080/api/csrf',
      { withCredentials: true }
    ).pipe(
      switchMap(csrf =>
        this.http.post<UserProfile>(
          'http://localhost:8080/api/users/me/qualification/verify',
          {
            certificateName,
            licenseCode: this.licenseCode
          },
          {
            withCredentials: true,
            headers: {
              [csrf.headerName]: csrf.token
            }
          }
        )
      ),
      finalize(() => this.verifying.set(false))
    ).subscribe({
      next: updated => {
        this.profile.set(updated);

        const current = this.auth.currentUser();

        if (current) {
          this.auth.updateCurrentUser({
            ...current,
            name: updated.name,
            qualificationStatus: updated.qualificationStatus
          });
        }

        this.verificationDialog()?.nativeElement.close();
        this.resetVerificationForm();

        this.toast.success(
          'Your Q Grader qualification has been verified.'
        );
      },
      error: error => {
        const message = error.error?.error;

        this.verificationError.set(
          typeof message === 'string'
            ? message
            : 'Unable to verify your qualification. Please try again.'
        );
      }
    });
  }

  requestProfileSave(): void {
    if (
      !this.profile() ||
      this.saving() ||
      this.verifying() ||
      this.verificationOpen()
    ) return;

    const trimmedName = this.name.trim();

    this.error.set('');

    if (!trimmedName) {
      this.error.set('Name cannot be empty.');
      return;
    }

    if (trimmedName.length > 100) {
      this.error.set('Name must be 100 characters or fewer.');
      return;
    }

    const dialog = this.profileSaveDialog()?.nativeElement;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  cancelProfileSave(): void {
    this.profileSaveDialog()?.nativeElement.close();
  }

  confirmProfileSave(): void {
    if (this.saving()) return;

    this.profileSaveDialog()?.nativeElement.close();
    this.saveProfile();
  }
}
