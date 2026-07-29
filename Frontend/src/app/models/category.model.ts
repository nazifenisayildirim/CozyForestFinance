import { TransactionType } from './transaction.model';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  isActive: boolean;
}

export interface CategoryCreate {
  name: string;
  type: TransactionType;
}

export interface CategoryUpdate extends CategoryCreate {
  isActive: boolean;
}
