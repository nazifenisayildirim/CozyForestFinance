import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StatisticsService } from '../../services/statistics.service';
import { TransactionService } from '../../services/transaction.service';
import { CategoryStat, StatisticsSummary } from '../../models/statistics.model';
import { MascotMessageComponent, FrogMood } from '../../shared/components/mascot-message/mascot-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

const MONTH_NAMES_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

export interface MonthOption {
  value: number;
  label: string;
}

const MONTH_OPTIONS: MonthOption[] = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' }
];

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, MascotMessageComponent, EmptyStateComponent],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit, OnDestroy {
  private statisticsService = inject(StatisticsService);
  private transactionService = inject(TransactionService);

  summary: StatisticsSummary | null = null;
  loading = true;

  frogMood: FrogMood = 'thinking';
  frogMessage = 'Daha fazla işlem eklediğinde analiz netleşecek.';

  // Month & Year dropdown filters (Independent for Income and Expense)
  months = MONTH_OPTIONS;
  years: number[] = [];

  selectedIncomeMonth: number = new Date().getMonth() + 1;
  selectedIncomeYear: number = new Date().getFullYear();

  selectedExpenseMonth: number = new Date().getMonth() + 1;
  selectedExpenseYear: number = new Date().getFullYear();

  filteredCategoryBreakdown: CategoryStat[] = [];
  periodTotalExpense: number = 0;

  filteredIncomeCategoryBreakdown: CategoryStat[] = [];
  periodTotalIncome: number = 0;

  private sub?: Subscription;

  ngOnInit(): void {
    this.initMonthYearOptions();
    this.load();
    this.sub = this.transactionService.transactionsChanged$.subscribe(() => {
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get generalIncomeBreakdown(): CategoryStat[] {
    if (this.summary?.incomeCategoryBreakdown && this.summary.incomeCategoryBreakdown.length > 0) {
      return this.summary.incomeCategoryBreakdown;
    }
    const transactions = this.transactionService.getLocalTransactions();
    const incomeTx = transactions.filter(t => t.type === 'Income');
    const totalSum = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const catMap = new Map<number, { categoryId: number; categoryName: string; totalAmount: number }>();
    for (const t of incomeTx) {
      const catId = t.categoryId || 0;
      const catName = t.categoryName || 'Diğer';
      const existing = catMap.get(catId) || { categoryId: catId, categoryName: catName, totalAmount: 0 };
      existing.totalAmount += Number(t.amount);
      catMap.set(catId, existing);
    }

    return Array.from(catMap.values())
      .map(item => ({
        ...item,
        percent: totalSum === 0 ? 0 : Math.round((item.totalAmount / totalSum) * 100 * 10) / 10
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private initMonthYearOptions(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    this.years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    this.selectedIncomeMonth = currentMonth;
    this.selectedIncomeYear = currentYear;
    this.selectedExpenseMonth = currentMonth;
    this.selectedExpenseYear = currentYear;
  }

  load(): void {
    this.loading = true;
    this.statisticsService.getSummary(6).subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
        this.updateFrogFeedback(data);
        this.computeFilteredBreakdown();
      },
      error: () => {
        this.loading = false;
        this.frogMood = 'mouth-open';
        this.frogMessage = 'İstatistikler şu anda yüklenemedi.';
        this.computeFilteredBreakdown();
      }
    });
  }

  onIncomeFilterChange(): void {
    this.computeIncomeBreakdown();
  }

  onExpenseFilterChange(): void {
    this.computeExpenseBreakdown();
  }

  computeFilteredBreakdown(): void {
    this.computeExpenseBreakdown();
    this.computeIncomeBreakdown();
  }

  computeExpenseBreakdown(): void {
    const transactions = this.transactionService.getLocalTransactions();
    const year = Number(this.selectedExpenseYear);
    const month = Number(this.selectedExpenseMonth);

    let expenseTx = transactions.filter(t => {
      if (t.type !== 'Expense' || !t.transactionDate) return false;
      const d = new Date(t.transactionDate);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    this.periodTotalExpense = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const expCatMap = new Map<number, { categoryId: number; categoryName: string; totalAmount: number }>();
    for (const t of expenseTx) {
      const catId = t.categoryId || 0;
      const catName = t.categoryName || 'Diğer';
      const existing = expCatMap.get(catId) || { categoryId: catId, categoryName: catName, totalAmount: 0 };
      existing.totalAmount += Number(t.amount);
      expCatMap.set(catId, existing);
    }

    this.filteredCategoryBreakdown = Array.from(expCatMap.values())
      .map(item => ({
        ...item,
        percent: this.periodTotalExpense === 0 ? 0 : Math.round((item.totalAmount / this.periodTotalExpense) * 100 * 10) / 10
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  computeIncomeBreakdown(): void {
    const transactions = this.transactionService.getLocalTransactions();
    const year = Number(this.selectedIncomeYear);
    const month = Number(this.selectedIncomeMonth);

    let incomeTx = transactions.filter(t => {
      if (t.type !== 'Income' || !t.transactionDate) return false;
      const d = new Date(t.transactionDate);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    this.periodTotalIncome = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const incCatMap = new Map<number, { categoryId: number; categoryName: string; totalAmount: number }>();
    for (const t of incomeTx) {
      const catId = t.categoryId || 0;
      const catName = t.categoryName || 'Diğer';
      const existing = incCatMap.get(catId) || { categoryId: catId, categoryName: catName, totalAmount: 0 };
      existing.totalAmount += Number(t.amount);
      incCatMap.set(catId, existing);
    }

    this.filteredIncomeCategoryBreakdown = Array.from(incCatMap.values())
      .map(item => ({
        ...item,
        percent: this.periodTotalIncome === 0 ? 0 : Math.round((item.totalAmount / this.periodTotalIncome) * 100 * 10) / 10
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  monthLabel(year: number, month: number): string {
    return `${MONTH_NAMES_TR[month - 1]} ${String(year).slice(2)}`;
  }

  get maxMonthlyValue(): number {
    if (!this.summary) return 1;
    const values = this.summary.monthly.flatMap(m => [m.totalIncome, m.totalExpense]);
    return Math.max(1, ...values);
  }

  barHeight(value: number): number {
    return Math.round((value / this.maxMonthlyValue) * 100);
  }

  private updateFrogFeedback(data: StatisticsSummary): void {
    const transactions = this.transactionService.getLocalTransactions();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    const curMonthTx = transactions.filter(t => {
      if (!t.transactionDate) return false;
      const d = new Date(t.transactionDate);
      return d.getFullYear() === curYear && (d.getMonth() + 1) === curMonth;
    });

    const prevMonthTx = transactions.filter(t => {
      if (!t.transactionDate) return false;
      const d = new Date(t.transactionDate);
      return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
    });

    const hasEnoughData = curMonthTx.length > 0 || prevMonthTx.length > 0;
    if (!hasEnoughData) {
      this.frogMood = 'thinking';
      this.frogMessage = 'İstatistiklerini ve harcama grafiklerini derin derin inceliyorum... 🐸🧠';
      return;
    }

    const getCatExpenses = (txList: typeof transactions) => {
      const map = new Map<string, number>();
      for (const t of txList) {
        if (t.type === 'Expense') {
          const cat = t.categoryName || 'Diğer';
          map.set(cat, (map.get(cat) || 0) + Number(t.amount));
        }
      }
      return map;
    };

    const curCatMap = getCatExpenses(curMonthTx);
    const prevCatMap = getCatExpenses(prevMonthTx);

    let maxChangeCat: string | null = null;
    let maxChangeVal = 0;
    let isIncrease = false;

    const allCats = new Set([...curCatMap.keys(), ...prevCatMap.keys()]);
    for (const cat of allCats) {
      const curAmt = curCatMap.get(cat) || 0;
      const prevAmt = prevCatMap.get(cat) || 0;
      const diff = curAmt - prevAmt;
      if (Math.abs(diff) > maxChangeVal && Math.abs(diff) >= 300) {
        maxChangeVal = Math.abs(diff);
        maxChangeCat = cat;
        isIncrease = diff > 0;
      }
    }

    const curSavings = data.currentMonthSavings;
    const prevSavings = data.previousMonthSavings;

    // Combo Condition: Savings increased AND (expenses reduced OR no major increase)
    if (curSavings > prevSavings && (!isIncrease || !maxChangeCat)) {
      this.frogMood = 'combo';
      this.frogMessage = 'EFSANEVİ KOMBO! ⚡🐸 Tasarrufunu artırdın ve bütçeyi harika yönettin! Şampiyon Kurbağa Modu! 🏆🔥';
    } else if (maxChangeCat && maxChangeVal >= 300) {
      if (isIncrease) {
        this.frogMood = 'mouth-open';
        this.frogMessage = `Ağzım açık kaldı! Bu ay ${maxChangeCat} harcaman geçen aya göre arttı. 🐸😮`;
      } else {
        this.frogMood = 'combo';
        this.frogMessage = `HARİKA KOMBO! ⚡🐸 Bu ay ${maxChangeCat} harcamanı geçen aya göre düşürdün, tebrikler! 🏆✨`;
      }
    } else if (curSavings > prevSavings) {
      this.frogMood = 'happy';
      this.frogMessage = 'Geçen aya göre tasarrufun arttı, harika gidiyorsun! 🌲🐸';
    } else if (curSavings >= 0) {
      this.frogMood = 'happy';
      this.frogMessage = 'Bu ay dengeli ilerliyorsun, finansal durumun stabil. 🐸👍';
    } else {
      this.frogMood = 'thinking';
      this.frogMessage = 'Hımm... Bu ay giderlerin gelirini aştı, verileri derinlemesine inceliyorum... 🐸🧐';
    }
  }
}
