
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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
  zoomLevel: number = 1;
  zoomOrigin: string = '50% 50%';

  constructor(private router: Router) {}

  async goToNextPage(): Promise<void> {
    const navigated = await this.router.navigateByUrl('/guide/aroma-test');

    if (navigated) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }

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
