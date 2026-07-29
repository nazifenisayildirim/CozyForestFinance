import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { GoalService } from '../../services/goal.service';
import { TransactionService } from '../../services/transaction.service';
import { DashboardSummary } from '../../models/dashboard.model';
import { Goal } from '../../models/goal.model';

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time?: string;
}

import { AiChatService } from '../../services/ai-chat.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private goalService = inject(GoalService);
  private transactionService = inject(TransactionService);
  private aiChatService = inject(AiChatService);

  @ViewChild('chatContainer') private chatContainer?: ElementRef;

  summary: DashboardSummary | null = null;
  activeGoals: Goal[] = [];
  loading = false;
  errorMessage = '';

  // AI Chatbot state
  userInput = '';
  isBotTyping = false;
  chatMessages: ChatMessage[] = [
    {
      sender: 'bot',
      text: 'Merhaba! Ben Orman Yapay Zeka Asistanın Robot 🤖. Harcamaların, bütçen veya hedeflerin hakkında bana dilediğini sorabilirsin!',
      time: '14:05'
    }
  ];

  quickPrompts = [
    '💡 Bütçemi nasıl dengeleyebilirim?',
    '📊 Bu ay en çok nereye harcadım?',
    '🐿️ Tasarruf tavsiyesi ver',
    '🎯 Hedef durumum nasıl?'
  ];

  ngOnInit(): void {
    this.load();
    this.loadGoals();

    this.transactionService.transactionsChanged$.subscribe(() => {
      this.load();
    });

    this.goalService.goalsChanged$.subscribe(() => {
      this.loadGoals();
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer?.nativeElement) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  loadGoals(): void {
    this.goalService.getAll().subscribe({
      next: (goals) => {
        const active = (goals || []).filter(g => !g.isCompleted);
        this.activeGoals = active.slice(0, 2);
      },
      error: () => {
        this.activeGoals = [];
      }
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary = data || { totalIncome: 0, totalExpense: 0, balance: 0, recentTransactions: [] };
        this.loading = false;
      },
      error: () => {
        this.summary = { totalIncome: 0, totalExpense: 0, balance: 0, recentTransactions: [] };
        this.loading = false;
      }
    });
  }

  // AI Chatbot logic
  sendPrompt(promptText: string): void {
    const cleanText = promptText.replace(/^[^\w\sğüşıöçĞÜŞİÖÇ]+/, '').trim();
    this.sendMessage(cleanText);
  }

  sendMessage(textToSend?: string): void {
    const text = textToSend || this.userInput.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatMessages.push({ sender: 'user', text, time });
    this.userInput = '';
    this.isBotTyping = true;
    this.scrollToBottom();

    const history = this.chatMessages.map(m => ({ sender: m.sender, text: m.text }));

    const recentTxList = (this.summary?.recentTransactions || []).map(t => `${t.description || t.categoryName}: ${t.amount} TL (${t.categoryName})`);
    const goalList = (this.activeGoals || []).map(g => `${g.name} (Hedef: ${g.targetAmount} TL, Biriken: ${g.currentAmount} TL)`);

    const expMap: { [cat: string]: number } = {};
    (this.summary?.recentTransactions || []).forEach(t => {
      if (t.type === 'Expense') {
        expMap[t.categoryName] = (expMap[t.categoryName] || 0) + Number(t.amount);
      }
    });
    let topCatName = '';
    let maxExp = 0;
    Object.keys(expMap).forEach(cat => {
      if (expMap[cat] > maxExp) {
        maxExp = expMap[cat];
        topCatName = cat;
      }
    });

    const context = {
      balance: this.summary?.balance ?? 0,
      totalIncome: this.summary?.totalIncome ?? 0,
      totalExpense: this.summary?.totalExpense ?? 0,
      topExpenseCategory: maxExp > 0 ? `${topCatName} (${maxExp} TL)` : undefined,
      goals: goalList,
      recentTransactions: recentTxList
    };

    this.aiChatService.sendMessage(text, history, context).subscribe(res => {
      this.isBotTyping = false;
      const replyText = res?.data?.reply || '🤖 Üzgünüm, şu anda yanıt üretemiyorum. Lütfen tekrar deneyin!';
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.chatMessages.push({ sender: 'bot', text: replyText, time: replyTime });
      this.scrollToBottom();
    });
  }

  clearChat(): void {
    this.chatMessages = [
      {
        sender: 'bot',
        text: 'Sohbet sıfırlandı. Yeni sorularını bekliyorum! 🤖',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  }

  getTransactionIcon(categoryName: string, type: string): string {
    if (type === 'Income') return '💼';
    switch (categoryName?.toLowerCase()) {
      case 'yiyecek': return '🍎';
      case 'kafe': return '☕';
      case 'ulaşım': return '🚌';
      default: return '📦';
    }
  }

  getTransactionTitle(t: any): string {
    if (t.description && t.description.trim()) return t.description;
    return t.categoryName || 'İşlem';
  }

  getDateBadge(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const shortMonths = ['OCAK', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];
    const month = shortMonths[date.getMonth()] || '';
    return `${day} ${month}`;
  }
}