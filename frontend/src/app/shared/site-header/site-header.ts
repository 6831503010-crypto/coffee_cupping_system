import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink
} from '@angular/router';

import {
  EMPTY,
  catchError,
  exhaustMap,
  filter,
  finalize,
  timer,
  firstValueFrom
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/auth.service';

import {
  NotificationService,
  NotificationItem,
  NotificationPage
} from '../../services/notification.service';

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
  private readonly notificationApi = inject(NotificationService);

  readonly notificationItems = signal<NotificationItem[]>([]);
  readonly unreadNotificationCount = signal(0);
  readonly notificationsOpen = signal(false);
  readonly notificationsLoading = signal(false);
  readonly notificationsError = signal('');
  readonly notificationsHasMore = signal(false);
  readonly notificationsNextBeforeId = signal<number | null>(null);

  readonly currentUser = this.authService.currentUser;

  readonly menuOpen = signal(false);
  readonly accountOpen = signal(false);
  readonly loggingOut = signal(false);
  readonly currentPath = signal(this.pathFromUrl(this.router.url));
  readonly loadingOlderNotifications = signal(false);

  readonly isAuthPage = computed(() =>
    ['/login', '/register'].includes(this.currentPath())
  );

  readonly showFullNavigation = computed(() =>
    !this.isAuthPage() && !!this.currentUser()
  );

  readonly showAccount = computed(() =>
    !this.isAuthPage() && !!this.currentUser()
  );

  readonly userInitial = computed(() => {
    const name = this.currentUser()?.name?.trim() || '';
    return Array.from(name)[0]?.toLocaleUpperCase() || '?';
  });

  readonly openingNotificationId = signal<number | null>(null);

  @ViewChild('notificationArea')
  private notificationArea?: ElementRef<HTMLElement>;

  @ViewChild('notificationTrigger')
  private notificationTrigger?: ElementRef<HTMLButtonElement>;

  @ViewChild('accountArea')
  private accountArea?: ElementRef<HTMLElement>;

  @ViewChild('accountTrigger')
  private accountTrigger?: ElementRef<HTMLButtonElement>;

  @ViewChild('headerArea')
  private headerArea?: ElementRef<HTMLElement>;

  constructor() {
    effect(onCleanup => {
      const userId = this.currentUser()?.userId ?? null;

      untracked(() => {
        this.notificationItems.set([]);
        this.unreadNotificationCount.set(0);
        this.notificationsOpen.set(false);
        this.notificationsError.set('');
        this.notificationsHasMore.set(false);
        this.notificationsNextBeforeId.set(null);
        this.notificationsLoading.set(userId !== null);
        this.openingNotificationId.set(null);
        this.loadingOlderNotifications.set(false);

        if (userId === null) return;

        const subscription = timer(0, 15000).pipe(
          exhaustMap(() =>
            this.notificationApi.list().pipe(
              catchError(error => {
                if (this.currentUser()?.userId === userId) {
                  this.notificationsLoading.set(false);

                  if (error.status === 401) {
                    this.authService.clearUser();
                  } else {
                    this.notificationsError.set(
                      'Unable to load notifications. Retrying…'
                    );
                  }
                }

                return EMPTY;
              })
            )
          ),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(page => {
          if (
            this.currentUser()?.userId !== userId ||
            this.openingNotificationId() !== null ||
            this.loadingOlderNotifications()
          ) return;

          this.applyNotificationPage(page);
          this.notificationsLoading.set(false);
          this.notificationsError.set('');
        });

        onCleanup(() => subscription.unsubscribe());
      });
    });

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
    this.notificationsOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.accountOpen.set(false);
    this.notificationsOpen.set(false);
  }

  openAccountOnHover(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.accountOpen.set(true);
      this.notificationsOpen.set(false);
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

    if (!target || !this.notificationArea?.nativeElement.contains(target)) {
      this.notificationsOpen.set(false);
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

  toggleNotifications(): void {
    this.notificationsOpen.update(open => !open);
    this.accountOpen.set(false);
    this.menuOpen.set(false);
  }

  onNotificationsEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.notificationsOpen.set(false);
    this.notificationTrigger?.nativeElement.focus();
  }

  async openNotification(item: NotificationItem): Promise<void> {
    const userId = this.currentUser()?.userId;

    if (userId == null || this.loadingOlderNotifications() || this.openingNotificationId() !== null) {
      return;
    }

    this.openingNotificationId.set(item.notificationId);
    this.notificationsError.set('');

    try {
      await firstValueFrom(
        this.notificationApi.markRead(item.notificationId)
      );

      if (this.currentUser()?.userId !== userId) return;

      // Read again so the count and timestamp come from the backend.
      const page = await firstValueFrom(this.notificationApi.list());

      if (this.currentUser()?.userId !== userId) return;

      this.applyNotificationPage(page);

      const updated = page.items.find(
        notification => notification.notificationId === item.notificationId
      );

      const target = updated ?? item;

      if (target.sessionAccessible && target.sessionId !== null) {
        this.notificationsOpen.set(false);
        await this.router.navigate(['/individual', target.sessionId]);
      } else {
        this.notificationsError.set(
          'Marked as read. This session is no longer available to your account.'
        );
      }
    } catch {
      if (this.currentUser()?.userId === userId) {
        this.notificationsError.set(
          'Could not confirm notification status. Please try again.'
        );
      }
    } finally {
      if (this.currentUser()?.userId === userId) {
        this.openingNotificationId.set(null);
      }
    }
  }

  formatNotificationDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  }

  private applyNotificationPage(
    page: NotificationPage,
    olderPage = false
  ): void {
    const existing = this.notificationItems();
    const merged = new Map(
      existing.map(item => [item.notificationId, item])
    );

    for (const item of page.items) {
      merged.set(item.notificationId, item);
    }

    this.notificationItems.set(
      [...merged.values()].sort(
        (a, b) => b.notificationId - a.notificationId
      )
    );

    this.unreadNotificationCount.set(page.unreadCount);

    // Only an initial page or an explicitly requested older page
    // changes the pagination boundary.
    if (olderPage || existing.length === 0) {
      this.notificationsHasMore.set(page.hasMore);
      this.notificationsNextBeforeId.set(page.nextBeforeId);
    }
  }

  async loadOlderNotifications(): Promise<void> {
    const userId = this.currentUser()?.userId;
    const beforeId = this.notificationsNextBeforeId();

    if (
      userId == null ||
      beforeId === null ||
      !this.notificationsHasMore() ||
      this.loadingOlderNotifications() ||
      this.openingNotificationId() !== null
    ) {
      return;
    }

    this.loadingOlderNotifications.set(true);
    this.notificationsError.set('');

    try {
      const page = await firstValueFrom(
        this.notificationApi.list(beforeId)
      );

      if (this.currentUser()?.userId !== userId) return;

      this.applyNotificationPage(page, true);
    } catch {
      if (this.currentUser()?.userId === userId) {
        this.notificationsError.set(
          'Could not load older notifications. Please try again.'
        );
      }
    } finally {
      if (this.currentUser()?.userId === userId) {
        this.loadingOlderNotifications.set(false);
      }
    }
  }
}
