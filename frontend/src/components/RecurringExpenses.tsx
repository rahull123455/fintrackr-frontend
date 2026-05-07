// src/components/RecurringExpenses.tsx
import { useMemo } from 'react';
import { Expense } from '../types';
import { detectRecurringExpenses } from '../utils/recurringDetector';

interface RecurringExpensesProps {
  expenses: Expense[];
  formatINR: (amount: number) => string;
}

export function RecurringExpenses({ expenses, formatINR }: RecurringExpensesProps) {
  const patterns = useMemo(() => detectRecurringExpenses(expenses), [expenses]);

  if (patterns.length === 0) {
    return <p className="muted-copy">No recurring patterns detected yet.</p>;
  }

  return (
    <div className="savings-list">
      {patterns.map((pattern, index) => (
        <article className="savings-card" key={index}>
          <div className="expense-main">
            <div>
              <p className="expense-title">{pattern.title}</p>
              <p className="expense-meta">
                {pattern.category} • {pattern.frequency} • 
                ~{formatINR(pattern.averageAmount)}
              </p>
            </div>
            <div className="expense-side">
              <span className="badge badge-other" style={{ background: '#6ce3cf22', color: '#6ce3cf' }}>
                {pattern.confidence}% match
              </span>
            </div>
          </div>
          <div className="prediction-meta" style={{ marginTop: '0.75rem' }}>
            <span>Next predicted: {pattern.nextPredicted.toLocaleDateString('en-IN')}</span>
            <span>•</span>
            <span>{pattern.occurrences.length} occurrences</span>
          </div>
        </article>
      ))}
    </div>
  );
}