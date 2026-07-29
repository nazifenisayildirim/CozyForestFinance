import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { GoalService } from '../../services/goal.service';
import { Goal } from '../../models/goal.model';
import { MascotMessageComponent, SquirrelMood } from '../../shared/components/mascot-message/mascot-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MascotMessageComponent, EmptyStateComponent, ConfirmDialogComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss'
})
export class GoalsComponent implements OnInit {
  private goalService = inject(GoalService);
  private fb = inject(FormBuilder);

  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  loading = true;
  showForm = false;

  activeTab: 'all' | 'active' | 'completed' = 'all';

  squirrelMood: SquirrelMood = 'calm';
  squirrelMessage = 'Finansal hedeflerini buradan takip edebilir, yeni birikim hedefleri ekleyebilirsin. 🐿️';

  confirmDeleteOpen = false;
  pendingDeleteId: number | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    targetAmount: [0, [Validators.required, Validators.min(0.01)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    dueDate: ['']
  });

  depositInputs = new Map<number, number>();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.goalService.getAll().subscribe({
      next: (data) => {
        this.goals = data;
        this.applyFilter();
        this.loading = false;
        for (const g of data) {
          if (!this.depositInputs.has(g.id)) {
            this.depositInputs.set(g.id, 100);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.squirrelMood = 'scared';
        this.squirrelMessage = 'Hedefler şu anda yüklenemedi.';
      }
    });
  }

  setTab(tab: 'all' | 'active' | 'completed'): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeTab === 'active') {
      this.filteredGoals = this.goals.filter(g => !g.isCompleted);
    } else if (this.activeTab === 'completed') {
      this.filteredGoals = this.goals.filter(g => g.isCompleted);
    } else {
      this.filteredGoals = [...this.goals];
    }
  }

  openCreateForm(): void {
    this.form.reset({ name: '', targetAmount: 1000, currentAmount: 0, dueDate: '' });
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (Number(raw.currentAmount) > Number(raw.targetAmount)) {
      this.squirrelMood = 'scared';
      this.squirrelMessage = 'Başlangıç birikimi hedef tutardan büyük olamaz.';
      return;
    }

    this.goalService.create({
      name: raw.name,
      targetAmount: Number(raw.targetAmount),
      currentAmount: Number(raw.currentAmount),
      dueDate: raw.dueDate || null
    }).subscribe({
      next: (res) => {
        this.squirrelMood = 'excited';
        this.squirrelMessage = res.message ?? 'Yeni hedefin başarıyla eklendi! 🐿️';
        this.showForm = false;
        this.load();
      },
      error: (err) => {
        this.squirrelMood = 'scared';
        this.squirrelMessage = err?.error?.message || err?.message || 'Hedef oluşturulurken bir hata oluştu.';
      }
    });
  }

  addDeposit(goal: Goal): void {
    const deposit = Number(this.depositInputs.get(goal.id) || 100);
    const newAmount = Number(goal.currentAmount) + deposit;

    this.goalService.updateAmount(goal.id, { currentAmount: newAmount }).subscribe({
      next: (res) => {
        this.squirrelMood = res.data?.isCompleted ? 'excited' : 'calm';
        this.squirrelMessage = res.message ?? 'Birikim başarıyla eklendi!';
        this.load();
      },
      error: () => {}
    });
  }

  private getRandomScaredMessage(): string {
    const messages = [
      "Hayırrr! O güzelim hedef tamamlanmadan yok oldu! Palamutlar tehlikede! 😱🐿️",
      "Tamamlanmamış hedef mi silindi?! Sincap kalbim bu şoku kaldıramıyor! 😭🌰",
      "Eyvah eyvah! Birikim tamamlanmadan pes ettik, kışın ne yiyeceğiz?! 😱🚨",
      "Palamut stoklama planımız yarım kaldı... Çok korkutucu! 😱🍂"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  askDelete(id: number): void {
    this.pendingDeleteId = id;
    this.confirmDeleteOpen = true;
  }

  cancelDelete(): void {
    this.confirmDeleteOpen = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId == null) return;
    const deletedGoal = this.goals.find(g => g.id === this.pendingDeleteId);
    this.goalService.delete(this.pendingDeleteId).subscribe({
      next: () => {
        if (deletedGoal && !deletedGoal.isCompleted) {
          this.squirrelMood = 'scared';
          this.squirrelMessage = this.getRandomScaredMessage();
        } else {
          this.squirrelMood = 'calm';
          this.squirrelMessage = 'Tamamlanmış hedef kaldırıldı. Harika iş çıkardın! 🐿️✨';
        }
        this.confirmDeleteOpen = false;
        this.pendingDeleteId = null;
        this.load();
      },
      error: (err) => {
        this.squirrelMood = 'scared';
        this.squirrelMessage = err?.error?.message ?? 'Hedef silinirken bir hata oluştu.';
        this.confirmDeleteOpen = false;
      }
    });
  }
}
