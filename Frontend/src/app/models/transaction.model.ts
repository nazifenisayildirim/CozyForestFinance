export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: number;
  categoryId: number;
  categoryName: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description?: string | null;
}

export interface TransactionDetail extends Transaction {
  createdDate: string;
}

export interface TransactionCreate {
  categoryId: number;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description?: string | null;
}

export type TransactionUpdate = TransactionCreate;

export interface TransactionFilter {
  startDate?: string | null;
  endDate?: string | null;
  categoryId?: number | null;
  type?: TransactionType | null;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
