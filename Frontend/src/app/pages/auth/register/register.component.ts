import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('passwordConfirm')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  errorMessage = '';
  submitting = false;
  showPassword = false;
  showPasswordConfirm = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', Validators.required]
  }, { validators: passwordsMatchValidator });

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowPasswordConfirm(): void {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  submit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.fullName.invalid) {
        this.errorMessage = 'Ad soyad 2-80 karakter arasında olmalıdır.';
      } else if (this.form.controls.email.invalid) {
        this.errorMessage = 'Lütfen geçerli bir e-posta adresi giriniz.';
      } else if (this.form.controls.password.invalid) {
        this.errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      } else if (this.form.errors?.['passwordMismatch']) {
        this.errorMessage = 'Şifreler eşleşmiyor.';
      } else {
        this.errorMessage = 'Lütfen formdaki tüm alanları doldurunuz.';
      }
      return;
    }

    this.submitting = true;

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res && res.success !== false) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res?.message || 'Kayıt tamamlanamadı.';
        }
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || err?.message || 'Kayıt tamamlanamadı.';
      }
    });
  }
}
