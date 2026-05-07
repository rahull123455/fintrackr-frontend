import * as XLSX from 'xlsx';
import { Expense } from '../types';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function exportExpensesCSV(expenses: Expense[]) {
  const data = expenses.map(exp => ({
    Title: exp.title,
    Category: exp.category,
    Amount: exp.amount,
    'Amount (Formatted)': formatINR(exp.amount),
    Date: new Date(exp.spentAt).toLocaleDateString('en-IN'),
    'Date & Time': new Date(exp.spentAt).toLocaleString('en-IN'),
    Note: exp.note || '',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 20)
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `fintrackr-expenses-${new Date().toISOString().split('T')[0]}.xlsx`);
}