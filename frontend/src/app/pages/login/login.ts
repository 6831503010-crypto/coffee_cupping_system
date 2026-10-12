import {
  Component,
  signal
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';


@Component({
  selector: 'app-login',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  submitting = signal(false);
  errorMessage = signal('');


  loginForm = new FormGroup({

    email: new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.email
        ]
      }
    ),

    password: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }
    )

  });


  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}


  submit() {

    if (
      this.loginForm.invalid ||
      this.submitting()
    ) {

      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const values =
      this.loginForm.getRawValue();


    this.authService.login({
      email: values.email.trim(),
      password: values.password
    })
    .subscribe({

      next: () => {

        this.submitting.set(false);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        this.router.navigateByUrl(returnUrl);
      },

      error: error => {

        this.submitting.set(false);

        if (error.status === 400) {

          this.errorMessage.set(
            'Invalid email or password.'
          );

        } else {

          this.errorMessage.set(
            'Unable to sign in. Please try again.'
          );
        }
      }

    });
  }
}
