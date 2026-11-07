import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Cupping } from './pages/cupping/cupping';
import { History } from './pages/history/history';
import { Feed } from './pages/feed/feed';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

import { authGuard } from './guards/auth.guard';

import { Guide } from './pages/guide/guide';
import { Form1 } from './pages/creating-sessions/form-1';
import { FirstUserGuide } from './pages/aroma-test/first-user-guide';
import { FlavorTest } from './pages/flavor-test/flavor-test';
import { ReviewPage } from './pages/review-page/review-page';

import { CuppingSessionPage } from './pages/cupping-session/cupping-session';
import { JoinSession } from './pages/join-session/join-session';
import { Inventory } from './pages/inventory/inventory';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  // Authentication
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },

  // Main pages
  {
    path: '',
    component: Home,
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    component: Inventory,
    canActivate: [authGuard]
  },
  {
    path: 'cupping',
    component: Cupping,
    canActivate: [authGuard]
  },
  {
    path: 'feed',
    component: Feed,
    canActivate: [authGuard]
  },
  {
    path: 'history',
    component: History,
    canActivate: [authGuard]
  },
  {
    path: 'about',
    component: Guide,
    canActivate: [authGuard]
  },

  // Guide pages
  {
    path: 'guide',
    redirectTo: 'guide/creating-sessions',
    pathMatch: 'full'
  },
  {
    path: 'guide/creating-sessions',
    component: Form1,
    canActivate: [authGuard]
  },
  {
    path: 'guide/aroma-test',
    component: FirstUserGuide,
    canActivate: [authGuard]
  },
  {
    path: 'guide/flavor-test',
    component: FlavorTest,
    canActivate: [authGuard]
  },
  {
    path: 'guide/review',
    component: ReviewPage,
    canActivate: [authGuard]
  },

    // Session pages
  {
    path: 'join/:token',
    component: JoinSession,
    canActivate: [authGuard]
  },
  {
  path: 'sessions/new',
    component: CuppingSessionPage,
    canActivate: [authGuard]
  },
  {
    path: 'sessions/:id',
    component: CuppingSessionPage,
    canActivate: [authGuard]
  },
  {
    path: 'individual/new',
    redirectTo: 'sessions/new',
    pathMatch: 'full'
  },
  {
    path: 'individual/:id',
    redirectTo: 'sessions/:id',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard]
  }
];
