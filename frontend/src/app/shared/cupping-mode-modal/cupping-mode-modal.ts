import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cupping-mode-modal',
  standalone: true,
  templateUrl: './cupping-mode-modal.html',
  styleUrl: './cupping-mode-modal.css'
})
export class CuppingModeModal {
  private readonly router = inject(Router);

  @ViewChild('cuppingModeDialog')
  private cuppingModeDialog?: ElementRef<HTMLDialogElement>;

  openModeDialog() {
    const dialog = this.cuppingModeDialog?.nativeElement;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  closeModeDialog() {
    this.cuppingModeDialog?.nativeElement.close();
  }

  selectIndividualMode() {
    this.closeModeDialog();
    this.router.navigateByUrl('/individual/new');
  }

  onModeDialogClick(event: MouseEvent) {
    if (event.target === this.cuppingModeDialog?.nativeElement) {
      this.closeModeDialog();
    }
  }
}
