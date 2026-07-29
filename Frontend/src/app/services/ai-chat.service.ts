import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

export interface ChatMessageDto {
  sender: 'user' | 'bot';
  text: string;
}

export interface ChatRequestDto {
  message: string;
  history?: ChatMessageDto[];
  balance?: number;
  totalIncome?: number;
  totalExpense?: number;
  topExpenseCategory?: string;
  goals?: string[];
  recentTransactions?: string[];
}

export interface ChatResponseDto {
  reply: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private http = inject(HttpClient);
  private baseUrl = '/api/chat';

  sendMessage(
    message: string, 
    history: ChatMessageDto[] = [],
    context?: {
      balance?: number;
      totalIncome?: number;
      totalExpense?: number;
      topExpenseCategory?: string;
      goals?: string[];
      recentTransactions?: string[];
    }
  ): Observable<ApiResponse<ChatResponseDto>> {
    const body: ChatRequestDto = { 
      message, 
      history,
      balance: context?.balance,
      totalIncome: context?.totalIncome,
      totalExpense: context?.totalExpense,
      topExpenseCategory: context?.topExpenseCategory,
      goals: context?.goals,
      recentTransactions: context?.recentTransactions
    };
    return this.http.post<ApiResponse<ChatResponseDto>>(`${this.baseUrl}/ask`, body).pipe(
      catchError((err) => {
        console.error('AI Chat Frontend Error:', err);
        const errMsg = err?.error?.message || err?.error?.data?.reply || err?.message || 'Sunucuya ulaşılamıyor.';
        return of({
          data: {
            reply: `🤖 Bağlantı Uyarısı: ${errMsg}`
          },
          success: false,
          message: errMsg
        });
      })
    );
  }
}
