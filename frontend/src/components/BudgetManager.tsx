// src/components/BudgetManager.tsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Budget, BudgetStatus } from '../types/budget';
import { Expense } from '../types';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BudgetManagerProps {
  expenses: Expense[];
}

export function BudgetManager({ expenses }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('fintrackr_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  const [newBudget, setNewBudget] = useState({
    category: 'Food',
    monthlyLimit: '',
    alertThreshold: '80',
  });

  useEffect(() => {
    localStorage.setItem('fintrackr_budgets', JSON.stringify(budgets));
  }, [budgets]);

  const getBudgetStatus = (budget: Budget): BudgetStatus => {
    const now = new Date();
    const currentSpending = expenses
      .filter(e => {
        const d = new Date(e.spentAt);
        return e.category === budget.category &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const percentageUsed = (currentSpending / budget.monthlyLimit) * 100;
    
    return {
      budget,
      currentSpending,
      percentageUsed,
      remaining: budget.monthlyLimit - currentSpending,
      isOverBudget: currentSpending > budget.monthlyLimit,
      isNearLimit: percentageUsed >= budget.alertThreshold && !currentSpending,
    };
  };

  const addBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.monthlyLimit) return;

    const budget: Budget = {
      id: Date.now().toString(),
      ...newBudget,
      monthlyLimit: Number(newBudget.monthlyLimit),
      alertThreshold: Number(newBudget.alertThreshold),
      createdAt: new Date().toISOString(),
    };

    setBudgets(prev => [...prev, budget]);
    setNewBudget({ category: 'Food', monthlyLimit: '', alertThreshold: '80' });
    toast.success('Budget added!');
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    toast.success('Budget removed');
  };

  return (
    <div className="analytics-stack">
      <div className="chart-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Budget Limits</h3>
        
        <form onSubmit={addBudget} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select
            value={newBudget.category}
            onChange={e => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
            style={{ width: 'auto' }}
          >
            {['Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Work', 'Other'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <input
            type="number"
            placeholder="Monthly limit"
            value={newBudget.monthlyLimit}
            onChange={e => setNewBudget(prev => ({ ...prev, monthlyLimit: e.target.value }))}
            style={{ width: '150px' }}
            min="0"
          />
          
          <button type="submit" className="primary-button">Set Budget</button>
        </form>
        
        {budgets.length === 0 ? (
          <p className="muted-copy">No budgets set yet.</p>
        ) : (
          <div className="savings-list">
            {budgets.map(budget => {
              const status = getBudgetStatus(budget);
              return (
                <article className="savings-card" key={budget.id}>
                  <div className="expense-main">
                    <div>
                      <p className="expense-title">{budget.category}</p>
                      <p className="expense-meta">
                        {formatINR(status.currentSpending)} / {formatINR(budget.monthlyLimit)}
                      </p>
                    </div>
                    <div className="expense-side">
                      <strong style={{ 
                        color: status.isOverBudget ? 'var(--danger)' : 
                               status.isNearLimit ? '#ffd17d' : 'var(--accent-2)' 
                      }}>
                        {status.percentageUsed.toFixed(1)}%
                      </strong>
                      <button className="ghost-button" onClick={() => deleteBudget(budget.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="savings-progress">
                    <div className="savings-progress-track">
                      <div
                        className="savings-progress-fill"
                        style={{
                          width: `${Math.min(status.percentageUsed, 100)}%`,
                          background: status.isOverBudget 
                            ? 'linear-gradient(90deg, #ff8570, #ff6b6b)'
                            : status.isNearLimit
                            ? 'linear-gradient(90deg, #ffd17d, #ff9264)'
                            : undefined,
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}