export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number;
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