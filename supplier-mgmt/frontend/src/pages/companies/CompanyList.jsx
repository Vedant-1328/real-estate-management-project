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

export default function CompanyList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('companies', 'add');
  const canEdit = usePermission('companies', 'edit');
  const canDelete = usePermission('companies', 'delete');
  const canView = usePermission('companies', 'view');

  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [ratesCompany, setRatesCompany] = useState(null);

  const loadCompanies = useCallback(async () => {
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
      });
      setCompanies(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setLoadError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [canView, page, limit, search, status]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return undefined;
    }
    const timer = setTimeout(loadCompanies, 300);
    return () => clearTimeout(timer);
  }, [canView, loadCompanies]);

  const handleDelete = async (company) => {
    const ok = await confirm({
      title: 'Delete company',
      message: `Delete "${company.companyName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteCompany(company.id);
      toast.success('Company deleted');
      loadCompanies();
    } catch {
      toast.error('Failed to delete company');
    }
  };

  const openCreate = () => {
    setEditingCompany(null);
    setFormOpen(true);
  };

  const openEdit = (company) => {
    setEditingCompany(company);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="mt-1 text-sm text-slate-600">Manage company master records and job rates</p>
        </div>
        {canAdd && <Button onClick={openCreate}>Add Company</Button>}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search by name, contact, mobile, GST…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <section>
          <Table
            loading={loading}
            error={loadError}
            onRetry={loadCompanies}
            columns={[
              { key: 'companyName', label: 'Company Name' },
              { key: 'contactPerson', label: 'Contact Person' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'gstNumber', label: 'GST Number' },
              { key: 'paymentTerms', label: 'Payment Terms' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={companies.map((c) => ({
              ...c,
              gstNumber: c.gstNumber || '—',
              paymentTerms: c.paymentTerms || '—',
              status: (
                <Badge variant={c.status === 'active' ? 'success' : 'default'}>
                  {c.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              ),
              actions: (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    onClick={() => openRates(c)}
                  >
                    View Rates
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(c)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ),
            }))}
          />

        <footer className="flex items-center justify-between border border-t-0 border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
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

      <SlideOver
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCompany(null);
        }}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
      >
        <CompanyForm
          company={editingCompany}
          onCancel={() => {
            setFormOpen(false);
            setEditingCompany(null);
          }}
          onSuccess={() => {
            setFormOpen(false);
            setEditingCompany(null);
            loadCompanies();
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
