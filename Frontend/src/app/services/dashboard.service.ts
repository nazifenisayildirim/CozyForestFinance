import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { DashboardSummary } from '../models/dashboard.model';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private transactionService = inject(TransactionService);
  private baseUrl = '/api/dashboard';

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.baseUrl}/summary`).pipe(
      map(res => {
        if (res?.data) {
          const sortedRecent = [...(res.data.recentTransactions || [])].sort((a, b) => {
            const timeA = new Date(a.transactionDate).getTime();
            const timeB = new Date(b.transactionDate).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.id - a.id;
          });
          return {
            ...res.data,
            recentTransactions: sortedRecent
          };
        }
        return this.computeLocalSummary();
      }),
      catchError(() => of(this.computeLocalSummary()))
    );
  }

  private computeLocalSummary(): DashboardSummary {
    const list = this.transactionService.getLocalTransactions();
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of list) {
      if (t.type === 'Income') {
        totalIncome += Number(t.amount);
      } else {
        totalExpense += Number(t.amount);
      }
    }

    const sortedList = [...list].sort((a, b) => {
      const timeA = new Date(a.transactionDate).getTime();
      const timeB = new Date(b.transactionDate).getTime();
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id - a.id;
    });

    const balance = totalIncome - totalExpense;
    const recentTransactions = sortedList.slice(0, 8);

    return {
      totalIncome,
      totalExpense,
      balance,
      recentTransactions
    };
  }
}
