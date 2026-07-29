import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { MascotMessageComponent, FrogMood } from '../../shared/components/mascot-message/mascot-message.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MascotMessageComponent, EmptyStateComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  categories: Category[] = [];
  loading = true;
  feedbackMessage = '';
  errorMessage = '';

  frogMood: FrogMood = 'thinking';
  frogMessage = 'Hangi harcamayı nerede etiketleyeceğini düzenliyorum. Düzen orman yaşamının sırrıdır! 🐸📦';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['Expense', Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.categoryService.getAll(true).subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Kategoriler yüklenemedi.';
        this.loading = false;
      }
    });
  }

  submit(): void {
    this.errorMessage = '';
    this.feedbackMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const msg = 'Lütfen geçerli bir kategori adı giriniz.';
      this.errorMessage = msg;
      this.frogMood = 'mouth-open';
      this.frogMessage = msg;
      return;
    }

    const raw = this.form.getRawValue();
    const name = raw.name ? raw.name.trim() : '';
    if (!name) {
      const msg = 'Lütfen geçerli bir kategori adı giriniz.';
      this.errorMessage = msg;
      this.frogMood = 'mouth-open';
      this.frogMessage = msg;
      return;
    }

    const isExpense = raw.type === 'Expense';

    this.categoryService.create({ name, type: raw.type as 'Income' | 'Expense' }).subscribe({
      next: (res) => {
        this.feedbackMessage = res.message || 'Yeni kategori başarıyla eklendi! 🌳';

        if (isExpense) {
          this.frogMood = 'mouth-open';
          this.frogMessage = `Aha! Yeni bir gider kategorisi mi?! '${name}' için Rakun cüzdanı saklamaya başladı bile! 🐸😱`;
        } else {
          this.frogMood = 'combo';
          this.frogMessage = `EFSANEVİ GELİR KATEGORİSİ! ⚡🐸 '${name}' ile yeni kazanç kapıları açılıyor! 🪙✨`;
        }

        this.form.reset({ name: '', type: 'Expense' });
        this.load();
      },
      error: (err) => {
        this.frogMood = 'mouth-open';
        const msg = err?.error?.message || err?.message || 'Kategori eklenemedi.';
        this.frogMessage = msg;
        this.errorMessage = msg;
      }
    });
  }

  toggleActive(c: Category): void {
    const nextState = !c.isActive;
    this.categoryService.update(c.id, { name: c.name, type: c.type, isActive: nextState }).subscribe({
      next: () => {
        if (!nextState) {
          this.frogMood = 'thinking';
          this.frogMessage = `'${c.name}' kategorisini rafa kaldırdım. İleride tekrar aktif edebiliriz. 🐸🧹`;
        } else {
          this.frogMood = 'happy';
          this.frogMessage = `'${c.name}' tekrar sahnede! Düzenli etiketlemeye devam! 🐸✨`;
        }
        this.load();
      },
      error: () => { this.errorMessage = 'Kategori güncellenemedi.'; }
    });
  }

  remove(c: Category): void {
    this.categoryService.delete(c.id).subscribe({
      next: () => {
        this.frogMood = 'happy';
        this.frogMessage = `'${c.name}' kategorisi ormanın derinliklerine uğurlandı! Tertemiz bir sayfa. 🐸🧹`;
        this.load();
      },
      error: () => { this.errorMessage = 'Kategori silinemedi.'; }
    });
  }
}
