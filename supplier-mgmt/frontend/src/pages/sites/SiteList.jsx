import { useCallback, useEffect, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import {
  convertTemporarySite,
  deleteSite,
  fetchSites,
  fetchTemporarySites,
} from '../../api/sites.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import SiteForm from './SiteForm.jsx';

const SITE_TYPE_VARIANT = {
  pickup: 'default',
  delivery: 'warning',
  both: 'success',
  site_by_site: 'default',
};

export default function SiteList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('sites', 'view');
  const canAdd = usePermission('sites', 'add');
  const canEdit = usePermission('sites', 'edit');
  const canDelete = usePermission('sites', 'delete');

  const [tab, setTab] = useState('master');
  const [sites, setSites] = useState([]);
  const [tempSites, setTempSites] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [companyId, setCompanyId] = useState('');
  const [siteType, setSiteType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(null);

  const loadCompanies = useCallback(() => {
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCompanies(res.data?.data ?? []))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    loadCompanies();
    if (canView) {
      fetchTemporarySites()
        .then((res) => setTempSites(res.data?.data ?? []))
        .catch(() => { });
    }
  }, [canView, loadCompanies]);

  useEffect(() => {
    if (formOpen) loadCompanies();
  }, [formOpen, loadCompanies]);

  const loadMaster = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchSites({
        companyId: companyId || undefined,
        siteType: siteType === 'all' ? undefined : siteType,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      });
      setSites(data.data ?? []);
    } catch {
      setLoadError('Failed to load sites.');
    } finally {
      setLoading(false);
    }
  }, [canView, companyId, siteType, status, search]);

  const loadTemp = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchTemporarySites();
      setTempSites(data.data ?? []);
    } catch {
      toast.error('Failed to load temporary sites');
    } finally {
      setLoading(false);
    }
  }, [canView, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'master') loadMaster();
      else loadTemp();
    }, 300);
    return () => clearTimeout(timer);
  }, [tab, loadMaster, loadTemp]);

  const handleDelete = async (site) => {
    const ok = await confirm({
      title: 'Delete site',
      message: `Delete "${site.siteName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteSite(site.id);
      toast.success('Site deleted');
      loadMaster();
    } catch {
      toast.error('Failed to delete site');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view sites.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
          <p className="mt-1 text-sm text-slate-600">Pickup and delivery locations by company</p>
        </div>
        {canAdd && tab === 'master' && (
          <Button
            onClick={() => {
              setEditingSite(null);
              setFormOpen(true);
            }}
          >
            Add Site
          </Button>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('master')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === 'master' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          Master Sites
        </button>
        <button
          type="button"
          onClick={() => setTab('temporary')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === 'temporary' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          Temporary Sites
          {tempSites.length > 0 && tab !== 'temporary' && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {tempSites.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'master' && (
        <>
          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <input
              type="search"
              placeholder="Search name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
            <select
              value={siteType}
              onChange={(e) => setSiteType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="both">Both</option>
              <option value="site_by_site">Site-by-Site</option>
            </select>
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

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table
              loading={loading}
              error={loadError}
              onRetry={loadMaster}
              columns={[
                { key: 'siteName', label: 'Site Name' },
                { key: 'company', label: 'Company' },
                { key: 'city', label: 'City' },
                { key: 'siteType', label: 'Site Type' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions' },
              ]}
              data={sites.map((s) => ({
                ...s,
                company: s.company?.companyName ?? '—',
                city: s.city || '—',
                siteType: (
                  <Badge variant={SITE_TYPE_VARIANT[s.siteType]}>
                    {s.siteTypeLabel ||
                      (s.siteType === 'pickup'
                        ? 'Pickup'
                        : s.siteType === 'delivery'
                          ? 'Delivery'
                          : s.siteType === 'site_by_site'
                            ? 'Site-by-Site'
                            : 'Both')}
                  </Badge>
                ),
                status: (
                  <Badge variant={s.status === 'active' ? 'success' : 'default'}>
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                ),
                actions: (
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          setEditingSite(s);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(s)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              }))}
            />
          </div>
        </>
      )}

      {tab === 'temporary' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table
            loading={loading}
            error={loadError}
            onRetry={loadTemp}
            columns={[
              { key: 'siteName', label: 'Site Name' },
              { key: 'address', label: 'Address' },
              { key: 'contactPerson', label: 'Contact' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'reason', label: 'Reason' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={tempSites.map((t) => ({
              ...t,
              address: t.address || '—',
              contactPerson: t.contactPerson || '—',
              mobile: t.mobile || '—',
              reason: t.reason || '—',
              actions: canEdit ? (
                <Button
                  className="text-xs"
                  onClick={() => {
                    setConverting(t);
                    setConvertOpen(true);
                  }}
                >
                  Convert to Master
                </Button>
              ) : (
                '—'
              ),
            }))}
          />
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingSite(null);
        }}
        title={editingSite ? 'Edit Site' : 'Add Site'}
        size="lg"
      >
        <SiteForm
          site={editingSite}
          onCancel={() => {
            setFormOpen(false);
            setEditingSite(null);
          }}
          onSuccess={() => {
            setFormOpen(false);
            setEditingSite(null);
            loadMaster();
          }}
        />
      </Modal>

      <ConvertModal
        open={convertOpen}
        temp={converting}
        companies={companies}
        onClose={() => {
          setConvertOpen(false);
          setConverting(null);
        }}
        onSuccess={() => {
          setConvertOpen(false);
          setConverting(null);
          loadTemp();
          loadMaster();
        }}
      />
    </div>
  );
}

function ConvertModal({ open, temp, companies, onClose, onSuccess }) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [city, setCity] = useState('');
  const [siteType, setSiteType] = useState('both');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (temp) {
      setCity('');
      setCompanyId('');
      setSiteType('both');
    }
  }, [temp]);

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!companyId || !city) {
      toast.error('Company and city are required');
      return;
    }
    setSubmitting(true);
    try {
      await convertTemporarySite(temp.id, {
        companyId: Number(companyId),
        city,
        siteType,
        siteName: temp.siteName,
        address: temp.address,
        contactPerson: temp.contactPerson,
        mobile: temp.mobile,
        notes: temp.reason,
      });
      toast.success('Converted to master site');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Convert to Master Site">
      {temp && (
        <form onSubmit={handleConvert} className="space-y-4">
          <p className="text-sm text-slate-600">
            Converting: <strong>{temp.siteName}</strong>
            {temp.address && ` — ${temp.address}`}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              City <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Site Type</label>
            <select
              className="input-field"
              value={siteType}
              onChange={(e) => setSiteType(e.target.value)}
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="both">Both</option>
              <option value="site_by_site">Site-by-Site</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Converting…' : 'Convert'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
