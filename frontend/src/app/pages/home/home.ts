import { Component, inject,signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CuppingModeModal } from '../../shared/cupping-mode-modal/cupping-mode-modal';
import { CoffeeInventoryService, InventorySample } from '../../services/coffee-inventory.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CuppingModeModal],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private readonly authService =
  inject(AuthService);

  private readonly router =
    inject(Router);
  private readonly inventory = inject(CoffeeInventoryService);
  readonly recentSamples = signal<InventorySample[]>([]);
  readonly inventoryTotal = signal(0);
  readonly inSessionTotal = signal(0);
  readonly inventoryLoading = signal(true);
  readonly inventoryError = signal('');

  constructor() { this.loadInventoryPreview(); }

  loadInventoryPreview(): void {
    this.inventoryLoading.set(true);
    this.inventoryError.set('');
    this.inventory.mine().subscribe({
      next: data => {
        this.recentSamples.set(data.slice(0, 3));
        this.inventoryTotal.set(data.length);
        this.inSessionTotal.set(data.filter(s => s.sessionCount > 0).length);
        this.inventoryLoading.set(false);
      },
      error: () => {
        this.inventoryError.set('Could not load inventory preview.');
        this.inventoryLoading.set(false);
      }
    });
  }

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


  // @ViewChild('cuppingModeDialog')
  // cuppingModeDialog?: ElementRef<HTMLDialogElement>;

  // openModeDialog() {
  //   const dialog = this.cuppingModeDialog?.nativeElement;

  //   if (dialog && !dialog.open) {
  //     dialog.showModal();
  //   }
  // }

  // closeModeDialog() {
  //   this.cuppingModeDialog?.nativeElement.close();
  // }

  // selectIndividualMode() {
  //   this.closeModeDialog();
  //   this.router.navigateByUrl('/individual/new');
  // }

  // onModeDialogClick(event: MouseEvent) {
  //   // Close when clicking outside the popup content.
  //   if (
  //     event.target ===
  //     this.cuppingModeDialog?.nativeElement
  //   ) {
  //     this.closeModeDialog();
  //   }
  // }
}
