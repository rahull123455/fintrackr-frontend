import type {
  AiPredictionResponse,
  AiChatResponse,
  ContactInquiry,
  ContactInquiryInput,
  AuthResponse,
  AuthUser,
  LoginResponse,
  Expense,
  ExpenseInput,
  SavingsGoal,
  SavingsGoalInput,
  TwoFactorSetupResponse,
  TwoFactorVerifyResponse,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message =
        typeof data.message === 'string'
          ? data.message
          : Array.isArray(data.message)
            ? data.message.join(', ')
            : message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  signup(email: string, password: string) {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  generateTwoFactor(token: string) {
    return request<TwoFactorSetupResponse>(
      '/auth/2fa/generate',
      { method: 'POST' },
      token,
    );
  },

  enableTwoFactor(token: string, otpCode: string) {
    return request<{ success: boolean }>(
      '/auth/2fa/enable',
      {
        method: 'POST',
        body: JSON.stringify({ otpCode }),
      },
      token,
    );
  },

  verifyTwoFactor(tempToken: string, otpCode: string) {
    return request<TwoFactorVerifyResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ otpCode, tempToken }),
    });
  },

  loginWithTwoFactor(tempToken: string, otpCode: string) {
    return request<AuthResponse>('/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({ otpCode, tempToken }),
    });
  },

  me(token: string) {
    return request<AuthUser>('/auth/me', { method: 'GET' }, token);
  },

  listExpenses(token: string) {
    return request<Expense[]>('/expenses', { method: 'GET' }, token);
  },

  createExpense(token: string, input: ExpenseInput) {
    return request<Expense>(
      '/expenses',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  listSavingsGoals(token: string) {
    return request<SavingsGoal[]>('/savings', { method: 'GET' }, token);
  },

  createSavingsGoal(token: string, input: SavingsGoalInput) {
    return request<SavingsGoal>(
      '/savings',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  deleteSavingsGoal(token: string, goalId: string) {
    return request<{ success: boolean; id: string }>(
      `/savings/${goalId}`,
      { method: 'DELETE' },
      token,
    );
  },

  deleteExpense(token: string, expenseId: string) {
    return request<{ success: boolean; id: string }>(
      `/expenses/${expenseId}`,
      { method: 'DELETE' },
      token,
    );
  },

  chat(token: string, message: string) {
    return request<AiChatResponse>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
      token,
    );
  },

  getPrediction(token: string) {
    return request<AiPredictionResponse>(
      '/ai/predict',
      { method: 'GET' },
      token,
    );
  },

  refreshPrediction(token: string) {
    return request<AiPredictionResponse>(
      '/ai/predict/refresh',
      { method: 'POST' },
      token,
    );
  },

  submitContactInquiry(input: ContactInquiryInput) {
    return request<ContactInquiry>('/contact', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
