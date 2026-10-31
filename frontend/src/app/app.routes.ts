
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Cupping } from './pages/cupping/cupping';
import { History } from './pages/history/history';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth.guard';
import { Guide } from './pages/guide/guide';
import { Form1 } from './pages/form-1/form-1';
import { FirstUserGuide } from './pages/first-user-guide/first-user-guide';
import { FlavorTest } from './pages/flavor-test/flavor-test';
import { ReviewPage } from './pages/review-page/review-page';
import { IndividualSession } from './pages/individual-session/individual-session';
import { JoinSession } from './pages/join-session/join-session';
import { Inventory } from './pages/inventory/inventory';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
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
    path: 'history',
    component: History,
    canActivate: [authGuard]
  },
  {
    path: 'about',
    component: Guide,
    canActivate: [authGuard]
  },
  {
    path: 'guide/form-1',
    component: Form1,
    canActivate: [authGuard]
  },
  {
    path: 'guide',
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
  {
    path: 'join/:token',
    component: JoinSession,
    canActivate: [authGuard]
  },
  {
    path: 'individual/new',
    component: IndividualSession,
    canActivate: [authGuard]
  },
  {
    path: 'individual/:id',
    component: IndividualSession,
    canActivate: [authGuard]
  },
];
