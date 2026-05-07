// src/types/budget.ts
export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number; // percentage (e.g., 80 means alert at 80%)
  createdAt: string;
}

export interface BudgetStatus {
  budget: Budget;
  currentSpending: number;
  percentageUsed: number;
  remaining: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}