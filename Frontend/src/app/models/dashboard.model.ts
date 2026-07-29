import { Transaction } from './transaction.model';

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactions: Transaction[];
}
