import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import NotFoundPage from './pages/shared/NotFoundPage.jsx';

const lazyNamed = (importFn, name) =>
  lazy(() => importFn().then((m) => ({ default: m[name] })));

const LoginPage = lazyNamed(() => import('./pages/auth/index.js'), 'LoginPage');
const HomePage = lazyNamed(() => import('./pages/home/index.js'), 'HomePage');
const CompanyList = lazyNamed(() => import('./pages/companies/index.js'), 'CompanyList');
const ExpenseTypeList = lazyNamed(() => import('./pages/expenseTypes/index.js'), 'ExpenseTypeList');
const JobTypeList = lazyNamed(() => import('./pages/jobTypes/index.js'), 'JobTypeList');
const SiteList = lazyNamed(() => import('./pages/sites/index.js'), 'SiteList');
const VehicleList = lazyNamed(() => import('./pages/vehicles/index.js'), 'VehicleList');
const DriverList = lazyNamed(() => import('./pages/drivers/index.js'), 'DriverList');
const EmployeeList = lazyNamed(() => import('./pages/employees/index.js'), 'EmployeeList');
const OutsideDriverJobList = lazyNamed(
  () => import('./pages/outsideDriverJobs/index.js'),
  'OutsideDriverJobList'
);
const EodEntriesPage = lazyNamed(() => import('./pages/eodEntries/index.js'), 'EodEntriesPage');
const DailyExpensesPage = lazyNamed(() => import('./pages/dailyExpenses/index.js'), 'DailyExpensesPage');
const InvoiceList = lazyNamed(() => import('./pages/invoices/index.js'), 'InvoiceList');
const GenerateInvoice = lazyNamed(() => import('./pages/invoices/index.js'), 'GenerateInvoice');
const InvoiceDetail = lazyNamed(() => import('./pages/invoices/index.js'), 'InvoiceDetail');
const EditInvoice = lazyNamed(() => import('./pages/invoices/index.js'), 'EditInvoice');
const PaymentList = lazyNamed(() => import('./pages/payments/index.js'), 'PaymentList');
const DriverAdvancesPage = lazyNamed(() => import('./pages/driverAdvances/index.js'), 'DriverAdvancesPage');
const DriverSalaryProcessingPage = lazyNamed(
  () => import('./pages/driverAdvances/index.js'),
  'DriverSalaryProcessingPage'
);
const EmployeeAdvancesPage = lazyNamed(
  () => import('./pages/employeeAdvances/index.js'),
  'EmployeeAdvancesPage'
);
const EmployeeSalaryProcessingPage = lazyNamed(
  () => import('./pages/employeeAdvances/index.js'),
  'EmployeeSalaryProcessingPage'
);
const DailyJobReport = lazyNamed(() => import('./pages/reports/index.js'), 'DailyJobReport');
const VehicleReport = lazyNamed(() => import('./pages/reports/index.js'), 'VehicleReport');
const DriverReport = lazyNamed(() => import('./pages/reports/index.js'), 'DriverReport');
const CompanyBillingReport = lazyNamed(
  () => import('./pages/reports/index.js'),
  'CompanyBillingReport'
);
const ExpenseReport = lazyNamed(() => import('./pages/reports/index.js'), 'ExpenseReport');
const ProfitReport = lazyNamed(() => import('./pages/reports/index.js'), 'ProfitReport');
const SalaryReport = lazyNamed(() => import('./pages/reports/index.js'), 'SalaryReport');
const UserList = lazyNamed(() => import('./pages/settings/index.js'), 'UserList');
const RoleList = lazyNamed(() => import('./pages/settings/index.js'), 'RoleList');
const RolePermissions = lazyNamed(() => import('./pages/settings/index.js'), 'RolePermissions');

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

                  <Route path="/job-assignments" element={<Navigate to="/eod-entries" replace />} />
                  <Route path="/eod-entries" element={<EodEntriesPage />} />
                  <Route path="/daily-expenses" element={<DailyExpensesPage />} />
                  <Route path="/outside-driver-jobs" element={<OutsideDriverJobList />} />

                  <Route path="/invoices" element={<InvoiceList />} />
                  <Route path="/invoices/generate" element={<GenerateInvoice />} />
                  <Route path="/invoices/:id/edit" element={<EditInvoice />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail />} />
                  <Route path="/payments" element={<PaymentList />} />

                  <Route path="/driver-advances" element={<DriverAdvancesPage />} />
                  <Route path="/driver-salary-processing" element={<DriverSalaryProcessingPage />} />
                  <Route path="/employee-advances" element={<EmployeeAdvancesPage />} />
                  <Route path="/employee-salary-processing" element={<EmployeeSalaryProcessingPage />} />
                  <Route
                    path="/salary-processing"
                    element={<Navigate to="/driver-salary-processing" replace />}
                  />

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
