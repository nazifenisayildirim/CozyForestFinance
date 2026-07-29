import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { CategoryStat, MonthlyStat, StatisticsSummary } from '../models/statistics.model';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private http = inject(HttpClient);
  private transactionService = inject(TransactionService);
  private baseUrl = '/api/statistics';

  getSummary(months = 6): Observable<StatisticsSummary> {
    const params = new HttpParams().set('months', months);
    return this.http.get<ApiResponse<StatisticsSummary>>(`${this.baseUrl}/summary`, { params }).pipe(
      map(res => {
        if (res?.data) return res.data;
        return this.computeLocalSummary(months);
      }),
      catchError(() => of(this.computeLocalSummary(months)))
    );
  }

  private computeLocalSummary(months = 6): StatisticsSummary {
    const transactions = this.transactionService.getLocalTransactions();

    const now = new Date();
    const monthly: MonthlyStat[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const monthTx = transactions.filter(t => {
        if (!t.transactionDate) return false;
        const tDate = new Date(t.transactionDate);
        return tDate.getFullYear() === year && (tDate.getMonth() + 1) === month;
      });

      const totalIncome = monthTx
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = monthTx
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      monthly.push({ year, month, totalIncome, totalExpense });
    }

    const expenseTx = transactions.filter(t => t.type === 'Expense');
    const totalExpenseSum = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const catMap = new Map<number, { categoryId: number; categoryName: string; totalAmount: number }>();

    for (const t of expenseTx) {
      const catId = t.categoryId || 0;
      const catName = t.categoryName || 'Diğer';
      const existing = catMap.get(catId) || { categoryId: catId, categoryName: catName, totalAmount: 0 };
      existing.totalAmount += Number(t.amount);
      catMap.set(catId, existing);
    }

    const categoryBreakdown: CategoryStat[] = Array.from(catMap.values())
      .map(item => ({
        ...item,
        percent: totalExpenseSum === 0 ? 0 : Math.round((item.totalAmount / totalExpenseSum) * 100 * 10) / 10
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const incomeTx = transactions.filter(t => t.type === 'Income');
    const totalIncomeSum = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
    const incCatMap = new Map<number, { categoryId: number; categoryName: string; totalAmount: number }>();

    for (const t of incomeTx) {
      const catId = t.categoryId || 0;
      const catName = t.categoryName || 'Diğer';
      const existing = incCatMap.get(catId) || { categoryId: catId, categoryName: catName, totalAmount: 0 };
      existing.totalAmount += Number(t.amount);
      incCatMap.set(catId, existing);
    }

    const incomeCategoryBreakdown: CategoryStat[] = Array.from(incCatMap.values())
      .map(item => ({
        ...item,
        percent: totalIncomeSum === 0 ? 0 : Math.round((item.totalAmount / totalIncomeSum) * 100 * 10) / 10
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const currentMonthStat = monthly[monthly.length - 1];
    const previousMonthStat = monthly.length > 1 ? monthly[monthly.length - 2] : null;

    const currentMonthSavings = currentMonthStat
      ? currentMonthStat.totalIncome - currentMonthStat.totalExpense
      : 0;

    const previousMonthSavings = previousMonthStat
      ? previousMonthStat.totalIncome - previousMonthStat.totalExpense
      : 0;

    const topExpenseCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].categoryName : null;

    return {
      monthly,
      categoryBreakdown,
      incomeCategoryBreakdown,
      currentMonthSavings,
      previousMonthSavings,
      topExpenseCategory
    };
  }
}

