import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink
} from '@angular/router';

import { filter, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css'
})
export class SiteHeader {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.authService.currentUser;

  readonly menuOpen = signal(false);
  readonly accountOpen = signal(false);
  readonly loggingOut = signal(false);
  readonly currentPath = signal(this.pathFromUrl(this.router.url));

  readonly isAuthPage = computed(() =>
    ['/login', '/register'].includes(this.currentPath())
  );

  readonly showFullNavigation = computed(() =>
    this.currentPath() === '/' && !!this.currentUser()
  );

  readonly showAccount = computed(() =>
    !this.isAuthPage() && !!this.currentUser()
  );

  readonly userInitial = computed(() => {
    const name = this.currentUser()?.name?.trim() || '';
    return Array.from(name)[0]?.toLocaleUpperCase() || '?';
  });

  @ViewChild('accountArea')
  private accountArea?: ElementRef<HTMLElement>;

  @ViewChild('accountTrigger')
  private accountTrigger?: ElementRef<HTMLButtonElement>;

  @ViewChild('headerArea')
  private headerArea?: ElementRef<HTMLElement>;

  constructor() {
    this.router.events.pipe(
      filter(
        (event): event is NavigationEnd =>
          event instanceof NavigationEnd
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.currentPath.set(
        this.pathFromUrl(event.urlAfterRedirects)
      );

      this.closeMenu();
    });
  }

  private pathFromUrl(url: string): string {
    return url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
    this.accountOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.accountOpen.set(false);
  }

  openAccountOnHover(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.accountOpen.set(true);
    }
  }

  closeAccountOnLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      // Keep keyboard-focused dropdown controls available.
      const focused = this.accountArea?.nativeElement.ownerDocument
        .activeElement;

      if (
        focused &&
        focused !== this.accountTrigger?.nativeElement &&
        this.accountArea?.nativeElement.contains(focused)
      ) {
        return;
      }

      this.accountOpen.set(false);
    }
  }

  onAccountFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;

    if (!next || !this.accountArea?.nativeElement.contains(next)) {
      this.accountOpen.set(false);
    }
  }

  onAccountEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.accountOpen.set(false);
    this.accountTrigger?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (!target || !this.accountArea?.nativeElement.contains(target)) {
      this.accountOpen.set(false);
    }

    if (!target || !this.headerArea?.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
  }

  logout(): void {
    if (this.loggingOut()) return;

    this.closeMenu();
    this.loggingOut.set(true);

    this.authService.logout().pipe(
      finalize(() => this.loggingOut.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.router.navigateByUrl('/login');
      },
      error: () => {
        // Preserve the existing logout behavior.
        this.authService.clearUser();
        this.router.navigateByUrl('/login');
      }
    });
  }
}
