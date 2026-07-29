export interface MonthlyStat {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
}

export interface CategoryStat {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  percent: number;
}

export interface StatisticsSummary {
  monthly: MonthlyStat[];
  categoryBreakdown: CategoryStat[];
  incomeCategoryBreakdown?: CategoryStat[];
  currentMonthSavings: number;
  previousMonthSavings: number;
  topExpenseCategory?: string | null;
}
