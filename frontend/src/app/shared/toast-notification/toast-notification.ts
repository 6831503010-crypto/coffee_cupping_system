import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.html',
  styleUrl: './toast-notification.css'
})
export class ToastNotification {
  readonly toasts = inject(ToastService);
}
