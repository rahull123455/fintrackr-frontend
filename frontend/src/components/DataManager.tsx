import { useState } from 'react';
import toast from 'react-hot-toast';
import { Expense } from '../types';

interface DataManagerProps {
  expenses: Expense[];
  onImport: (expenses: Expense[]) => void;
}

export function DataManager({ expenses, onImport }: DataManagerProps) {
  const [importing, setImporting] = useState(false);

  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      expenses,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrackr-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully!');
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (!data.expenses || !Array.isArray(data.expenses)) {
          throw new Error('Invalid data format');
        }
        
        // Validate expense structure
        data.expenses.forEach((exp: any) => {
          if (!exp.id || !exp.title || !exp.amount || !exp.category || !exp.spentAt) {
            throw new Error('Invalid expense format');
          }
        });
        
        onImport(data.expenses);
        toast.success(`Imported ${data.expenses.length} expenses!`);
      } catch (error) {
        toast.error('Invalid backup file');
        console.error(error);
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="chart-card" style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem' }}>Data Management</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="ghost-button" onClick={handleExportJSON}>
          📤 Export Backup
        </button>
        <label className="ghost-button" style={{ cursor: 'pointer' }}>
          📥 Import Backup
          <input
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            style={{ display: 'none' }}
            disabled={importing}
          />
        </label>
      </div>
    </div>
  );
}