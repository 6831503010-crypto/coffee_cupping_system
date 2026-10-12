import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  catchError,
  map,
  of
} from 'rxjs';

import {
  AuthService
} from '../services/auth.service';


export const authGuard: CanActivateFn =
  (route, state) => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);


    // Already confirmed during this Angular session
    if (authService.currentUser()) {
      return true;
    }


    // Ask Spring Boot whether the JSESSIONID
    // still represents an authenticated session
    return authService.me().pipe(

      map(() => true),

      catchError(() =>
        of(
          router.createUrlTree(
            ['/login'],
            {
              queryParams: {
                returnUrl: state.url
              }
            }
          )
        )
      )

    );
  };
