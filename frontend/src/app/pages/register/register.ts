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
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';


@Component({
  selector: 'app-register',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  submitting = signal(false);
  errorMessage = signal('');


  registerForm = new FormGroup({

    name: new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.maxLength(100)
        ]
      }
    ),

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
          Validators.required,
          Validators.minLength(8)
        ]
      }
    ),

    confirmPassword: new FormControl(
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
    private router: Router
  ) {}


  submit() {

    if (
      this.registerForm.invalid ||
      this.submitting()
    ) {

      this.registerForm.markAllAsTouched();
      return;
    }


    const values =
      this.registerForm.getRawValue();


    if (
      values.password !==
      values.confirmPassword
    ) {

      this.errorMessage.set(
        'Passwords do not match.'
      );

      return;
    }


    this.submitting.set(true);
    this.errorMessage.set('');


    this.authService.register({

      name: values.name.trim(),

      email: values.email.trim(),

      password: values.password,

      confirmPassword:
        values.confirmPassword

    })
    .subscribe({

      next: () => {

        this.submitting.set(false);

        this.router.navigate(
          ['/login'],
          {
            queryParams: {
              registered: 'true'
            }
          }
        );
      },

      error: error => {

        this.submitting.set(false);

        if (error.status === 400) {

          this.errorMessage.set(
            typeof error.error === 'string'
              ? error.error
              : 'Registration failed.'
          );

        } else {

          this.errorMessage.set(
            'Unable to create account. Please try again.'
          );
        }
      }

    });
  }
}
