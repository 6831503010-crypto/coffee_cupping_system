import {
  Injectable,
  signal
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  tap
} from 'rxjs';

import {
  AuthUser
} from '../models/auth-user';


export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}


export interface LoginRequest {
  email: string;
  password: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL =
    'http://localhost:8080/api/auth';

  private readonly userSignal =
    signal<AuthUser | null>(null);

  readonly currentUser =
    this.userSignal.asReadonly();


  constructor(
    private http: HttpClient
  ) {}


  register(
    request: RegisterRequest
  ) {

    return this.http.post(
      `${this.API_URL}/register`,
      request,
      {
        withCredentials: true
      }
    );
  }


  login(
    request: LoginRequest
  ) {

    return this.http
      .post<AuthUser>(
        `${this.API_URL}/login`,
        request,
        {
          withCredentials: true
        }
      )
      .pipe(
        tap(user => {
          this.userSignal.set(user);
        })
      );
  }


  me() {

    return this.http
      .get<AuthUser>(
        `${this.API_URL}/me`,
        {
          withCredentials: true
        }
      )
      .pipe(
        tap(user => {
          this.userSignal.set(user);
        })
      );
  }


  logout() {

    return this.http
      .post(
        `${this.API_URL}/logout`,
        {},
        {
          withCredentials: true
        }
      )
      .pipe(
        tap(() => {
          this.userSignal.set(null);
        })
      );
  }


  clearUser() {
    this.userSignal.set(null);
  }
}
