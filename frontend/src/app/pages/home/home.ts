import { Component, inject,signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private readonly authService =
  inject(AuthService);

  private readonly router =
    inject(Router);

  readonly currentUser =
    this.authService.currentUser;

  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {

    this.authService.logout()
      .subscribe({

        next: () => {

          this.router.navigateByUrl('/login');

        },

        error: () => {

          // Even if the backend session has
          // already expired, clear Angular state.
          this.authService.clearUser();

          this.router.navigateByUrl('/login');
        }

      });
  }
}
