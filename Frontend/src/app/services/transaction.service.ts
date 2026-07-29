import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import {
  PagedResult,
  Transaction,
  TransactionCreate,
  TransactionDetail,
  TransactionFilter,
  TransactionUpdate
} from '../models/transaction.model';
import { CategoryService } from './category.service';

const STORAGE_KEY = 'cozyforest_transactions_v5';

const INITIAL_TRANSACTIONS: TransactionDetail[] = [
  // Temmuz 2026
  { id: 30, categoryId: 1, amount: 28500, type: 'Income', categoryName: 'Maaş', transactionDate: '2026-07-01T09:00:00Z', description: 'Temmuz Ayı Maaş Ödemesi 💼', createdDate: '2026-07-01T09:00:00Z' },
  { id: 29, categoryId: 4, amount: 11000, type: 'Expense', categoryName: 'Kira', transactionDate: '2026-07-02T10:00:00Z', description: 'Temmuz Ayı Ev Kirası 🏠', createdDate: '2026-07-02T10:00:00Z' },
  { id: 28, categoryId: 3, amount: 4250, type: 'Expense', categoryName: 'Market', transactionDate: '2026-07-08T14:00:00Z', description: 'Temmuz Ayı Mutfak & Market Alışverişi 🛒', createdDate: '2026-07-08T14:00:00Z' },
  { id: 27, categoryId: 2, amount: 3500, type: 'Income', categoryName: 'Ek Gelir', transactionDate: '2026-07-15T11:00:00Z', description: 'Serbest Proje Kazancı 🪙', createdDate: '2026-07-15T11:00:00Z' },
  { id: 26, categoryId: 5, amount: 1450, type: 'Expense', categoryName: 'Ulaşım', transactionDate: '2026-07-18T16:00:00Z', description: 'Aylık Yol & Akaryakıt 🚗', createdDate: '2026-07-18T16:00:00Z' },
  { id: 25, categoryId: 6, amount: 2300, type: 'Expense', categoryName: 'Eğlence', transactionDate: '2026-07-22T19:00:00Z', description: 'Hafta Sonu Etkinlikleri & Sinema 🍿', createdDate: '2026-07-22T19:00:00Z' },

  // Haziran 2026
  { id: 24, categoryId: 1, amount: 28500, type: 'Income', categoryName: 'Maaş', transactionDate: '2026-06-01T09:00:00Z', description: 'Haziran Ayı Maaş Ödemesi 💼', createdDate: '2026-06-01T09:00:00Z' },
  { id: 23, categoryId: 4, amount: 11000, type: 'Expense', categoryName: 'Kira', transactionDate: '2026-06-02T10:00:00Z', description: 'Haziran Ayı Ev Kirası 🏠', createdDate: '2026-06-02T10:00:00Z' },
  { id: 22, categoryId: 3, amount: 3950, type: 'Expense', categoryName: 'Market', transactionDate: '2026-06-07T14:00:00Z', description: 'Haziran Ayı Mutfak Alışverişi 🛒', createdDate: '2026-06-07T14:00:00Z' },
  { id: 21, categoryId: 2, amount: 3200, type: 'Income', categoryName: 'Ek Gelir', transactionDate: '2026-06-15T11:00:00Z', description: 'Ekstra Yazılım Tasarım İşi 🪙', createdDate: '2026-06-15T11:00:00Z' },
  { id: 20, categoryId: 5, amount: 1380, type: 'Expense', categoryName: 'Ulaşım', transactionDate: '2026-06-17T15:00:00Z', description: 'Toplu Taşıma & Yol Masrafları 🚌', createdDate: '2026-06-17T15:00:00Z' },
  { id: 19, categoryId: 6, amount: 2100, type: 'Expense', categoryName: 'Eğlence', transactionDate: '2026-06-24T20:00:00Z', description: 'Konser & Arkadaş Buluşması 🎸', createdDate: '2026-06-24T20:00:00Z' },

  // Mayıs 2026
  { id: 18, categoryId: 1, amount: 28500, type: 'Income', categoryName: 'Maaş', transactionDate: '2026-05-01T09:00:00Z', description: 'Mayıs Ayı Maaş Ödemesi 💼', createdDate: '2026-05-01T09:00:00Z' },
  { id: 17, categoryId: 4, amount: 11000, type: 'Expense', categoryName: 'Kira', transactionDate: '2026-05-02T10:00:00Z', description: 'Mayıs Ayı Ev Kirası 🏠', createdDate: '2026-05-02T10:00:00Z' },
  { id: 16, categoryId: 3, amount: 4100, type: 'Expense', categoryName: 'Market', transactionDate: '2026-05-09T13:00:00Z', description: 'Mayıs Ayı Gıda & Market 🛒', createdDate: '2026-05-09T13:00:00Z' },
  { id: 15, categoryId: 2, amount: 4000, type: 'Income', categoryName: 'Ek Gelir', transactionDate: '2026-05-15T11:00:00Z', description: 'Bahar Proje Primi 🌸', createdDate: '2026-05-15T11:00:00Z' },
  { id: 14, categoryId: 5, amount: 1250, type: 'Expense', categoryName: 'Ulaşım', transactionDate: '2026-05-19T14:00:00Z', description: 'Şehir İçi İki Yönlü Ulaşım 🚗', createdDate: '2026-05-19T14:00:00Z' },
  { id: 13, categoryId: 6, amount: 1950, type: 'Expense', categoryName: 'Eğlence', transactionDate: '2026-05-23T18:00:00Z', description: 'Doğa Yürüyüşü & Kafe 🌲', createdDate: '2026-05-23T18:00:00Z' },

  // Nisan 2026
  { id: 12, categoryId: 1, amount: 28500, type: 'Income', categoryName: 'Maaş', transactionDate: '2026-04-01T09:00:00Z', description: 'Nisan Ayı Maaş Ödemesi 💼', createdDate: '2026-04-01T09:00:00Z' },
  { id: 11, categoryId: 4, amount: 11000, type: 'Expense', categoryName: 'Kira', transactionDate: '2026-04-02T10:00:00Z', description: 'Nisan Ayı Ev Kirası 🏠', createdDate: '2026-04-02T10:00:00Z' },
  { id: 10, categoryId: 3, amount: 3800, type: 'Expense', categoryName: 'Market', transactionDate: '2026-04-10T14:00:00Z', description: 'Nisan Ayı Ev Temel İhtiyaçlar 🛒', createdDate: '2026-04-10T14:00:00Z' },
  { id: 9, categoryId: 2, amount: 2800, type: 'Income', categoryName: 'Ek Gelir', transactionDate: '2026-04-15T11:00:00Z', description: 'Serbest Makale & İçerik Üretimi ✍️', createdDate: '2026-04-15T11:00:00Z' },
  { id: 8, categoryId: 5, amount: 1100, type: 'Expense', categoryName: 'Ulaşım', transactionDate: '2026-04-18T12:00:00Z', description: 'Aylık Akbil & Seyahat 🚌', createdDate: '2026-04-18T12:00:00Z' },
  { id: 7, categoryId: 6, amount: 1750, type: 'Expense', categoryName: 'Eğlence', transactionDate: '2026-04-25T17:00:00Z', description: 'Tiyatro & Akşam Yemeği 🎭', createdDate: '2026-04-25T17:00:00Z' },

  // Mart 2026
  { id: 6, categoryId: 1, amount: 28500, type: 'Income', categoryName: 'Maaş', transactionDate: '2026-03-01T09:00:00Z', description: 'Mart Ayı Maaş Ödemesi 💼', createdDate: '2026-03-01T09:00:00Z' },
  { id: 5, categoryId: 4, amount: 11000, type: 'Expense', categoryName: 'Kira', transactionDate: '2026-03-02T10:00:00Z', description: 'Mart Ayı Ev Kirası 🏠', createdDate: '2026-03-02T10:00:00Z' },
  { id: 4, categoryId: 3, amount: 3700, type: 'Expense', categoryName: 'Market', transactionDate: '2026-03-08T15:00:00Z', description: 'Mart Ayı Mutfak Harcamaları 🛒', createdDate: '2026-03-08T15:00:00Z' },
  { id: 3, categoryId: 2, amount: 3000, type: 'Income', categoryName: 'Ek Gelir', transactionDate: '2026-03-15T11:00:00Z', description: 'Bahar Başlangıcı Ek İş Geliri 🪙', createdDate: '2026-03-15T11:00:00Z' },
  { id: 2, categoryId: 5, amount: 1050, type: 'Expense', categoryName: 'Ulaşım', transactionDate: '2026-03-20T11:00:00Z', description: 'Ulaşım Masrafları 🚗', createdDate: '2026-03-20T11:00:00Z' },
  { id: 1, categoryId: 6, amount: 1600, type: 'Expense', categoryName: 'Eğlence', transactionDate: '2026-03-28T19:00:00Z', description: 'Sinema & Kitap Alışverişi 📚', createdDate: '2026-03-28T19:00:00Z' }
];

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);
  private categoryService = inject(CategoryService);
  private baseUrl = '/api/transactions';

  public transactionsChanged$ = new Subject<void>();

  private notifyChange(): void {
    this.transactionsChanged$.next();
  }

  getLocalTransactions(): TransactionDetail[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  saveLocalTransactions(txs: TransactionDetail[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }

  getAll(filter: TransactionFilter): Observable<PagedResult<Transaction>> {
    let params = new HttpParams();
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.type) params = params.set('type', filter.type);
    params = params.set('page', filter.page ?? 1);
    params = params.set('pageSize', filter.pageSize ?? 50);

    return this.http.get<ApiResponse<PagedResult<Transaction>>>(this.baseUrl, { params }).pipe(
      map(res => {
        if (res?.data?.items) {
          this.saveLocalTransactions(res.data.items as TransactionDetail[]);
          return res.data;
        }
        return this.filterLocal(filter);
      }),
      catchError(() => of(this.filterLocal(filter)))
    );
  }

  private filterLocal(filter: TransactionFilter): PagedResult<Transaction> {
    let list = this.getLocalTransactions();
    if (filter.type) list = list.filter(t => t.type === filter.type);
    if (filter.categoryId) list = list.filter(t => Number(t.categoryId) === Number(filter.categoryId));
    if (filter.startDate) {
      const start = filter.startDate.slice(0, 10);
      list = list.filter(t => t.transactionDate.slice(0, 10) >= start);
    }
    if (filter.endDate) {
      const end = filter.endDate.slice(0, 10);
      list = list.filter(t => t.transactionDate.slice(0, 10) <= end);
    }

    list = [...list].sort((a, b) => {
      const timeA = new Date(a.transactionDate).getTime();
      const timeB = new Date(b.transactionDate).getTime();
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id - a.id;
    });

    return {
      items: list,
      totalCount: list.length,
      page: filter.page || 1,
      pageSize: filter.pageSize || 50
    };
  }

  private resolveCategoryName(categoryId: number, type: 'Income' | 'Expense'): string {
    const cats = this.categoryService.getLocalCategories();
    const match = cats.find((c: any) => Number(c.id) === Number(categoryId));
    if (match) return match.name;
    return type === 'Income' ? 'Gelir' : 'Gider';
  }

  create(dto: TransactionCreate): Observable<ApiResponse<TransactionDetail>> {
    return this.http.post<ApiResponse<TransactionDetail>>(this.baseUrl, dto).pipe(
      map(res => {
        if (res?.data) {
          const list = this.getLocalTransactions();
          const existingIdx = list.findIndex(t => t.id === res.data.id);
          if (existingIdx === -1) {
            list.unshift(res.data);
          } else {
            list[existingIdx] = res.data;
          }
          this.saveLocalTransactions(list);
        }
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const list = this.getLocalTransactions();
        const newId = list.length > 0 ? Math.max(...list.map(t => t.id)) + 1 : 1;
        const categoryName = this.resolveCategoryName(dto.categoryId, dto.type);

        const formattedDate = dto.transactionDate
          ? (dto.transactionDate.includes('T') ? dto.transactionDate : `${dto.transactionDate}T12:00:00Z`)
          : new Date().toISOString();

        const newTx: TransactionDetail = {
          id: newId,
          categoryId: dto.categoryId,
          categoryName,
          type: dto.type,
          amount: dto.amount,
          transactionDate: formattedDate,
          description: dto.description || null,
          createdDate: new Date().toISOString()
        };

        list.unshift(newTx);
        this.saveLocalTransactions(list);
        this.notifyChange();

        const res: ApiResponse<TransactionDetail> = {
          success: true,
          message: 'İşlem başarıyla eklendi! 🦝',
          data: newTx
        };

        return of(res);
      })
    );
  }

  update(id: number, dto: TransactionUpdate): Observable<ApiResponse<TransactionDetail>> {
    return this.http.put<ApiResponse<TransactionDetail>>(`${this.baseUrl}/${id}`, dto).pipe(
      map(res => {
        if (res?.data) {
          const list = this.getLocalTransactions();
          const idx = list.findIndex(t => t.id === id);
          if (idx !== -1) {
            list[idx] = res.data;
            this.saveLocalTransactions(list);
          }
        }
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const list = this.getLocalTransactions();
        const idx = list.findIndex(t => t.id === id);
        if (idx !== -1) {
          list[idx].amount = dto.amount;
          list[idx].type = dto.type;
          list[idx].categoryId = dto.categoryId;
          list[idx].categoryName = this.resolveCategoryName(dto.categoryId, dto.type);
          list[idx].transactionDate = dto.transactionDate.includes('T') ? dto.transactionDate : `${dto.transactionDate}T12:00:00Z`;
          list[idx].description = dto.description || null;
          this.saveLocalTransactions(list);
          this.notifyChange();
          const res: ApiResponse<TransactionDetail> = { success: true, message: 'İşlem güncellendi.', data: list[idx] };
          return of(res);
        }
        const errRes: ApiResponse<TransactionDetail> = { success: false, message: 'İşlem bulunamadı.', data: null as any };
        return of(errRes);
      })
    );
  }

  delete(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.baseUrl}/${id}`).pipe(
      map(res => {
        const list = this.getLocalTransactions().filter(t => t.id !== id);
        this.saveLocalTransactions(list);
        this.notifyChange();
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const list = this.getLocalTransactions().filter(t => t.id !== id);
        this.saveLocalTransactions(list);
        this.notifyChange();
        const res: ApiResponse<object> = { success: true, message: 'İşlem silindi.', data: {} };
        return of(res);
      })
    );
  }
}