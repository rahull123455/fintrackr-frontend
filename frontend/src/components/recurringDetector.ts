import { Expense } from '../types';

interface RecurringPattern {
  title: string;
  category: string;
  averageAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  occurrences: Date[];
  lastDate: Date;
  nextPredicted: Date;
  confidence: number; // 0-100
}

export function detectRecurringExpenses(expenses: Expense[]): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  const titleGroups = groupByTitle(expenses);
  
  for (const [title, exps] of Object.entries(titleGroups)) {
    if (exps.length < 2) continue;
    
    const sortedExps = exps.sort((a, b) => 
      new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime()
    );
    
    const intervals = [];
    for (let i = 1; i < sortedExps.length; i++) {
      const days = daysBetween(
        new Date(sortedExps[i-1].spentAt),
        new Date(sortedExps[i].spentAt)
      );
      intervals.push(days);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const amounts = sortedExps.map(e => e.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountVariance = Math.max(...amounts) - Math.min(...amounts);
    const confidence = calculateConfidence(intervals, avgInterval, amountVariance, avgAmount);
    
    if (confidence < 50) continue;
    
    const frequency = determineFrequency(avgInterval);
    const lastDate = new Date(sortedExps[sortedExps.length - 1].spentAt);
    const nextPredicted = predictNextDate(lastDate, frequency);
    
    patterns.push({
      title,
      category: sortedExps[0].category,
      averageAmount: avgAmount,
      frequency,
      occurrences: sortedExps.map(e => new Date(e.spentAt)),
      lastDate,
      nextPredicted,
      confidence,
    });
  }
  
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

function groupByTitle(expenses: Expense[]): Record<string, Expense[]> {
  return expenses.reduce((acc, exp) => {
    const normalized = exp.title.toLowerCase().trim();
    if (!acc[normalized]) acc[normalized] = [];
    acc[normalized].push(exp);
    return acc;
  }, {} as Record<string, Expense[]>);
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function determineFrequency(avgDays: number): RecurringPattern['frequency'] {
  if (avgDays <= 3) return 'weekly';
  if (avgDays <= 10) return 'biweekly';
  if (avgDays <= 40) return 'monthly';
  if (avgDays <= 100) return 'quarterly';
  return 'yearly';
}

function predictNextDate(lastDate: Date, frequency: RecurringPattern['frequency']): Date {
  const next = new Date(lastDate);
  switch (frequency) {
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

function calculateConfidence(
  intervals: number[], 
  avgInterval: number, 
  amountVariance: number, 
  avgAmount: number
): number {
  if (intervals.length < 2) return 0;
  
  // Interval consistency (lower std dev = higher score)
  const stdDev = Math.sqrt(
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
  );
  const intervalScore = Math.max(0, 100 - (stdDev / avgInterval) * 50);
  
  // Amount consistency
  const amountScore = amountVariance < avgAmount * 0.3 ? 100 : 
    amountVariance < avgAmount * 0.5 ? 70 : 40;
  
  // Number of occurrences
  const occurrenceScore = Math.min(100, intervals.length * 25);
  
  return Math.round((intervalScore + amountScore + occurrenceScore) / 3);
}