import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, MASCOT_AVATARS, MascotAvatarOption } from '../../services/auth.service';
import { MascotMessageComponent, RobotMood } from '../../shared/components/mascot-message/mascot-message.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MascotMessageComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loading = false;
  robotMood: RobotMood = 'normal';
  robotMessage = 'Profilini ve hesap güvenliğini buradan yönetebilirsin. 🤖';
  mascotAvatars = MASCOT_AVATARS;

  get currentAvatarId(): string {
    return this.authService.currentAvatar();
  }

  get currentAvatarInfo(): MascotAvatarOption {
    return this.authService.getAvatarInfo();
  }

  selectAvatar(avatarId: string): void {
    this.authService.setAvatar(avatarId);
    const info = this.authService.getAvatarInfo();
    this.robotMood = 'approved';
    this.robotMessage = `Profil avatarın '${info.name}' ${info.icon} olarak değiştirildi! ✨`;
  }

  profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPasswordConfirm: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loading = true;
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.profileForm.setValue({
          fullName: profile.fullName ?? '',
          email: profile.email ?? ''
        });
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.robotMood = 'normal';
        this.robotMessage = err?.error?.message ?? 'Profil bilgileri yüklenemedi. Backend çalışıyor mu ve oturumun geçerli mi kontrol et.';
      }
    });
  }

 saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.robotMood = 'working';
    this.robotMessage = 'Değişiklikler kaydediliyor…';

    this.authService.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: (res) => {
        this.robotMood = 'approved';
        this.robotMessage = res.message ?? 'Profil bilgileriniz başarıyla kaydedildi. ✨';
      },
      error: (err) => {
        this.robotMood = 'normal';
        this.robotMessage = err?.error?.message ?? 'Profil kaydedilemedi.';
      }
    });
}

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.robotMood = 'normal';
      if (this.passwordForm.controls.newPassword.errors?.['minlength']) {
        this.robotMessage = 'Yeni şifre en az 6 karakter olmalıdır.';
      } else {
        this.robotMessage = 'Lütfen şifre alanlarını eksiksiz doldurunuz.';
      }
      return;
    }

    const raw = this.passwordForm.getRawValue();

    if (raw.newPassword !== raw.newPasswordConfirm) {
      this.robotMood = 'normal';
      this.robotMessage = 'Yeni şifreler birbiriyle eşleşmiyor!';
      return;
    }

    this.robotMood = 'working';
    this.robotMessage = 'Şifre güncelleniyor…';

    this.authService.changePassword(raw).subscribe({
      next: (res) => {
        this.robotMood = 'approved';
        this.robotMessage = res.message ?? 'Şifreniz başarıyla güncellendi. 🔑';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.robotMood = 'normal';
        this.robotMessage = err?.error?.message ?? err?.message ?? 'Şifre güncellenemedi.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  bankruptQuotes = [
    'Öyle hemen pes etmek yok! 🦝 Orman Sakini gerekirse palamut yer ama iflas etmez! 🐿️💪',
    'İflas talebiniz Orman Meclisi tarafından reddedildi! 🚫 Bütçeni toplamaya devam! 🌲',
    '🚨 ACİL İFLAS DÜĞMESİNE BASTIN! Ama şansına bu buton sadece süs! 😂 Çabuk birikim yapmaya dön! 🌰',
    'Rakun ve Sincap iflas bayrağını indirdi! 🚩 "Pes etmiyoruz!" dediler. 🤖🔥'
  ];

  triggerBankrupt(): void {
    const randomQuote = this.bankruptQuotes[Math.floor(Math.random() * this.bankruptQuotes.length)];
    this.robotMood = 'normal';
    this.robotMessage = randomQuote;
  }
}
