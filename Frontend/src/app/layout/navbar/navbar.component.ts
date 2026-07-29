import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dashboardService = inject(DashboardService);
  private transactionService = inject(TransactionService);

  currentBalance: number = 0;
  private sub?: Subscription;

  adviceIndex = 0;
  readonly advices = [
    'Küçük harcamaları düzenli kaydetmek, ay sonunda büyük fark yaratır. 💡',
    'Bugün küçük bir tasarruf, yarın büyük bir hedefe dönüşebilir. İlk adımı atmayı unutma!🐿️',
    'Bir satın alma öncesinde gerçekten ihtiyaç olup olmadığını düşün. 🤔',
    'Haftada bir kez raporlarını incelemek alışkanlıklarını fark ettirir. 📊',
    'Gelir geldiğinde küçük bir kısmını önce tasarrufa ayırmayı dene. 💰'
  ];

  links = [
    { path: '/dashboard', label: 'Ana Sayfa', icon: '🏠' },
    { path: '/transactions', label: 'İşlemler', icon: '🦝' },
    { path: '/goals', label: 'Hedefler', icon: '🐿️' },
    { path: '/statistics', label: 'İstatistikler', icon: '🐸' },
    { path: '/categories', label: 'Kategoriler', icon: '🌳' },
    { path: '/settings', label: 'Ayarlar', icon: '🤖' }
  ];

  formattedDate = '';
  dayName = '';

  ngOnInit(): void {
    this.updateCurrentDate();
    this.loadBalance();
    this.sub = this.transactionService.transactionsChanged$.subscribe(() => {
      this.loadBalance();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadBalance(): void {
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.currentBalance = data ? data.balance : 0;
      },
      error: () => {
        const list = this.transactionService.getLocalTransactions();
        let totalIncome = 0;
        let totalExpense = 0;
        for (const t of list) {
          if (t.type === 'Income') totalIncome += Number(t.amount);
          else totalExpense += Number(t.amount);
        }
        this.currentBalance = totalIncome - totalExpense;
      }
    });
  }

  private updateCurrentDate(): void {
    const now = new Date();
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const days = [
      'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
    ];

    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    this.dayName = days[now.getDay()];

    this.formattedDate = `${day} ${month} ${year}`;
  }

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated;
  }

  get userName(): string | null {
    return this.auth.currentUserName();
  }

  get currentAvatarInfo() {
    return this.auth.getAvatarInfo();
  }

  get guideAdvice(): string {
    return this.advices[this.adviceIndex];
  }

  nextAdvice(): void {
    this.adviceIndex = (this.adviceIndex + 1) % this.advices.length;
  }

  onAddIncomeClick(): void {
    this.router.navigate(['/transactions'], { queryParams: { type: 'Income', openModal: 'true' } });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
