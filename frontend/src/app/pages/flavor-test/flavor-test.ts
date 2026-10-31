import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flavor-test',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './flavor-test.html',
  styleUrl: './flavor-test.css'
})
export class FlavorTest {

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