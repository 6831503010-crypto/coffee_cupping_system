
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './review-page.html',
  styleUrl: './review-page.css'
})
export class ReviewPage {

}
