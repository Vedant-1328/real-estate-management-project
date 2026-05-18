import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { LoginPage } from './pages/auth/index.js';
import { HomePage } from './pages/home/index.js';
import { CompanyList } from './pages/companies/index.js';
import { ExpenseTypeList } from './pages/expenseTypes/index.js';
import { JobTypeList } from './pages/jobTypes/index.js';
import { SiteList } from './pages/sites/index.js';
import { VehicleList } from './pages/vehicles/index.js';
import { DriverList } from './pages/drivers/index.js';
import { EmployeeList } from './pages/employees/index.js';
import { AssignmentList } from './pages/jobAssignments/index.js';
import { OutsideDriverJobList } from './pages/outsideDriverJobs/index.js';
import { EodEntriesPage } from './pages/eodEntries/index.js';
import { DailyExpensesPage } from './pages/dailyExpenses/index.js';
import { InvoiceList, GenerateInvoice, InvoiceDetail } from './pages/invoices/index.js';
import { PaymentList } from './pages/payments/index.js';
import { DriverAdvancesPage, DriverSalaryProcessingPage } from './pages/driverAdvances/index.js';
import { EmployeeAdvancesPage, EmployeeSalaryProcessingPage } from './pages/employeeAdvances/index.js';
import {
  DailyJobReport,
  VehicleReport,
  DriverReport,
  CompanyBillingReport,
  ExpenseReport,
  ProfitReport,
  SalaryReport,
} from './pages/reports/index.js';
import { UserList, RoleList, RolePermissions } from './pages/settings/index.js';
import NotFoundPage from './pages/shared/NotFoundPage.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ConfirmProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<HomePage />} />

              <Route path="/companies" element={<CompanyList />} />
              <Route path="/job-types" element={<JobTypeList />} />
              <Route path="/vehicles" element={<VehicleList />} />
              <Route path="/drivers" element={<DriverList />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/sites" element={<SiteList />} />
              <Route path="/expense-types" element={<ExpenseTypeList />} />

              <Route path="/job-assignments" element={<AssignmentList />} />
              <Route path="/eod-entries" element={<EodEntriesPage />} />
              <Route path="/daily-expenses" element={<DailyExpensesPage />} />
              <Route path="/outside-driver-jobs" element={<OutsideDriverJobList />} />

              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/generate" element={<GenerateInvoice />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/payments" element={<PaymentList />} />

              <Route path="/driver-advances" element={<DriverAdvancesPage />} />
              <Route path="/driver-salary-processing" element={<DriverSalaryProcessingPage />} />
              <Route path="/employee-advances" element={<EmployeeAdvancesPage />} />
              <Route path="/employee-salary-processing" element={<EmployeeSalaryProcessingPage />} />
              <Route path="/salary-processing" element={<Navigate to="/driver-salary-processing" replace />} />

              <Route path="/reports/daily-job" element={<DailyJobReport />} />
              <Route path="/reports/vehicle" element={<VehicleReport />} />
              <Route path="/reports/driver" element={<DriverReport />} />
              <Route path="/reports/company-billing" element={<CompanyBillingReport />} />
              <Route path="/reports/expense" element={<ExpenseReport />} />
              <Route path="/reports/profit" element={<ProfitReport />} />
              <Route path="/reports/salary" element={<SalaryReport />} />

              <Route path="/users" element={<UserList />} />
              <Route path="/roles" element={<RoleList />} />
              <Route path="/roles/:id/permissions" element={<RolePermissions />} />

              <Route path="/suppliers" element={<Navigate to="/companies" replace />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
