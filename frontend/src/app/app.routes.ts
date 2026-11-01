import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Cupping } from './pages/cupping/cupping';
import { History } from './pages/history/history';
import { Feed } from './pages/feed/feed';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './guards/auth.guard';
import { Guide } from './pages/guide/guide';
import { IndividualSession } from './pages/individual-session/individual-session';
import { JoinSession} from './pages/join-session/join-session';
import { Inventory } from './pages/inventory/inventory';
import { Profile } from './pages/profile/profile';


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
  {
    path: 'guide',
    component: Guide,
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
  {
  path: 'profile',
  component: Profile,
  canActivate: [authGuard]
  },
];
