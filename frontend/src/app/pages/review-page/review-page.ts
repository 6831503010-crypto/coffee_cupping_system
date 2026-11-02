
import { Component, HostListener } from '@angular/core';
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
  selectedImage: string | null = null;
  selectedImageAlt: string = '';
  zoomLevel: number = 1;
  zoomOrigin: string = '50% 50%';

  openImage(image: string, alt: string): void {
    this.selectedImage = image;
    this.selectedImageAlt = alt;
    this.zoomLevel = 1;
    this.zoomOrigin = '50% 50%';
  }

  closeImage(): void {
    this.selectedImage = null;
    this.selectedImageAlt = '';
    this.zoomLevel = 1;
    this.zoomOrigin = '50% 50%';
  }

  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const image = event.target as HTMLImageElement;
    const rect = image.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    this.zoomOrigin = `${x}% ${y}%`;

    const change = event.deltaY < 0 ? 0.2 : -0.2;

    this.zoomLevel = Math.min(
      4,
      Math.max(0.5, this.zoomLevel + change)
    );
  }

  toggleZoom(event: MouseEvent): void {
    event.stopPropagation();

    const image = event.target as HTMLImageElement;
    const rect = image.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    this.zoomOrigin = `${x}% ${y}%`;

    this.zoomLevel = this.zoomLevel === 1 ? 2.5 : 1;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.closeImage();
  }
}
