// src/utils/expenseTemplates.ts
export interface ExpenseTemplate {
  id: string;
  title: string;
  category: string;
  amount?: number;
  note?: string;
  icon: string;
}

export const defaultTemplates: ExpenseTemplate[] = [
  { id: '1', title: 'Groceries', category: 'Food', icon: '🛒' },
  { id: '2', title: 'Taxi Ride', category: 'Travel', icon: '🚕' },
  { id: '3', title: 'Restaurant', category: 'Food', amount: 500, icon: '🍽️' },
  { id: '4', title: 'Electricity Bill', category: 'Bills', icon: '💡' },
  { id: '5', title: 'Internet Bill', category: 'Bills', amount: 1000, icon: '🌐' },
  { id: '6', title: 'Fuel', category: 'Travel', icon: '⛽' },
];

export function getStoredTemplates(): ExpenseTemplate[] {
  const stored = localStorage.getItem('fintrackr_templates');
  return stored ? JSON.parse(stored) : defaultTemplates;
}

export function saveTemplates(templates: ExpenseTemplate[]) {
  localStorage.setItem('fintrackr_templates', JSON.stringify(templates));
}