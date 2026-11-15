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


/** Keep Home as the landing page for signed-in users; guests see Feed. */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.currentUser()) return true;
  return auth.me().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/feed'])))
  );
};

/** Feed is public, but restore an existing login for the account navbar. */
export const publicFeedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.currentUser()) return true;
  return auth.me().pipe(
    map(() => true),
    catchError(() => of(true))
  );
};
