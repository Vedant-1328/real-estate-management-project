import { useCallback, useEffect, useState } from 'react';
import { deleteCompany, fetchCompanies } from '../../api/companies.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import SlideOver from '../../components/SlideOver.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import CompanyForm from './CompanyForm.jsx';
import CompanyRates from './CompanyRates.jsx';

const SECTION_META = {
  own: {
    title: 'Own Companies',
    description: 'Your operating entities — used as bill-from on invoices (bank details on PDF).',
    addLabel: 'Add Own Company',
    formTitle: { create: 'Add Own Company', edit: 'Edit Own Company' },
  },
  customer: {
    title: 'Customer Companies',
    description: 'Clients you bill — linked to sites, invoices, and job rate cards.',
    addLabel: 'Add Customer Company',
    formTitle: { create: 'Add Customer Company', edit: 'Edit Customer Company' },
  },
};

function CompanySection({
  companyType,
  canAdd,
  canEdit,
  canDelete,
  canView,
  search,
  status,
  refreshToken,
  deletingId,
  onEdit,
  onRates,
  onDelete,
}) {
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const meta = SECTION_META[companyType];

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchCompanies({
        page,
        limit,
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        companyType,
      });
      setCompanies(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      setLoadError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [canView, page, limit, search, status, companyType, refreshToken]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return undefined;
    }
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, companyType]);

  const columns =
    companyType === 'customer'
      ? [
          { key: 'companyName', label: 'Company Name' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'gstNumber', label: 'GST Number' },
          { key: 'paymentTerms', label: 'Payment Terms' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ]
      : [
          { key: 'companyName', label: 'Company Name' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'gstNumber', label: 'GST Number' },
          { key: 'bankAccountNumber', label: 'Bank A/C' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ];

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{meta.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
        </div>
        {canAdd && (
          <Button onClick={() => onEdit(null, companyType)}>{meta.addLabel}</Button>
        )}
      </div>

      <Table
        loading={loading}
        error={loadError}
        onRetry={load}
        emptyMessage={`No ${companyType === 'own' ? 'own' : 'customer'} companies found.`}
        columns={columns}
        data={companies.map((c) => ({
          ...c,
          gstNumber: c.gstNumber || '—',
          paymentTerms: c.paymentTerms || '—',
          bankAccountNumber: c.bankAccountNumber || '—',
          status: (
            <Badge variant={c.status === 'active' ? 'success' : 'default'}>
              {c.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          ),
          actions: (
            <div className="flex flex-wrap gap-2">
              {companyType === 'customer' && (
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => onRates(c)}
                >
                  View Rates
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  onClick={() => onEdit(c, companyType)}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  disabled={deletingId === c.id}
                  onClick={() => onDelete(c, load)}
                >
                  {deletingId === c.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          ),
        }))}
      />

      <footer className="flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-600">
          Page {page} of {totalPages} · {total} total
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </footer>
    </section>
  );
}

export default function CompanyList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('companies', 'add');
  const canEdit = usePermission('companies', 'edit');
  const canDelete = usePermission('companies', 'delete');
  const canView = usePermission('companies', 'view');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [refreshToken, setRefreshToken] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formCompanyType, setFormCompanyType] = useState('customer');
  const [ratesOpen, setRatesOpen] = useState(false);
  const [ratesCompany, setRatesCompany] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (company, reload) => {
    if (deletingId != null) return;
    const ok = await confirm({
      title: 'Delete company',
      message: `Delete "${company.companyName}" and all related data (sites, job assignments, EOD entries, invoices, and rates)? This cannot be undone.`,
      confirmLabel: 'Delete everything',
    });
    if (!ok) return;
    setDeletingId(company.id);
    try {
      const { data } = await deleteCompany(company.id, { cascade: true });
      toast.success(data.message || 'Company deleted');
      setRefreshToken((t) => t + 1);
      await reload?.();
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 404) {
        toast.success('Company already removed');
        setRefreshToken((t) => t + 1);
        await reload?.();
        return;
      }
      toast.error(message || 'Failed to delete company');
    } finally {
      setDeletingId(null);
    }
  };

  const openForm = (company, type) => {
    setEditingCompany(company);
    setFormCompanyType(company?.companyType || type || 'customer');
    setFormOpen(true);
  };

  const openRates = (company) => {
    setRatesCompany(company);
    setRatesOpen(true);
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view companies.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        <p className="mt-1 text-sm text-slate-600">
          Own companies issue invoices; customer companies are billed and carry job rates.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search by name, contact, mobile, GST…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <CompanySection
        companyType="own"
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        canView={canView}
        search={search}
        status={status}
        refreshToken={refreshToken}
        deletingId={deletingId}
        onEdit={openForm}
        onRates={openRates}
        onDelete={handleDelete}
      />

      <CompanySection
        companyType="customer"
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        canView={canView}
        search={search}
        status={status}
        refreshToken={refreshToken}
        deletingId={deletingId}
        onEdit={openForm}
        onRates={openRates}
        onDelete={handleDelete}
      />

      <SlideOver
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCompany(null);
        }}
        title={
          editingCompany
            ? SECTION_META[formCompanyType].formTitle.edit
            : SECTION_META[formCompanyType].formTitle.create
        }
      >
        <CompanyForm
          company={editingCompany}
          defaultCompanyType={formCompanyType}
          onCancel={() => {
            setFormOpen(false);
            setEditingCompany(null);
          }}
          onSuccess={() => {
            setFormOpen(false);
            setEditingCompany(null);
            setRefreshToken((t) => t + 1);
          }}
        />
      </SlideOver>

      <CompanyRates
        company={ratesCompany}
        open={ratesOpen}
        onClose={() => {
          setRatesOpen(false);
          setRatesCompany(null);
        }}
      />
    </div>
  );
}
