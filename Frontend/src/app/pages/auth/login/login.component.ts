import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MascotMessageComponent } from '../../../shared/components/mascot-message/mascot-message.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  errorMessage = '';
  submitting = false;
  showPassword = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res && res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res?.message || 'E-posta veya şifre hatalı.';
        }
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message ?? 'E-posta veya şifre hatalı.';
      }
    });
  }
}
