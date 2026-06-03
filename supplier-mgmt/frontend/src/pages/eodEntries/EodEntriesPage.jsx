import { usePermission } from '../../hooks/usePermission.js';
import EodList from './EodList.jsx';

export default function EodEntriesPage() {
  const canView = usePermission('eod_entries', 'view');

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
        <p className="mt-1 text-sm text-slate-600">
          One afternoon entry per vehicle per day. Rate and billing company are set automatically from
          sites and rate cards.
        </p>
      </div>
      <EodList />
    </div>
  );
}
