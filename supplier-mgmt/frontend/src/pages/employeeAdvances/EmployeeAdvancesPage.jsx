import { usePermission } from '../../hooks/usePermission.js';
import EmployeeAdvanceList from './EmployeeAdvanceList.jsx';

export default function EmployeeAdvancesPage() {
  const canView = usePermission('employee_advances', 'view');

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view employee advances.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Employee Advances</h1>
        <p className="mt-1 text-sm text-slate-600">Record and manage employee salary advances</p>
      </header>
      <EmployeeAdvanceList />
    </section>
  );
}
