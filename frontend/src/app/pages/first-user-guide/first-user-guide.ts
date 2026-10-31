import { Component, HostListener } from '@angular/core';
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

  selectedImage: string | null = null;
  selectedImageAlt: string = '';

  openImage(image: string, alt: string): void {
    this.selectedImage = image;
    this.selectedImageAlt = alt;
  }

  closeImage(): void {
    this.selectedImage = null;
    this.selectedImageAlt = '';
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.closeImage();
  }

}