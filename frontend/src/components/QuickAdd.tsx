// src/components/QuickAdd.tsx
import { useState } from 'react';
import { getStoredTemplates, ExpenseTemplate } from '../utils/expenseTemplates';

interface QuickAddProps {
  onQuickAdd: (template: ExpenseTemplate) => void;
}

export function QuickAdd({ onQuickAdd }: QuickAddProps) {
  const [templates] = useState(getStoredTemplates);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
      {templates.map(template => (
        <button
          key={template.id}
          className="ghost-button"
          style={{ padding: '0.5rem 1rem' }}
          onClick={() => onQuickAdd(template)}
        >
          {template.icon} {template.title}
        </button>
      ))}
    </div>
  );
}