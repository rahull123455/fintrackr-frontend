import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense } from '../types';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function exportExpensesPDF(expenses: Expense[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(255, 146, 100);
  doc.text('FinTrackr - Expense Report', 14, 22);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
  
  // Summary
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Expenses: ${formatINR(totalSpent)}`, 14, 40);
  doc.text(`Total Transactions: ${expenses.length}`, 14, 48);
  
  // Table
  const tableData = expenses.map(exp => [
    exp.title,
    exp.category,
    formatINR(exp.amount),
    new Date(exp.spentAt).toLocaleDateString('en-IN'),
    exp.note || '-'
  ]);
  
  autoTable(doc, {
    head: [['Title', 'Category', 'Amount', 'Date', 'Note']],
    body: tableData,
    startY: 55,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 146, 100],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Category Summary
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(14);
  doc.setTextColor(255, 146, 100);
  doc.text('Category Summary', 14, finalY);
  
  const categoryData = Object.entries(categoryTotals).map(([cat, amount]) => [cat, formatINR(amount)]);
  
  autoTable(doc, {
    head: [['Category', 'Total']],
    body: categoryData,
    startY: finalY + 5,
    styles: { fontSize: 9 },
    headStyles: {
      fillColor: [108, 227, 207],
      textColor: [0, 0, 0],
    },
  });
  
  // Save
  doc.save(`fintrackr-expenses-${new Date().toISOString().split('T')[0]}.pdf`);
}