import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TransactionService } from '../../services/transaction.service';
import { CategoryService } from '../../services/category.service';
import { Transaction, TransactionFilter } from '../../models/transaction.model';
import { Category } from '../../models/category.model';
import { MascotMessageComponent, RaccoonMood } from '../../shared/components/mascot-message/mascot-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MascotMessageComponent, EmptyStateComponent, ConfirmDialogComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  transactions: Transaction[] = [];
  categories: Category[] = [];
  totalCount = 0;
  loading = true;

  showForm = false;
  editingId: number | null = null;

  raccoonMood: RaccoonMood = 'focused';
  raccoonMessage = 'İşlemlerini buradan hesaplı bir şekilde yönetebilir, yeni gelir ve gider ekleyebilirsin. 🧮🦝';

  confirmDeleteOpen = false;
  pendingDeleteId: number | null = null;

  filterForm = this.fb.nonNullable.group({
    startDate: [''],
    endDate: [''],
    categoryId: [''],
    type: ['']
  });

  form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    type: ['Expense', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    transactionDate: [this.today(), Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();

    this.route.queryParams.subscribe(params => {
      if (params['type'] || params['openModal'] === 'true') {
        const type = params['type'] === 'Income' ? 'Income' : (params['type'] === 'Expense' ? 'Expense' : 'Income');
        this.openCreateFormWithType(type);
      }
    });

    // Auto-update categoryId when type changes (only if current category is invalid for new type)
    this.form.controls.type.valueChanges.subscribe(newType => {
      const currentCatId = Number(this.form.controls.categoryId.value);
      const available = this.categories.filter(c => c.type === newType && c.isActive);
      const currentIsValid = available.some(c => Number(c.id) === currentCatId);

      if (!currentIsValid) {
        if (available.length > 0) {
          this.form.controls.categoryId.setValue(String(available[0].id));
        } else {
          this.form.controls.categoryId.setValue('');
        }
      }
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get categoriesForSelectedType(): Category[] {
    const type = this.form.controls.type.value;
    return this.categories.filter(c => c.type === type && c.isActive);
  }

  loadCategories(): void {
    this.categoryService.getAll(false).subscribe({
      next: (data) => {
        this.categories = data;
        const available = this.categoriesForSelectedType;
        if (available.length > 0 && !this.form.controls.categoryId.value) {
          this.form.controls.categoryId.setValue(String(available[0].id));
        }
      },
      error: () => {}
    });
  }

  loadTransactions(): void {
    this.loading = true;
    const raw = this.filterForm.getRawValue();
    const filter: TransactionFilter = {
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      categoryId: raw.categoryId ? Number(raw.categoryId) : null,
      type: (raw.type as any) || null,
      page: 1,
      pageSize: 50
    };

    this.transactionService.getAll(filter).subscribe({
      next: (result) => {
        this.transactions = result.items;
        this.totalCount = result.totalCount;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.loadTransactions();
  }

  clearFilter(): void {
    this.filterForm.reset({ startDate: '', endDate: '', categoryId: '', type: '' });
    this.loadTransactions();
  }

  openCreateFormWithType(type: 'Income' | 'Expense'): void {
    this.editingId = null;
    const available = this.categories.filter(c => c.type === type && c.isActive);
    const defaultCatId = available.length > 0 ? String(available[0].id) : '';

    this.form.reset({
      categoryId: defaultCatId,
      type: type,
      amount: 0,
      transactionDate: this.today(),
      description: ''
    });
    this.showForm = true;
  }

  openCreateForm(): void {
    this.openCreateFormWithType('Expense');
  }

  openEditForm(t: Transaction): void {
    this.editingId = t.id;
    this.form.setValue({
      categoryId: String(t.categoryId),
      type: t.type,
      amount: t.amount,
      transactionDate: t.transactionDate.slice(0, 10),
      description: t.description ?? ''
    }, { emitEvent: false });
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
    const dto = {
      categoryId: Number(raw.categoryId),
      type: raw.type as 'Income' | 'Expense',
      amount: Number(raw.amount),
      transactionDate: raw.transactionDate,
      description: raw.description || null
    };

    const isExpense = dto.type === 'Expense';

    const request = this.editingId
      ? this.transactionService.update(this.editingId, dto)
      : this.transactionService.create(dto);

    request.subscribe({
      next: (res) => {
        if (res && res.success === false) {
          this.raccoonMood = 'shocked';
          this.raccoonMessage = res.message || 'Kayıt yapılamadı.';
          return;
        }

        if (isExpense) {
          this.raccoonMood = 'shocked';
          this.raccoonMessage = this.getRandomExpenseMessage();
        } else {
          this.raccoonMood = 'happy';
          this.raccoonMessage = this.getRandomIncomeMessage();
        }

        this.showForm = false;
        this.loadTransactions();
      },
      error: (err) => {
        this.raccoonMood = 'shocked';
        this.raccoonMessage = err?.error?.message || err?.message || 'İşlem eklenirken bir hata oluştu.';
      }
    });
  }

  private getRandomExpenseMessage(): string {
    const messages = [
      "Eyvah! Cüzdanımdan cızz diye ses geldi... O paraya kaç meşe palamudu alınırdı! 😱💸",
      "Ağaçtaki tüm yapraklar döküldü, senin harcama hırsın dökülmedi! 😱🍂",
      "Gitti güzelim paralar... Cüzdanım ağlıyor, ben ağlıyorum, ormandaki kuşlar ağlıyor! 💸😭",
      "Ağaçtan palamut toplaması kolay tabii, harca bakalım! 😱🌰",
      "Orman ekonomisi sarsıldı! Bütçede devasa bir kara delik açıldı! 💸😱",
      "Paralar pırrr diye uçtu gitti! Ben bu şokla nasıl kış uykusuna yatayım?! 😱🦝",
      "Cüzdan komada! Acil birikim takviyesi yapmamız lazım! 🚨💸"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getRandomIncomeMessage(): string {
    const messages = [
      "Harika! Orman hazinesine yeni altınlar eklendi! 🪙✨",
      "Yeey! Paralar geldi, bu akşam palamut ziyafeti var! 🌰🎉",
      "İşte bu! Cüzdan bayram ediyor, yaşasın finansal özgürlük! 🦝🥳",
      "Kasalara tazelik geldi! Birikim hedeflerine bir adım daha yaklaştık! 🌲🪙"
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
    const deletedItem = this.transactions.find(t => t.id === this.pendingDeleteId);
    this.transactionService.delete(this.pendingDeleteId).subscribe({
      next: () => {
        if (deletedItem && deletedItem.type === 'Expense') {
          this.raccoonMood = 'happy';
          this.raccoonMessage = 'O harcamayı hiç yapmamışız gibi davranalım... Şşt aramızda! 🤫🦝';
        } else {
          this.raccoonMood = 'happy';
          this.raccoonMessage = 'İşlem silindi! 🦝🧹';
        }
        this.confirmDeleteOpen = false;
        this.pendingDeleteId = null;
        this.loadTransactions();
      },
      error: () => {
        this.confirmDeleteOpen = false;
      }
    });
  }
}
