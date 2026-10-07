import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface HealthResponse {
  status: string;
  message: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  private http = inject(HttpClient);

  backendMessage = signal('Checking backend connection...');

  constructor() {
    this.http
      .get<HealthResponse>('http://localhost:8080/api/health')
      .subscribe({
        next: (response) => {
          console.log('Backend response:', response);
          this.backendMessage.set(response.message);
        },

        error: (error) => {
          console.error('Backend connection failed:', error);
          this.backendMessage.set('Could not connect to Spring Boot');
        }
      });
  }
}
