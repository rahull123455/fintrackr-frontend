export type AuthUser = {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthSuccessResponse = {
  accessToken: string;
  user: AuthUser;
};

export type OtpChallengeResponse = {
  requiresOtp: true;
  userId: string;
};

export type AuthResponse = AuthSuccessResponse;

export type LoginResponse = AuthSuccessResponse | OtpChallengeResponse;

export type SendOtpResponse = {
  message: string;
};

export type EnableOtpResponse = {
  success: boolean;
  user: AuthUser;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentAt: string;
  note?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  spentAt: string;
  note?: string;
};

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  remaining: number;
  progressPercent: number;
  monthsToGoal: number | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavingsGoalInput = {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  monthlyContribution?: number;
};

export type AiCategoryInsight = {
  category: string;
  amount: number;
  shareOfTotal: number;
};

export type AiRecentExpense = {
  title: string;
  amount: number;
  category: string;
  spentAt: string;
};

export type AiExpenseAnalysis = {
  expenseCount: number;
  totalSpend: number;
  averageExpense: number;
  firstExpenseAt: string | null;
  lastExpenseAt: string | null;
  topCategories: AiCategoryInsight[];
  recentExpenses: AiRecentExpense[];
};

export type AiChatResponse = {
  reply: string;
  analysis: AiExpenseAnalysis;
};

export type AiPredictionTrend = 'increasing' | 'decreasing' | 'stable';

export type AiPredictionConfidence = 'low' | 'medium' | 'high';

export type AiCategoryPrediction = {
  category: string;
  predictedAmount: number;
  trend: AiPredictionTrend;
  changePercent: number;
  confidence: AiPredictionConfidence;
  rationale: string;
};

export type AiPredictionResponse = {
  month: string;
  predictedTotal: number;
  summary: string;
  insights: string[];
  categories: AiCategoryPrediction[];
  generatedAt: string;
};

export type ContactInquiryInput = {
  name: string;
  surname: string;
  organization: string;
  email: string;
  comments: string;
};

export type ContactInquiry = {
  id: string;
  name: string;
  surname: string;
  organization: string;
  email: string;
  comments: string;
  createdAt: string;
  updatedAt: string;
};
