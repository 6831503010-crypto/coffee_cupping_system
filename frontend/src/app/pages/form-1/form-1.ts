import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-form-1',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './form-1.html',
  styleUrl: './form-1.css'
})
export class Form1 {

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