import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Five-value viewport over the existing score options; no scoring rules are changed. */
@Component({
  selector: 'app-score-picker',
  standalone: true,
  template: `
    <div class="score-picker" [class.score-picker-disabled]="control.disabled" [class.score-picker-has-heading]="!!heading">
      <div class="score-picker-toolbar">
        @if (heading) {
          <h4 class="score-picker-heading">
            {{ heading }}
            @if (required) { <span class="score-picker-required" aria-hidden="true">*</span> }
          </h4>
        }
        <span class="score-picker-value" aria-live="polite">
          {{ control.value === null ? 'Select score' : control.value.toFixed(2) }}
        </span>
      </div>
      <div class="score-picker-row">
        <button type="button" class="score-scroll-arrow" aria-label="Scroll scores left"
          [disabled]="control.disabled" (click)="scrollByOne(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <div #scoreTrack class="score-picker-track" role="group" [attr.aria-label]="ariaLabel"
          tabindex="0" (keydown.arrowLeft)="scrollByOne(-1); $event.preventDefault()"
          (keydown.arrowRight)="scrollByOne(1); $event.preventDefault()">
          @for (score of options; track score; let i = $index) {
            <button type="button" class="score-picker-option" [id]="i === 0 ? fieldId : null"
              [class.selected]="control.value === score" [attr.aria-pressed]="control.value === score"
              [disabled]="control.disabled" (click)="choose(score)">
              {{ score % 1 === 0 ? score.toFixed(0) : score.toFixed(2) }}
            </button>
          }
        </div>
        <button type="button" class="score-scroll-arrow" aria-label="Scroll scores right"
          [disabled]="control.disabled" (click)="scrollByOne(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .score-picker { min-width: 0; }
    .score-picker-toolbar { display: flex; justify-content: flex-end; margin: 0 0 8px; min-height: 26px; }
    .score-picker-has-heading .score-picker-toolbar { justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; min-height: 27px; }
    .score-picker-heading { min-width: 0; margin: 0; color: #392318; font-size: 16px; font-weight: 750; line-height: 1.25; }
    .score-picker-required { color: var(--danger, #c0392b); margin-left: 3px; }
    .score-picker-value { background: #f7f1e7; border: 1px solid #e5d8cc; color: #392318;
      border-radius: 8px; padding: 3px 9px; font-weight: 700; font-size: 13px; font-variant-numeric: tabular-nums; }
    .score-picker-row { display: flex; gap: 6px; align-items: stretch; min-width: 0; }
    .score-picker-track { display: grid; grid-auto-flow: column;
      grid-auto-columns: calc((100% - 32px) / 5); gap: 8px; min-width: 0;
      flex: 1; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain;
      scrollbar-width: none; -ms-overflow-style: none; padding: 2px 0;
      border-radius: 8px; position: relative; }
    .score-picker-track::-webkit-scrollbar { display: none; }
    .score-picker-option { min-width: 0; min-height: 40px; padding: 8px 2px; font: inherit;
      font-size: 13px; font-variant-numeric: tabular-nums; color: #392318; background: #fff;
      border: 1px solid #e5d8cc; border-radius: 9px; cursor: pointer;
      scroll-snap-align: center; }
    .score-picker-option.selected { color: #fff; background: #392318; border-color: #392318;
      font-weight: 750; }
    .score-picker-option:focus-visible, .score-scroll-arrow:focus-visible {
      outline: 2px solid #9a6545; outline-offset: 2px; }
    .score-picker-option:hover:not(:disabled):not(.selected) { border-color: #9a6545; background: #faf8f5; }
    .score-scroll-arrow { width: 25px; flex: 0 0 25px; border: 0; background: transparent;
      display: grid; place-items: center; padding: 0; color: #795b45; cursor: pointer; }
    .score-scroll-arrow:hover:not(:disabled) { color: #392318; }
    .score-scroll-arrow svg { width: 16px; height: 16px; fill: none; stroke: currentColor;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .score-picker-disabled { opacity: .7; }
    .score-picker-option:disabled, .score-scroll-arrow:disabled { cursor: not-allowed; }
    @media (max-width: 520px) {
      .score-picker-row { gap: 2px; }
      .score-scroll-arrow { width: 16px; flex-basis: 16px; }
      .score-picker-track { gap: 4px; grid-auto-columns: calc((100% - 16px) / 5); }
      .score-picker-option { font-size: 11px; padding: 8px 0; min-height: 38px; }
    }
  `]
})
export class ScorePicker implements AfterViewInit {
  @Input({ required: true }) control!: FormControl<number | null>;
  @Input({ required: true }) options: readonly number[] = [];
  @Input() ariaLabel = 'Score options';
  @Input() fieldId = '';
  @Input() heading = '';
  @Input() required = false;
  @Output() scoreSelected = new EventEmitter<void>();
  @ViewChild('scoreTrack') private track?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.centerCurrentScore();
    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.centerCurrentScore());
  }

  choose(score: number): void {
    if (this.control.disabled || this.control.value === score) return;
    this.control.setValue(score);
    this.control.markAsTouched();
    this.scoreSelected.emit();
  }

  scrollByOne(direction: -1 | 1): void {
    const element = this.track?.nativeElement;
    if (!element || this.control.disabled) return;
    const button = element.querySelector<HTMLElement>('.score-picker-option');
    if (!button) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: direction * (button.offsetWidth + gap), behavior: 'smooth' });
  }

  private centerCurrentScore(): void {
    requestAnimationFrame(() => {
      if (this.destroyRef.destroyed) return;
      const element = this.track?.nativeElement;
      if (!element) return;
      const value = this.control.value;
      const index = value === null ? Math.floor(this.options.length / 2) : this.options.indexOf(value);
      const buttons = element.querySelectorAll<HTMLElement>('.score-picker-option');
      const button = buttons[index >= 0 ? index : 0];
      if (!button) return;
      const target = button.offsetLeft - (element.clientWidth - button.offsetWidth) / 2;
      element.scrollTo({ left: target, behavior: 'auto' });
    });
  }
}
