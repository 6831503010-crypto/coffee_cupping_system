import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-first-user-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './first-user-guide.html',
  styleUrl: './first-user-guide.css'
})
export class FirstUserGuide {

}