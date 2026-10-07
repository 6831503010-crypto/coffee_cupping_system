import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Cupping } from './pages/cupping/cupping';
import { History } from './pages/history/history';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'cupping',
    component: Cupping
  },
  {
    path: 'history',
    component: History
  }
];
