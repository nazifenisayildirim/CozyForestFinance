import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { Goal, GoalCreate, GoalUpdateAmount } from '../models/goal.model';

const STORAGE_KEY = 'cozyforest_goals_v4';

const INITIAL_GOALS: Goal[] = [
  { id: 1, name: 'Acil Durum Fonu 🛡️', targetAmount: 25000, currentAmount: 18500, isCompleted: false, progressPercent: 74, dueDate: '2026-12-31' },
  { id: 2, name: 'Tatil & Doğa Kampı Bütçesi ⛺', targetAmount: 12000, currentAmount: 8000, isCompleted: false, progressPercent: 67, dueDate: '2026-09-15' }
];

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http = inject(HttpClient);
  private baseUrl = '/api/goals';

  public goalsChanged$ = new Subject<void>();

  private notifyChange(): void {
    this.goalsChanged$.next();
  }

  getLocalGoals(): Goal[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GOALS));
      return INITIAL_GOALS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_GOALS;
    }
  }

  saveLocalGoals(goals: Goal[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }

  getAll(): Observable<Goal[]> {
    return this.http.get<ApiResponse<Goal[]>>(this.baseUrl).pipe(
      map(res => {
        if (res?.data) {
          this.saveLocalGoals(res.data);
          return res.data;
        }
        return this.getLocalGoals();
      }),
      catchError(() => of(this.getLocalGoals()))
    );
  }

  create(dto: GoalCreate): Observable<ApiResponse<Goal>> {
    return this.http.post<ApiResponse<Goal>>(this.baseUrl, dto).pipe(
      map(res => {
        if (res?.data) {
          const goals = this.getLocalGoals();
          const existingIdx = goals.findIndex(g => g.id === res.data.id);
          if (existingIdx === -1) {
            goals.unshift(res.data);
          } else {
            goals[existingIdx] = res.data;
          }
          this.saveLocalGoals(goals);
        }
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const goals = this.getLocalGoals();
        const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
        const progressPercent = Math.min(100, Math.round((dto.currentAmount / dto.targetAmount) * 100));
        const newGoal: Goal = {
          id: newId,
          name: dto.name,
          targetAmount: dto.targetAmount,
          currentAmount: dto.currentAmount,
          dueDate: dto.dueDate || null,
          isCompleted: dto.currentAmount >= dto.targetAmount,
          progressPercent
        };
        goals.unshift(newGoal);
        this.saveLocalGoals(goals);
        this.notifyChange();

        const res: ApiResponse<Goal> = {
          success: true,
          message: 'Yeni hedef başarıyla eklendi! 🐿️',
          data: newGoal
        };
        return of(res);
      })
    );
  }

  updateAmount(id: number, dto: GoalUpdateAmount): Observable<ApiResponse<Goal>> {
    return this.http.put<ApiResponse<Goal>>(`${this.baseUrl}/${id}/amount`, dto).pipe(
      map(res => {
        if (res?.data) {
          const goals = this.getLocalGoals();
          const idx = goals.findIndex(g => g.id === id);
          if (idx !== -1) {
            goals[idx] = res.data;
            this.saveLocalGoals(goals);
          }
        }
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const goals = this.getLocalGoals();
        const idx = goals.findIndex(g => g.id === id);
        if (idx !== -1) {
          goals[idx].currentAmount = dto.currentAmount;
          goals[idx].progressPercent = Math.min(100, Math.round((goals[idx].currentAmount / goals[idx].targetAmount) * 100));
          goals[idx].isCompleted = goals[idx].currentAmount >= goals[idx].targetAmount;
          this.saveLocalGoals(goals);
          this.notifyChange();
          const res: ApiResponse<Goal> = {
            success: true,
            message: goals[idx].isCompleted ? 'Tebrikler! Hedefine ulaştın! 🎉' : 'Hedefine bir adım daha yaklaştın. 🐿️',
            data: goals[idx]
          };
          return of(res);
        }
        const errRes: ApiResponse<Goal> = { success: false, message: 'Hedef bulunamadı.', data: null as any };
        return of(errRes);
      })
    );
  }

  delete(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.baseUrl}/${id}`).pipe(
      map(res => {
        const goals = this.getLocalGoals().filter(g => g.id !== id);
        this.saveLocalGoals(goals);
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const goals = this.getLocalGoals().filter(g => g.id !== id);
        this.saveLocalGoals(goals);
        this.notifyChange();
        const res: ApiResponse<object> = { success: true, message: 'Hedef silindi.', data: {} };
        return of(res);
      })
    );
  }
}