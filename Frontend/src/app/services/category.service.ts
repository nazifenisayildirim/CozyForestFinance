import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { Category, CategoryCreate, CategoryUpdate } from '../models/category.model';

const STORAGE_KEY = 'cozyforest_categories_v4';

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'Maaş', type: 'Income', isActive: true },
  { id: 2, name: 'Ek Gelir', type: 'Income', isActive: true },
  { id: 3, name: 'Market', type: 'Expense', isActive: true },
  { id: 4, name: 'Kira', type: 'Expense', isActive: true },
  { id: 5, name: 'Ulaşım', type: 'Expense', isActive: true },
  { id: 6, name: 'Eğlence', type: 'Expense', isActive: true }
];

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrl = '/api/categories';

  getLocalCategories(): Category[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  saveLocalCategories(categories: Category[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  getAll(includeInactive = false): Observable<Category[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<ApiResponse<Category[]>>(this.baseUrl, { params }).pipe(
      map(res => {
        if (res?.data) {
          this.saveLocalCategories(res.data);
          return includeInactive ? res.data : res.data.filter(c => c.isActive);
        }
        return this.filterLocal(includeInactive);
      }),
      catchError(() => of(this.filterLocal(includeInactive)))
    );
  }

  private filterLocal(includeInactive: boolean): Category[] {
    const cats = this.getLocalCategories();
    return includeInactive ? cats : cats.filter(c => c.isActive);
  }

  create(dto: CategoryCreate): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(this.baseUrl, dto).pipe(
      map(res => {
        if (res?.data) {
          const cats = this.getLocalCategories();
          const existingIdx = cats.findIndex(c => c.id === res.data.id);
          if (existingIdx === -1) {
            cats.push(res.data);
          } else {
            cats[existingIdx] = res.data;
          }
          this.saveLocalCategories(cats);
        }
        return res;
      }),
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const cats = this.getLocalCategories();
        const nameTrimmed = dto.name.trim().toLowerCase();
        const exists = cats.some(c => c.name.trim().toLowerCase() === nameTrimmed && c.type === dto.type);
        if (exists) {
          return throwError(() => ({ error: { message: 'Bu isimde ve türde bir kategori zaten var.' } }));
        }

        const newId = cats.length > 0 ? Math.max(...cats.map(c => c.id)) + 1 : 1;
        const newCat: Category = { id: newId, name: dto.name.trim(), type: dto.type, isActive: true };
        cats.push(newCat);
        this.saveLocalCategories(cats);
        return of({ success: true, message: 'Yeni kategori eklendi! 🌳', data: newCat });
      })
    );
  }

  update(id: number, dto: CategoryUpdate): Observable<ApiResponse<Category>> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, dto).pipe(
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const cats = this.getLocalCategories();
        const idx = cats.findIndex(c => c.id === id);
        if (idx !== -1) {
          cats[idx].name = dto.name;
          cats[idx].type = dto.type;
          cats[idx].isActive = dto.isActive;
          this.saveLocalCategories(cats);
          return of({ success: true, message: 'Kategori güncellendi.', data: cats[idx] });
        }
        return of({ success: false, message: 'Kategori bulunamadı.', data: null as any });
      })
    );
  }

  delete(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => {
        if (err.status === 400) {
          return throwError(() => err);
        }
        const cats = this.getLocalCategories().filter(c => c.id !== id);
        this.saveLocalCategories(cats);
        return of({ success: true, message: 'Kategori silindi.', data: {} });
      })
    );
  }
}