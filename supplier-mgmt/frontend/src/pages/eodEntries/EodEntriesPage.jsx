import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission.js';
import EodList from './EodList.jsx';
import EodPendingList from './EodPendingList.jsx';

export default function EodEntriesPage() {
  const canView = usePermission('eod_entries', 'view');
  const [tab, setTab] = useState('pending');
  const [listKey, setListKey] = useState(0);

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view EOD entries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">End of Day Entries</h1>
        <p className="mt-1 text-sm text-slate-600">Record actual trips and amounts for daily assignments</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'pending'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pending Today
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'all'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Entries
        </button>
      </div>

      {tab === 'pending' ? (
        <EodPendingList onEntryCreated={() => setListKey((k) => k + 1)} />
      ) : (
        <EodList key={listKey} />
      )}
    </div>
  );
}
