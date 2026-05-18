import { usePermission } from '../../hooks/usePermission.js';
import EmployeeSalaryProcessing from './EmployeeSalaryProcessing.jsx';

export default function EmployeeSalaryProcessingPage() {
  const canView = usePermission('employee_advances', 'view');

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view employee salary processing.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Employee Salary Processing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Deduct pending advances and finalize net salary for employees
        </p>
      </header>
      <EmployeeSalaryProcessing />
    </section>
  );
}
