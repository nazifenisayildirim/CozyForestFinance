export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string | null;
  isCompleted: boolean;
  progressPercent: number;
}

export interface GoalCreate {
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string | null;
}

export interface GoalUpdateAmount {
  currentAmount: number;
}
