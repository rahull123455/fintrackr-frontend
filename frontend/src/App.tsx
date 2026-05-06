import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import { FinanceChatbot } from './components/FinanceChatbot';
import { SiteFooter } from './components/SiteFooter';
import type {
  AiPredictionResponse,
  AiPredictionTrend,
  AuthResponse,
  AuthUser,
  Expense,
  ExpenseInput,
  SavingsGoal,
  SavingsGoalInput,
} from './types';

const tokenStorageKey = 'fintrackr-token';
const themeStorageKey = 'fintrackr-theme';
const themeModes = ['system', 'light', 'dark'] as const;

type ThemeMode = (typeof themeModes)[number];

const categories = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Health',
  'Work',
  'Other',
];

function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

function formatPredictionMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);

  if (!year || !monthNumber) {
    return month;
  }

  return new Date(year, monthNumber - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function getTrendArrow(trend: AiPredictionTrend) {
  switch (trend) {
    case 'increasing':
      return '↑';
    case 'decreasing':
      return '↓';
    default:
      return '→';
  }
}

function formatChangePercent(changePercent: number) {
  if (changePercent === 0) {
    return '0.0%';
  }

  return `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
}

function formatConfidenceLabel(confidence: string) {
  return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)}`;
}

function sortSavingsGoals(goals: SavingsGoal[]) {
  return [...goals].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getResolvedTheme(
  themeMode: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (themeMode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return themeMode;
}

function getThemeIcon(themeMode: ThemeMode) {
  switch (themeMode) {
    case 'light':
      return '☀️';
    case 'dark':
      return '🌙';
    default:
      return '🖥️';
  }
}

function normalizeOtpCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

function App() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [token, setToken] = useState<string | null>(
    () => window.localStorage.getItem(tokenStorageKey),
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return isThemeMode(savedTheme) ? savedTheme : 'system';
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    spentAt: toLocalDateTimeValue(),
    note: '',
  });
  const [savingsForm, setSavingsForm] = useState({
    name: '',
    targetAmount: '',
    savedAmount: '',
    monthlyContribution: '',
  });
  const [authError, setAuthError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [savingsError, setSavingsError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(Boolean(token));
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsListLoading, setSavingsListLoading] = useState(false);
  const [prediction, setPrediction] = useState<AiPredictionResponse | null>(
    null,
  );
  const [predictionError, setPredictionError] = useState('');
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionRefreshing, setPredictionRefreshing] = useState(false);
  const [twoFactorSetupActive, setTwoFactorSetupActive] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSending, setTwoFactorSending] = useState(false);
  const [twoFactorEnabling, setTwoFactorEnabling] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme = getResolvedTheme(themeMode, mediaQuery.matches);
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    };

    applyTheme();

    if (themeMode !== 'system') {
      return;
    }

    mediaQuery.addEventListener('change', applyTheme);

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, [themeMode]);

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      setUser(null);
      setExpenses([]);
      setSavingsGoals([]);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function bootstrap() {
      try {
        const [currentUser, currentExpenses] = await Promise.all([
          api.me(authToken),
          api.listExpenses(authToken),
        ]);

        if (!cancelled) {
          setUser(currentUser);
          setExpenses(currentExpenses);
        }
      } catch {
        if (!cancelled) {
          handleLogout();
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user || bootstrapping) {
      setSavingsGoals([]);
      setSavingsError('');
      setSavingsListLoading(false);
      setSavingsLoading(false);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function loadSavingsGoals() {
      setSavingsListLoading(true);
      setSavingsError('');

      try {
        const nextGoals = await api.listSavingsGoals(authToken);

        if (!cancelled) {
          setSavingsGoals(sortSavingsGoals(nextGoals));
        }
      } catch (error) {
        if (!cancelled) {
          setSavingsGoals([]);
          setSavingsError(
            error instanceof Error
              ? error.message
              : 'Could not load your savings goals',
          );
        }
      } finally {
        if (!cancelled) {
          setSavingsListLoading(false);
        }
      }
    }

    void loadSavingsGoals();

    return () => {
      cancelled = true;
    };
  }, [bootstrapping, token, user]);

  useEffect(() => {
    if (!token || !user || bootstrapping) {
      setPrediction(null);
      setPredictionError('');
      setPredictionLoading(false);
      setPredictionRefreshing(false);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function loadPrediction() {
      setPredictionLoading(true);
      setPredictionError('');

      try {
        const nextPrediction = await api.getPrediction(authToken);

        if (!cancelled) {
          setPrediction(nextPrediction);
        }
      } catch (error) {
        if (!cancelled) {
          setPrediction(null);
          setPredictionError(
            error instanceof Error
              ? error.message
              : 'Could not load your AI prediction',
          );
        }
      } finally {
        if (!cancelled) {
          setPredictionLoading(false);
        }
      }
    }

    void loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [bootstrapping, token, user]);

  function persistAuth(auth: AuthResponse) {
    window.localStorage.setItem(tokenStorageKey, auth.accessToken);
    setToken(auth.accessToken);
    setUser(auth.user);
    setAuthPassword('');
    setAuthError('');
    setOtpUserId(null);
    setOtpCode('');
    setOtpError('');
    setOtpLoading(false);
    setTwoFactorSetupActive(false);
    setTwoFactorCode('');
    setTwoFactorError('');
    setTwoFactorSending(false);
    setTwoFactorEnabling(false);
    setBootstrapping(true);
  }

  function handleLogout() {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setExpenses([]);
    setSavingsGoals([]);
    setPrediction(null);
    setAuthPassword('');
    setAuthError('');
    setExpenseError('');
    setSavingsError('');
    setPredictionError('');
    setOtpUserId(null);
    setOtpCode('');
    setOtpError('');
    setOtpLoading(false);
    setTwoFactorSetupActive(false);
    setTwoFactorCode('');
    setTwoFactorError('');
    setTwoFactorSending(false);
    setTwoFactorEnabling(false);
    setBootstrapping(false);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (mode === 'signup') {
        const auth = await api.signup(authEmail, authPassword);
        persistAuth(auth);
        return;
      }

      const auth = await api.login(authEmail, authPassword);

      if ('requiresOtp' in auth && auth.requiresOtp) {
        setOtpUserId(auth.userId);
        setOtpCode('');
        setOtpError('');
        setAuthPassword('');
        return;
      }

      persistAuth(auth as AuthResponse);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOtpVerify() {
    if (!otpUserId) {
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const auth = await api.verifyOtp(otpUserId, otpCode);
      persistAuth(auth);
      setOtpUserId(null);
      setOtpCode('');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSendSetupOtp() {
    if (!user) {
      return;
    }

    setTwoFactorSending(true);
    setTwoFactorError('');

    try {
      await api.resendOtp(user.id);
      setTwoFactorSetupActive(true);
      setTwoFactorCode('');
    } catch (error) {
      setTwoFactorError(
        error instanceof Error
          ? error.message
          : 'Could not send your setup code',
      );
    } finally {
      setTwoFactorSending(false);
    }
  }

  async function handleEnableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setTwoFactorEnabling(true);
    setTwoFactorError('');

    try {
      const response = await api.enableEmailOtp(token, twoFactorCode);
      setUser(response.user);
      setTwoFactorSetupActive(false);
      setTwoFactorCode('');
    } catch (error) {
      setTwoFactorError(
        error instanceof Error
          ? error.message
          : 'Could not enable two-factor authentication',
      );
    } finally {
      setTwoFactorEnabling(false);
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setExpenseLoading(true);
    setExpenseError('');

    try {
      const payload: ExpenseInput = {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        spentAt: new Date(expenseForm.spentAt).toISOString(),
        note: expenseForm.note.trim() || undefined,
      };

      const created = await api.createExpense(token, payload);
      setExpenses((current) =>
        [created, ...current].sort(
          (a, b) =>
            new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime(),
        ),
      );
      setExpenseForm({
        title: '',
        amount: '',
        category: expenseForm.category,
        spentAt: toLocalDateTimeValue(),
        note: '',
      });
    } catch (error) {
      setExpenseError(
        error instanceof Error ? error.message : 'Could not save expense',
      );
    } finally {
      setExpenseLoading(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!token) {
      return;
    }

    try {
      await api.deleteExpense(token, expenseId);
      setExpenses((current) =>
        current.filter((expense) => expense.id !== expenseId),
      );
    } catch (error) {
      setExpenseError(
        error instanceof Error ? error.message : 'Could not delete expense',
      );
    }
  }

  async function handleSavingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSavingsLoading(true);
    setSavingsError('');

    try {
      const payload: SavingsGoalInput = {
        name: savingsForm.name.trim(),
        targetAmount: Number(savingsForm.targetAmount),
        savedAmount: savingsForm.savedAmount
          ? Number(savingsForm.savedAmount)
          : undefined,
        monthlyContribution: savingsForm.monthlyContribution
          ? Number(savingsForm.monthlyContribution)
          : undefined,
      };

      const created = await api.createSavingsGoal(token, payload);
      setSavingsGoals((current) => sortSavingsGoals([created, ...current]));
      setSavingsForm({
        name: '',
        targetAmount: '',
        savedAmount: '',
        monthlyContribution: '',
      });
    } catch (error) {
      setSavingsError(
        error instanceof Error ? error.message : 'Could not create savings goal',
      );
    } finally {
      setSavingsLoading(false);
    }
  }

  async function handleDeleteSavingsGoal(goalId: string) {
    if (!token) {
      return;
    }

    try {
      await api.deleteSavingsGoal(token, goalId);
      setSavingsGoals((current) =>
        current.filter((goal) => goal.id !== goalId),
      );
    } catch (error) {
      setSavingsError(
        error instanceof Error ? error.message : 'Could not delete savings goal',
      );
    }
  }

  async function handleRefreshPrediction() {
    if (!token || !user || predictionRefreshing) {
      return;
    }

    const authToken = token;
    setPredictionRefreshing(true);
    setPredictionError('');

    try {
      const nextPrediction = await api.refreshPrediction(authToken);
      setPrediction(nextPrediction);
    } catch (error) {
      setPredictionError(
        error instanceof Error
          ? error.message
          : 'Could not refresh your AI prediction',
      );
    } finally {
      setPredictionRefreshing(false);
    }
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageSpend = expenses.length ? totalSpent / expenses.length : 0;
  const now = new Date();
  const currentMonthSpend = expenses.reduce((sum, expense) => {
    const spentAt = new Date(expense.spentAt);
    const sameMonth =
      spentAt.getMonth() === now.getMonth() &&
      spentAt.getFullYear() === now.getFullYear();
    return sameMonth ? sum + expense.amount : sum;
  }, 0);
  const categorySummary = Object.entries(
    expenses.reduce<Record<string, number>>((accumulator, expense) => {
      accumulator[expense.category] =
        (accumulator[expense.category] ?? 0) + expense.amount;
      return accumulator;
    }, {}),
  )
    .map(([category, amount]) => ({
      category,
      amount,
      share: totalSpent ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const topCategory = categorySummary[0];
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const amount = expenses.reduce((sum, expense) => {
      const spentAt = new Date(expense.spentAt);
      const sameMonth =
        spentAt.getMonth() === date.getMonth() &&
        spentAt.getFullYear() === date.getFullYear();
      return sameMonth ? sum + expense.amount : sum;
    }, 0);

    return {
      label: formatMonthLabel(date),
      amount,
    };
  });
  const maxMonthlyAmount = Math.max(
    ...monthlyTrend.map((month) => month.amount),
    1,
  );
  const themeIcon = getThemeIcon(themeMode);

  if (otpUserId) {
    return (
      <div className="app-shell">
        <div className="glow glow-a" />
        <div className="glow glow-b" />

        <div className="otp-screen">
          <div className="panel otp-card">
            <div className="panel-header">
              <p className="panel-kicker">Two-Factor Auth</p>
              <h2>Check your email</h2>
            </div>
            <p className="muted-copy">
              We sent a 6-digit code to your email. Enter it below.
            </p>
            <input
              className="otp-input"
              maxLength={6}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, ''))
              }
              placeholder="000000"
              value={otpCode}
            />
            {otpError ? <p className="error-text">{otpError}</p> : null}
            <button
              className="primary-button"
              disabled={otpCode.length !== 6 || otpLoading}
              onClick={() => void handleOtpVerify()}
            >
              {otpLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              className="ghost-button"
              onClick={() => void api.resendOtp(otpUserId)}
              type="button"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <main className="layout">
        <section className="hero">
          <div className="hero-topbar">
            <p className="eyebrow">FinTrackr Dashboard</p>
            <button
              aria-label={`Theme mode: ${themeMode}`}
              className="theme-toggle"
              onClick={() =>
                setThemeMode((current) => {
                  const currentIndex = themeModes.indexOf(current);
                  return themeModes[(currentIndex + 1) % themeModes.length];
                })
              }
              title={`Theme mode: ${themeMode}`}
              type="button"
            >
              <span aria-hidden="true">{themeIcon}</span>
            </button>
          </div>
          <h1>
            Spend with clarity,
            <span> track with intent.</span>
          </h1>
          <p className="hero-copy">
            A sharp React front end for your NestJS API. Sign in, add expenses,
            and monitor spending in one place.
          </p>

          <div className="metric-strip">
            <article>
              <span>Total logged</span>
              <strong>{expenses.length}</strong>
            </article>
            <article>
              <span>Total spent</span>
              <strong>${totalSpent.toFixed(2)}</strong>
            </article>
            <article>
              <span>This month</span>
              <strong>${currentMonthSpend.toFixed(2)}</strong>
            </article>
          </div>
        </section>

        <section className="panel auth-panel">
          <div className="panel-header">
            <p className="panel-kicker">Authentication</p>
            <h2>
              {user
                ? 'Session ready'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Welcome back'}
            </h2>
          </div>

          {user ? (
            <>
              <div className="session-card">
                <div className="session-meta">
                  <p className="session-label">Signed in as</p>
                  <div className="session-identity">
                    <strong>{user.email}</strong>
                    {user.twoFactorEnabled ? (
                      <span className="twofa-badge">2FA Enabled ✓</span>
                    ) : null}
                  </div>
                </div>

                <div className="session-actions">
                  {!user.twoFactorEnabled ? (
                    <button
                      className="ghost-button"
                      disabled={twoFactorSending || twoFactorEnabling}
                      onClick={() => void handleSendSetupOtp()}
                      type="button"
                    >
                      {twoFactorSending ? 'Sending...' : 'Enable 2FA'}
                    </button>
                  ) : null}

                  <button
                    className="ghost-button"
                    onClick={handleLogout}
                    type="button"
                  >
                    Log out
                  </button>
                </div>
              </div>

              {twoFactorError ? <p className="error-text">{twoFactorError}</p> : null}

              {!user.twoFactorEnabled && twoFactorSetupActive ? (
                <section className="otp-setup">
                  <p className="panel-kicker">Email OTP Setup</p>
                  <h3>Check your inbox</h3>
                  <p className="muted-copy">
                    We emailed a 6-digit code to {user.email}. Enter it below to
                    turn on email-based two-factor authentication.
                  </p>

                  <form className="stack" onSubmit={handleEnableTwoFactor}>
                    <input
                      autoComplete="one-time-code"
                      className="otp-input"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) =>
                        setTwoFactorCode(normalizeOtpCode(event.target.value))
                      }
                      placeholder="000000"
                      value={twoFactorCode}
                    />

                    <button
                      className="primary-button"
                      disabled={twoFactorEnabling || twoFactorCode.length !== 6}
                      type="submit"
                    >
                      {twoFactorEnabling ? 'Confirming...' : 'Verify and enable'}
                    </button>

                    <button
                      className="ghost-button"
                      disabled={twoFactorSending || twoFactorEnabling}
                      onClick={() => void handleSendSetupOtp()}
                      type="button"
                    >
                      {twoFactorSending ? 'Sending...' : 'Resend code'}
                    </button>
                  </form>
                </section>
              ) : null}
            </>
          ) : (
            <>
              <div className="mode-switch">
                <button
                  className={mode === 'signup' ? 'active' : ''}
                  onClick={() => setMode('signup')}
                  type="button"
                >
                  Sign up
                </button>
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Log in
                </button>
              </div>

              <form className="stack" onSubmit={handleAuthSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={authEmail}
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    minLength={8}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    type="password"
                    value={authPassword}
                  />
                </label>

                {authError ? <p className="error-text">{authError}</p> : null}

                <button
                  className="primary-button"
                  disabled={authLoading}
                  type="submit"
                >
                  {authLoading
                    ? 'Processing...'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Log in'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="panel composer">
          <div className="panel-header">
            <p className="panel-kicker">New Expense</p>
            <h2>Capture a spend event</h2>
          </div>

          <form className="stack" onSubmit={handleExpenseSubmit}>
            <label>
              <span>Title</span>
              <input
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Groceries"
                value={expenseForm.title}
              />
            </label>

            <div className="grid-two">
              <label>
                <span>Amount</span>
                <input
                  disabled={!user || bootstrapping}
                  inputMode="decimal"
                  min="0.01"
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="42.75"
                  step="0.01"
                  value={expenseForm.amount}
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  disabled={!user || bootstrapping}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  value={expenseForm.category}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Spent at</span>
              <input
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    spentAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={expenseForm.spentAt}
              />
            </label>

            <label>
              <span>Note</span>
              <textarea
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Weekly shopping, taxi to airport, client lunch..."
                rows={3}
                value={expenseForm.note}
              />
            </label>

            {expenseError ? <p className="error-text">{expenseError}</p> : null}

            <button
              className="primary-button"
              disabled={!user || expenseLoading || bootstrapping}
              type="submit"
            >
              {expenseLoading ? 'Saving...' : 'Add expense'}
            </button>
          </form>
        </section>

        <section className="panel analytics">
          <div className="panel-header">
            <p className="panel-kicker">Analytics</p>
            <h2>Where the money is moving</h2>
          </div>

          {bootstrapping ? (
            <p className="muted-copy">Crunching your numbers...</p>
          ) : !user ? (
            <p className="muted-copy">
              Sign in to unlock category and monthly analytics.
            </p>
          ) : expenses.length === 0 ? (
            <p className="muted-copy">
              Add a few expenses to populate the analytics dashboard.
            </p>
          ) : (
            <div className="analytics-stack">
              <div className="analytics-grid">
                <article className="analytics-card">
                  <span className="analytics-label">This month</span>
                  <strong>${currentMonthSpend.toFixed(2)}</strong>
                </article>
                <article className="analytics-card">
                  <span className="analytics-label">Average expense</span>
                  <strong>${averageSpend.toFixed(2)}</strong>
                </article>
                <article className="analytics-card">
                  <span className="analytics-label">Top category</span>
                  <strong>{topCategory?.category ?? 'None'}</strong>
                </article>
              </div>

              <div className="insight-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Category split</h3>
                    <span>{categorySummary.length} categories</span>
                  </div>

                  <div className="bar-list">
                    {categorySummary.slice(0, 5).map((item) => (
                      <div className="bar-row" key={item.category}>
                        <div className="bar-copy">
                          <span>{item.category}</span>
                          <strong>${item.amount.toFixed(2)}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${Math.max(item.share, 8)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>6-month trend</h3>
                    <span>Spending velocity</span>
                  </div>

                  <div className="trend-chart">
                    {monthlyTrend.map((month) => (
                      <div className="trend-column" key={month.label}>
                        <div
                          className="trend-bar"
                          style={{
                            height: `${Math.max(
                              (month.amount / maxMonthlyAmount) * 160,
                              month.amount > 0 ? 18 : 8,
                            )}px`,
                          }}
                        >
                          <span>${month.amount.toFixed(0)}</span>
                        </div>
                        <label>{month.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel forecast-panel">
          <div className="panel-header">
            <p className="panel-kicker">AI Prediction</p>
            <h2>Next month spending outlook</h2>
          </div>

          {bootstrapping ? (
            <p className="muted-copy">Generating your forecast...</p>
          ) : !user ? (
            <p className="muted-copy">
              Sign in to see an AI forecast for next month&apos;s expenses.
            </p>
          ) : predictionLoading && !prediction ? (
            <p className="muted-copy">Loading your AI prediction panel...</p>
          ) : predictionError && !prediction ? (
            <div className="stack">
              <p className="error-text">{predictionError}</p>
              <button
                className="ghost-button"
                disabled={predictionRefreshing}
                onClick={() => void handleRefreshPrediction()}
                type="button"
              >
                {predictionRefreshing ? 'Refreshing...' : 'Refresh prediction'}
              </button>
            </div>
          ) : prediction ? (
            <div className="analytics-stack">
              <div className="prediction-hero">
                <div>
                  <p className="session-label">
                    Predicted total for {formatPredictionMonth(prediction.month)}
                  </p>
                  <strong className="prediction-total">
                    ${prediction.predictedTotal.toFixed(2)}
                  </strong>
                  <p className="prediction-summary">{prediction.summary}</p>
                </div>

                <div className="prediction-actions">
                  <span className="prediction-timestamp">
                    Updated {new Date(prediction.generatedAt).toLocaleString()}
                  </span>
                  <button
                    className="ghost-button"
                    disabled={predictionLoading || predictionRefreshing}
                    onClick={() => void handleRefreshPrediction()}
                    type="button"
                  >
                    {predictionRefreshing ? 'Refreshing...' : 'Refresh prediction'}
                  </button>
                </div>
              </div>

              {predictionError ? (
                <p className="error-text">{predictionError}</p>
              ) : null}

              <div className="insight-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Category predictions</h3>
                    <span>{prediction.categories.length} categories</span>
                  </div>

                  {prediction.categories.length === 0 ? (
                    <p className="muted-copy">
                      No category forecast is available yet.
                    </p>
                  ) : (
                    <div className="prediction-list">
                      {prediction.categories.map((category) => (
                        <article
                          className="prediction-item"
                          key={`${prediction.month}-${category.category}`}
                        >
                          <div className="bar-copy">
                            <div className="prediction-trend">
                              <span
                                className={`prediction-trend-arrow prediction-trend-${category.trend}`}
                              >
                                {getTrendArrow(category.trend)}
                              </span>
                              <span>{category.category}</span>
                            </div>
                            <strong>
                              ${category.predictedAmount.toFixed(2)}
                            </strong>
                          </div>

                          <div className="prediction-meta">
                            <span>{formatChangePercent(category.changePercent)}</span>
                            <span>
                              {formatConfidenceLabel(category.confidence)} confidence
                            </span>
                          </div>

                          <p className="expense-note">{category.rationale}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Insights</h3>
                    <span>{prediction.insights.length} notes</span>
                  </div>

                  {prediction.insights.length === 0 ? (
                    <p className="muted-copy">
                      No additional insights are available yet.
                    </p>
                  ) : (
                    <ul className="prediction-insights">
                      {prediction.insights.map((insight, index) => (
                        <li key={`${prediction.generatedAt}-${index}`}>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted-copy">
              No prediction is available yet. Refresh to generate one.
            </p>
          )}
        </section>

        <section className="panel savings-panel">
          <div className="panel-header">
            <p className="panel-kicker">Savings Goals</p>
            <h2>Build toward your next milestone</h2>
          </div>

          <div className="savings-layout">
            <div className="savings-list">
              {bootstrapping ? (
                <p className="muted-copy">Loading your savings plan...</p>
              ) : !user ? (
                <p className="muted-copy">
                  Sign in to create and track savings goals.
                </p>
              ) : savingsListLoading ? (
                <p className="muted-copy">Fetching your savings goals...</p>
              ) : savingsError && savingsGoals.length === 0 ? (
                <p className="error-text">{savingsError}</p>
              ) : savingsGoals.length === 0 ? (
                <p className="muted-copy">
                  No goals yet. Add your first savings target.
                </p>
              ) : (
                savingsGoals.map((goal) => (
                  <article className="savings-card" key={goal.id}>
                    <div className="expense-main">
                      <div>
                        <p className="expense-title">{goal.name}</p>
                        <p className="expense-meta">
                          ${goal.savedAmount.toFixed(2)} saved of $
                          {goal.targetAmount.toFixed(2)}
                        </p>
                      </div>

                      <div className="expense-side">
                        <strong>{goal.progressPercent.toFixed(0)}%</strong>
                        <button
                          className="ghost-button"
                          onClick={() => void handleDeleteSavingsGoal(goal.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="savings-progress">
                      <div className="savings-progress-track">
                        <div
                          className="savings-progress-fill"
                          style={{
                            width: `${Math.max(
                              Math.min(goal.progressPercent, 100),
                              goal.progressPercent > 0 ? 6 : 0,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="savings-meta-grid">
                      <div>
                        <span>Remaining</span>
                        <strong>${goal.remaining.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Monthly contribution</span>
                        <strong>${goal.monthlyContribution.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Months to goal</span>
                        <strong>
                          {goal.isComplete
                            ? 'Complete'
                            : goal.monthsToGoal === null
                              ? 'No timeline'
                              : `${goal.monthsToGoal} mo`}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="chart-card savings-form-card">
              <div className="chart-header">
                <h3>Add Goal</h3>
                <span>Start a new target</span>
              </div>

              <form className="stack" onSubmit={handleSavingsSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    disabled={!user || bootstrapping || savingsLoading}
                    onChange={(event) =>
                      setSavingsForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Emergency Fund"
                    value={savingsForm.name}
                  />
                </label>

                <label>
                  <span>Target amount</span>
                  <input
                    disabled={!user || bootstrapping || savingsLoading}
                    inputMode="decimal"
                    min="0.01"
                    onChange={(event) =>
                      setSavingsForm((current) => ({
                        ...current,
                        targetAmount: event.target.value,
                      }))
                    }
                    placeholder="10000"
                    step="0.01"
                    value={savingsForm.targetAmount}
                  />
                </label>

                <div className="grid-two">
                  <label>
                    <span>Saved amount</span>
                    <input
                      disabled={!user || bootstrapping || savingsLoading}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          savedAmount: event.target.value,
                        }))
                      }
                      placeholder="2000"
                      step="0.01"
                      value={savingsForm.savedAmount}
                    />
                  </label>

                  <label>
                    <span>Monthly contribution</span>
                    <input
                      disabled={!user || bootstrapping || savingsLoading}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          monthlyContribution: event.target.value,
                        }))
                      }
                      placeholder="500"
                      step="0.01"
                      value={savingsForm.monthlyContribution}
                    />
                  </label>
                </div>

                {savingsError ? <p className="error-text">{savingsError}</p> : null}

                <button
                  className="primary-button"
                  disabled={!user || bootstrapping || savingsLoading}
                  type="submit"
                >
                  {savingsLoading ? 'Saving...' : 'Add Goal'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="panel ledger">
          <div className="panel-header">
            <p className="panel-kicker">Expense Ledger</p>
            <h2>Recent spending</h2>
          </div>

          {bootstrapping ? (
            <p className="muted-copy">Loading your session...</p>
          ) : !user ? (
            <p className="muted-copy">
              Sign in to view and manage your expenses.
            </p>
          ) : expenses.length === 0 ? (
            <p className="muted-copy">No expenses yet. Add your first record.</p>
          ) : (
            <div className="expense-list">
              {expenses.map((expense) => (
                <article className="expense-card" key={expense.id}>
                  <div className="expense-main">
                    <div>
                      <p className="expense-title">{expense.title}</p>
                      <p className="expense-meta">
                        {expense.category} |{' '}
                        {new Date(expense.spentAt).toLocaleString()}
                      </p>
                      {expense.note ? (
                        <p className="expense-note">{expense.note}</p>
                      ) : null}
                    </div>
                    <div className="expense-side">
                      <strong>${expense.amount.toFixed(2)}</strong>
                      <button
                        className="ghost-button"
                        onClick={() => void handleDeleteExpense(expense.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
      <FinanceChatbot ready={Boolean(user && token) && !bootstrapping} token={token} />
    </div>
  );
}

export default App;
