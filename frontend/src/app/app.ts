import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeader } from './shared/site-header/site-header';
import { ToastNotification } from './shared/toast-notification/toast-notification';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, ToastNotification],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
