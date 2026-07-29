import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of, throwError } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserProfile
} from '../models/auth.model';

export interface MascotAvatarOption {
  id: string;
  name: string;
  image: string;
  icon: string;
}

export const MASCOT_AVATARS: MascotAvatarOption[] = [
  // Rakunlar 🦝
  { id: 'raccoon-focused', name: 'Kararlı Rakun', image: 'assets/characters/raccoon-focused.png', icon: '🦝' },
  { id: 'raccoon-happy', name: 'Neşeli Rakun', image: 'assets/characters/raccoon-happy.png', icon: '🦝' },
  { id: 'raccoon-shocked', name: 'Şaşırmış Rakun', image: 'assets/characters/raccoon-shocked.png', icon: '🦝' },

  // Sincaplar 🐿️
  { id: 'squirrel-calm', name: 'Sakin Sincap', image: 'assets/characters/squirrel-calm.png', icon: '🐿️' },
  { id: 'squirrel-excited', name: 'Heyecanlı Sincap', image: 'assets/characters/squirrel-excited.png', icon: '🐿️' },
  { id: 'squirrel-scared', name: 'Korkmuş Sincap', image: 'assets/characters/squirrel-scared.png', icon: '🐿️' },

  // Kurbağalar 🐸
  { id: 'frog-happy', name: 'Neşeli Kurbağa', image: 'assets/characters/frog-happy.png', icon: '🐸' },
  { id: 'frog-thinking', name: 'Düşünceli Kurbağa', image: 'assets/characters/frog-thinking.png', icon: '🐸' },
  { id: 'frog-combo', name: 'Kombo Kurbağa', image: 'assets/characters/frog-combo.png', icon: '🐸' },
  { id: 'frog-mouth-open', name: 'Şaşkın Kurbağa', image: 'assets/characters/frog-mouth-open.png', icon: '🐸' },

  // Robotlar 🤖
  { id: 'robot-normal', name: 'Normal Robot', image: 'assets/characters/robot-normal.png', icon: '🤖' },
  { id: 'robot-approved', name: 'Onaylı Robot', image: 'assets/characters/robot-approved.png', icon: '🤖' },
  { id: 'robot-working', name: 'Çalışkan Robot', image: 'assets/characters/robot-working.png', icon: '🤖' }
];

const TOKEN_KEY = 'cozyforest_token';
const NAME_KEY = 'cozyforest_fullname';
const EMAIL_KEY = 'cozyforest_email';
const AVATAR_KEY = 'cozyforest_user_avatar';
const LOCAL_TOKEN = 'cozyforest_local_token';

const ACCOUNTS_KEY = 'cozyforest_local_accounts_v1';

interface LocalAccount {
  email: string;
  password?: string;
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = '/api/auth';

  currentUserName = signal<string | null>(localStorage.getItem(NAME_KEY) || 'Orman Sakini');
  currentAvatar = signal<string>(localStorage.getItem(AVATAR_KEY) || 'raccoon-focused');

  setAvatar(avatarId: string): void {
    localStorage.setItem(AVATAR_KEY, avatarId);
    this.currentAvatar.set(avatarId);
  }

  getAvatarInfo(): MascotAvatarOption {
    const id = this.currentAvatar();
    return MASCOT_AVATARS.find(a => a.id === id) 
        || MASCOT_AVATARS.find(a => a.id.startsWith(id)) 
        || MASCOT_AVATARS[0];
  }

  private getLocalAccounts(): LocalAccount[] {
    try {
      const json = localStorage.getItem(ACCOUNTS_KEY);
      if (!json) return [];
      return JSON.parse(json) as LocalAccount[];
    } catch {
      return [];
    }
  }

  private saveLocalAccount(email: string, password?: string, fullName?: string): void {
    const accounts = this.getLocalAccounts();
    const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) {
      if (password) accounts[idx].password = password;
      if (fullName) accounts[idx].fullName = fullName;
    } else {
      accounts.push({ email, password, fullName: fullName || email.split('@')[0] });
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  private updateLocalPassword(email: string, newPassword: string): void {
    this.saveLocalAccount(email, newPassword);
  }

  register(dto: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/register`, dto).pipe(
      tap((res) => {
        if (res?.data) {
          this.storeSession(res.data);
          this.saveLocalAccount(dto.email, dto.password, dto.fullName);
        }
      }),
      catchError((err) => {
        if (err.status !== 0) {
          return throwError(() => err);
        }
        const data: AuthResponse = {
          token: LOCAL_TOKEN,
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
          fullName: dto.fullName || 'Orman Sakini',
          email: dto.email
        };
        this.saveLocalAccount(dto.email, dto.password, dto.fullName);
        this.storeSession(data);
        return of({ success: true, message: 'Kayıt başarılı! 🌲', data });
      })
    );
  }

  login(dto: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, dto).pipe(
      tap((res) => {
        if (res?.data) {
          this.storeSession(res.data);
          this.saveLocalAccount(dto.email, dto.password, res.data.fullName);
        }
      }),
      catchError((err) => {
        if (err.status !== 0) {
          return throwError(() => err);
        }
        const accounts = this.getLocalAccounts();
        const acc = accounts.find(a => a.email.toLowerCase() === dto.email.toLowerCase().trim());
        if (acc && acc.password && acc.password !== dto.password) {
          return throwError(() => ({ error: { message: 'E-posta veya şifre hatalı.' } }));
        }

        const data: AuthResponse = {
          token: LOCAL_TOKEN,
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
          fullName: acc?.fullName || (dto.email ? dto.email.split('@')[0] : 'Orman Sakini'),
          email: dto.email
        };
        this.saveLocalAccount(dto.email, dto.password);
        this.storeSession(data);
        return of({ success: true, message: 'Giriş başarılı! 🌲', data });
      })
    );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.baseUrl}/profile`).pipe(
      map(res => res.data),
      catchError(() => of({
        id: 1,
        fullName: localStorage.getItem(NAME_KEY) || 'Orman Sakini',
        email: localStorage.getItem(EMAIL_KEY) || 'orman@cozy.com'
      }))
    );
  }

  updateProfile(dto: UpdateProfileRequest): Observable<ApiResponse<UserProfile>> {
    return this.http.put<ApiResponse<UserProfile>>(`${this.baseUrl}/profile`, dto).pipe(
      tap((res) => {
        if (res?.data) {
          localStorage.setItem(NAME_KEY, res.data.fullName);
          localStorage.setItem(EMAIL_KEY, res.data.email);
          this.currentUserName.set(res.data.fullName);
          this.saveLocalAccount(res.data.email, undefined, res.data.fullName);
        }
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        localStorage.setItem(NAME_KEY, dto.fullName);
        localStorage.setItem(EMAIL_KEY, dto.email);
        this.currentUserName.set(dto.fullName);
        this.saveLocalAccount(dto.email, undefined, dto.fullName);
        const profile: UserProfile = { id: 1, fullName: dto.fullName, email: dto.email };
        return of({ success: true, message: 'Profil başarıyla güncellendi. ✨', data: profile });
      })
    );
  }

  changePassword(dto: ChangePasswordRequest): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${this.baseUrl}/password`, dto).pipe(
      tap(() => {
        const email = localStorage.getItem(EMAIL_KEY);
        if (email) {
          this.updateLocalPassword(email, dto.newPassword);
        }
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const email = localStorage.getItem(EMAIL_KEY);
        if (email) {
          this.updateLocalPassword(email, dto.newPassword);
        }
        return of({ success: true, message: 'Şifreniz başarıyla güncellendi. 🔑', data: {} });
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    this.currentUserName.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  private storeSession(data: AuthResponse): void {
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data.fullName) localStorage.setItem(NAME_KEY, data.fullName);
    if (data.email) localStorage.setItem(EMAIL_KEY, data.email);
    this.currentUserName.set(data.fullName || null);
  }
}