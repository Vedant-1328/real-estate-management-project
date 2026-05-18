import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission.js';
import ExpenseList from './ExpenseList.jsx';
import VehicleExpenseSummary from './VehicleExpenseSummary.jsx';

export default function DailyExpensesPage() {
  const canView = usePermission('daily_expenses', 'view');
  const [tab, setTab] = useState('list');

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view daily expenses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Expenses</h1>
        <p className="mt-1 text-sm text-slate-600">Track vehicle expenses and receipts</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'list'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Expense List
        </button>
        <button
          type="button"
          onClick={() => setTab('summary')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'summary'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Vehicle Summary
        </button>
      </div>

      {tab === 'list' ? <ExpenseList /> : <VehicleExpenseSummary />}
    </div>
  );
}
