import { useEffect, useMemo, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import { fetchDrivers } from '../../api/drivers.js';
import { createEodEntry, updateEodEntry } from '../../api/eodEntries.js';
import { fetchExpenseTypes } from '../../api/expenseTypes.js';
import { fetchJobTypes } from '../../api/jobTypes.js';
import { fetchEffectiveRate } from '../../api/jobAssignments.js';
import { fetchSites } from '../../api/sites.js';
import { fetchVehicles } from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import FormSection from '../../components/FormSection.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';
import { todayDate as todayIso } from '../../utils/dateOnly.js';
import {
  getEodBillingUnit,
  quantityLabelForUnit,
  rateLabelForUnit,
  vehicleTypeUsesBothBilling,
} from '../../utils/eodBilling.js';
import { isLoaderVehicle } from '../../utils/loaderVehicleTypes.js';

const driverDefaultVehicleId = (d) =>
  d?.defaultVehicleId ?? d?.defaultVehicle?.id ?? null;

const buildFormDefaults = (entry) => {
  if (!entry) {
    return {
      date: todayIso(),
      companyId: '',
      jobTypeId: '',
      vehicleId: '',
      driverId: '',
      isOutsideDriver: false,
      outsideDriverName: '',
      outsideDriverMobile: '',
      outsideDriverVehicle: '',
      replacedDriverId: '',
      driverCostPerDay: '',
      fromSiteMode: 'site',
      fromSiteId: '',
      fromSiteTemp: '',
      toSiteMode: 'site',
      toSiteId: '',
      toSiteTemp: '',
      trips: '',
      dieselFuel: '',
      expenseTypeId: '',
      expense: '',
      remarks: '',
      startTime: '',
      endTime: '',
      approved: true,
      eodQuantityUnit: 'trip',
      loadedByVehicleId: '',
      loadedByDriverId: '',
    };
  }

  const assignment = entry.assignment || {};
  const fromTemp = assignment.fromSiteTemp || '';
  const toTemp = assignment.toSiteTemp || '';
  const isOutside = Boolean(assignment.outsideDriverName);
  return {
    date: entry.date?.slice(0, 10) || todayIso(),
    companyId: entry.companyId
      ? String(entry.companyId)
      : entry.company?.id
      ? String(entry.company.id)
      : '',
    jobTypeId: entry.jobTypeId ? String(entry.jobTypeId) : '',
    vehicleId: entry.vehicleId ? String(entry.vehicleId) : '',
    driverId: entry.driverId ? String(entry.driverId) : '',
    isOutsideDriver: isOutside,
    outsideDriverName: assignment.outsideDriverName || '',
    outsideDriverMobile: assignment.outsideDriverMobile || '',
    outsideDriverVehicle: assignment.outsideDriverVehicle || '',
    replacedDriverId:
      assignment.replacedDriverId || entry.replacedDriverId
        ? String(assignment.replacedDriverId || entry.replacedDriverId)
        : '',
    driverCostPerDay:
      isOutside && (assignment.driverCost != null || entry.driverCostPerDay != null)
        ? String(assignment.driverCost ?? entry.driverCostPerDay)
        : '',
    fromSiteMode: fromTemp ? 'temp' : 'site',
    fromSiteId: entry.fromSiteId ? String(entry.fromSiteId) : '',
    fromSiteTemp: fromTemp,
    toSiteMode: toTemp ? 'temp' : 'site',
    toSiteId: entry.toSiteId ? String(entry.toSiteId) : '',
    toSiteTemp: toTemp,
    trips: entry.actualTrips != null ? String(entry.actualTrips) : '',
    dieselFuel: entry.dieselFuel != null ? String(entry.dieselFuel) : '',
    expenseTypeId: entry.expenseTypeId
      ? String(entry.expenseTypeId)
      : entry.expenseType?.id
      ? String(entry.expenseType.id)
      : '',
    expense: entry.expense != null ? String(entry.expense) : '',
    remarks: entry.remarks || '',
    startTime: entry.startTime || '',
    endTime: entry.endTime || '',
    approved: Boolean(entry.isApproved),
    eodQuantityUnit: entry.quantityUnit === 'hour' ? 'hour' : 'trip',
    loadedByVehicleId: entry.loadedByVehicleId
      ? String(entry.loadedByVehicleId)
      : entry.loadedByVehicle?.id
      ? String(entry.loadedByVehicle.id)
      : '',
    loadedByDriverId: entry.loadedByDriverId
      ? String(entry.loadedByDriverId)
      : entry.loadedByDriver?.id
      ? String(entry.loadedByDriver.id)
      : '',
  };
};

export default function EodForm({ entry, onSuccess, onCancel }) {
  const toast = useToast();
  const canApprove = usePermission('eod_entries', 'approve');
  const isEdit = Boolean(entry?.id);
  const isInvoiced = entry?.billingStatus === 'invoiced';
  const locked = isInvoiced && !canApprove;

  const [jobTypes, setJobTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sites, setSites] = useState([]);
  const [customerCompanies, setCustomerCompanies] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);

  const fleetDrivers = useMemo(
    () =>
      drivers.filter(
        (d) => d.driverType !== 'outside' && d.status !== 'inactive'
      ),
    [drivers]
  );

  const [values, setValues] = useState(() => buildFormDefaults(entry));
  const [submitting, setSubmitting] = useState(false);
  // Rate is no longer entered by the user. It is silently fetched from the
  // company rate card (selected via the site → company link) and used both for
  // the live total preview and for the saved EOD record.
  const [autoRate, setAutoRate] = useState(
    entry?.ratePerTrip != null ? Number(entry.ratePerTrip) : null
  );
  const [autoRateNote, setAutoRateNote] = useState('');

  const setField = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  // Billing company: explicit customer pick, or fall back to master site link.
  const derivedCompanyIdFromSites = useMemo(() => {
    const findSiteCompany = (siteId) => {
      if (!siteId) return null;
      const site = sites.find((s) => String(s.id) === String(siteId));
      return site?.companyId ?? null;
    };
    if (values.fromSiteMode === 'site') {
      const cid = findSiteCompany(values.fromSiteId);
      if (cid) return cid;
    }
    if (values.toSiteMode === 'site') {
      const cid = findSiteCompany(values.toSiteId);
      if (cid) return cid;
    }
    return null;
  }, [sites, values.fromSiteMode, values.fromSiteId, values.toSiteMode, values.toSiteId]);

  const billingCompanyId = values.companyId
    ? Number(values.companyId)
    : derivedCompanyIdFromSites;

  const billingCompanyName = useMemo(() => {
    if (values.companyId) {
      return customerCompanies.find((c) => String(c.id) === values.companyId)?.companyName ?? null;
    }
    if (isEdit && entry?.company?.companyName) return entry.company.companyName;
    if (!derivedCompanyIdFromSites) return null;
    const linked = sites.find((s) => Number(s.companyId) === Number(derivedCompanyIdFromSites));
    return linked?.company?.companyName ?? null;
  }, [
    values.companyId,
    customerCompanies,
    isEdit,
    entry,
    derivedCompanyIdFromSites,
    sites,
  ]);

  const filteredSites = useMemo(() => {
    let list = sites;
    if (values.companyId) {
      list = sites.filter(
        (s) =>
          s.companyId == null || String(s.companyId) === String(values.companyId)
      );
    }
    const selectedIds = [values.fromSiteId, values.toSiteId].filter(Boolean).map(String);
    for (const id of selectedIds) {
      const site = sites.find((s) => String(s.id) === id);
      if (site && !list.some((s) => s.id === site.id)) {
        list = [...list, site];
      }
    }
    return [...list].sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [sites, values.companyId, values.fromSiteId, values.toSiteId]);

  useEffect(() => {
    setValues(buildFormDefaults(entry));
    setAutoRate(entry?.ratePerTrip != null ? Number(entry.ratePerTrip) : null);
    setAutoRateNote('');
  }, [entry]);

  useEffect(() => {
    fetchJobTypes()
      .then((res) => setJobTypes(res.data?.data ?? []))
      .catch(() => {});
    fetchVehicles({ limit: 500 })
      .then((res) => setVehicles(res.data?.data ?? []))
      .catch(() => {});
    fetchDrivers({ limit: 500 })
      .then((res) => setDrivers(res.data?.data ?? []))
      .catch(() => {});
    fetchSites({ status: 'active' })
      .then((res) => setSites(res.data?.data ?? []))
      .catch(() => {
        toast.error('Failed to load master sites');
      });
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCustomerCompanies(res.data?.data ?? []))
      .catch(() => {});
    fetchExpenseTypes()
      .then((res) =>
        setExpenseTypes((res.data?.data ?? []).filter((t) => t.status === 'active'))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit || values.companyId) return;
    const siteId =
      values.fromSiteMode === 'site' && values.fromSiteId
        ? values.fromSiteId
        : values.toSiteMode === 'site' && values.toSiteId
        ? values.toSiteId
        : null;
    if (!siteId) return;
    const site = sites.find((s) => String(s.id) === String(siteId));
    if (site?.companyId) {
      setValues((prev) =>
        prev.companyId ? prev : { ...prev, companyId: String(site.companyId) }
      );
    }
  }, [
    isEdit,
    values.companyId,
    values.fromSiteMode,
    values.fromSiteId,
    values.toSiteMode,
    values.toSiteId,
    sites,
  ]);

  const handleCompanyChange = (companyId) => {
    setValues((prev) => {
      const next = { ...prev, companyId };
      if (companyId && prev.fromSiteMode === 'site' && prev.fromSiteId) {
        const from = sites.find((s) => String(s.id) === prev.fromSiteId);
        if (from?.companyId && String(from.companyId) !== String(companyId)) {
          next.fromSiteId = '';
        }
      }
      if (companyId && prev.toSiteMode === 'site' && prev.toSiteId) {
        const to = sites.find((s) => String(s.id) === prev.toSiteId);
        if (to?.companyId && String(to.companyId) !== String(companyId)) {
          next.toSiteId = '';
        }
      }
      return next;
    });
  };

  // Silently fetch the effective per-trip rate whenever the relevant inputs
  // change. The result feeds the live total preview and is also sent to the
  // backend so the saved EOD has a deterministic rate snapshot.
  useEffect(() => {
    if (isEdit) return;
    if (!billingCompanyId || !values.jobTypeId) {
      setAutoRate(null);
      setAutoRateNote(
        billingCompanyId
          ? ''
          : values.companyId || values.fromSiteId || values.toSiteId
          ? 'Pick a customer company or a master site linked to one — rate cannot be auto-applied.'
          : ''
      );
      return;
    }

    let cancelled = false;
    const params = {
      companyId: billingCompanyId,
      jobTypeId: values.jobTypeId,
      assignmentDate: values.date,
    };
    const vehicle = vehicles.find((v) => String(v.id) === values.vehicleId);
    if (vehicle?.vehicleType) params.vehicleType = vehicle.vehicleType;
    const masterUnit = vehicle?.vehicleTypeRef?.billingUnit ?? null;
    if (vehicleTypeUsesBothBilling(masterUnit)) {
      params.quantityUnit = values.eodQuantityUnit || 'trip';
    }
    const unit = getEodBillingUnit(
      vehicle?.vehicleType ?? null,
      masterUnit,
      vehicleTypeUsesBothBilling(masterUnit) ? values.eodQuantityUnit : null
    );

    fetchEffectiveRate(params)
      .then((res) => {
        if (cancelled) return;
        const card = res.data?.data;
        const rate = card?.rateAmount;
        if (rate != null) {
          setAutoRate(Number(rate));
          let note = `${rateLabelForUnit(unit)}: ${formatCurrency(rate)} (from company rate card)`;
          if (unit === 'hours' && card.rateType && card.rateType !== 'per_hour') {
            note += ' — add a per-hour rate for this vehicle type under Company Rates.';
          }
          setAutoRateNote(note);
        } else {
          setAutoRate(null);
          setAutoRateNote(
            unit === 'hours'
              ? 'No per-hour rate card for this customer, job type, and JCB vehicle.'
              : 'No matching rate card configured for this customer & job type.'
          );
        }
      })
      .catch(() => {
        setAutoRate(null);
        setAutoRateNote('');
      });
    return () => {
      cancelled = true;
    };
  }, [
    isEdit,
    billingCompanyId,
    values.jobTypeId,
    values.date,
    values.vehicleId,
    values.fromSiteId,
    values.toSiteId,
    values.companyId,
    values.eodQuantityUnit,
    vehicles,
  ]);

  const billingRate = autoRate;

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === values.vehicleId),
    [vehicles, values.vehicleId]
  );

  const loaderVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.status !== 'inactive' &&
          isLoaderVehicle(v) &&
          String(v.id) !== String(values.vehicleId)
      ),
    [vehicles, values.vehicleId]
  );

  const showLoadedBy = Boolean(values.vehicleId && selectedVehicle && !isLoaderVehicle(selectedVehicle));

  const loaderVehicleIdSet = useMemo(
    () => new Set(loaderVehicles.map((v) => String(v.id))),
    [loaderVehicles]
  );

  const loadedByDriverOptions = useMemo(() => {
    if (!showLoadedBy) return [];

    const driversOnLoaders = fleetDrivers.filter((d) => {
      const vid = driverDefaultVehicleId(d);
      return vid != null && loaderVehicleIdSet.has(String(vid));
    });

    if (values.loadedByVehicleId) {
      const forVehicle = driversOnLoaders.filter(
        (d) => String(driverDefaultVehicleId(d)) === String(values.loadedByVehicleId)
      );
      if (forVehicle.length > 0) return forVehicle;
    }

    if (driversOnLoaders.length > 0) return driversOnLoaders;
    return fleetDrivers;
  }, [showLoadedBy, fleetDrivers, loaderVehicleIdSet, values.loadedByVehicleId]);

  useEffect(() => {
    if (!showLoadedBy) {
      setValues((prev) =>
        prev.loadedByVehicleId || prev.loadedByDriverId
          ? { ...prev, loadedByVehicleId: '', loadedByDriverId: '' }
          : prev
      );
    }
  }, [showLoadedBy]);

  useEffect(() => {
    if (!values.loadedByDriverId || loadedByDriverOptions.length === 0) return;
    const stillValid = loadedByDriverOptions.some(
      (d) => String(d.id) === values.loadedByDriverId
    );
    if (!stillValid) {
      setValues((prev) => ({ ...prev, loadedByDriverId: '' }));
    }
  }, [values.loadedByVehicleId, values.loadedByDriverId, loadedByDriverOptions]);

  const masterBillingUnit = useMemo(
    () =>
      selectedVehicle?.vehicleTypeRef?.billingUnit ??
      entry?.vehicle?.vehicleTypeRef?.billingUnit ??
      entry?.masterBillingUnit ??
      null,
    [selectedVehicle, entry]
  );

  const allowsBothBilling = vehicleTypeUsesBothBilling(masterBillingUnit);

  const billingUnit = useMemo(() => {
    if (entry?.billingUnit && !allowsBothBilling) return entry.billingUnit;
    return getEodBillingUnit(
      selectedVehicle?.vehicleType ?? entry?.vehicle?.vehicleType ?? null,
      masterBillingUnit,
      allowsBothBilling ? values.eodQuantityUnit : entry?.quantityUnit ?? null
    );
  }, [entry, selectedVehicle, masterBillingUnit, allowsBothBilling, values.eodQuantityUnit]);

  const isHoursBilling = billingUnit === 'hours';
  const quantityLabel = quantityLabelForUnit(billingUnit);
  const rateUnitSuffix = isHoursBilling ? 'hr' : 'trip';

  const totalAmount = useMemo(() => {
    const trips = Number(values.trips) || 0;
    const rate = Number(billingRate) || 0;
    return trips * rate;
  }, [values.trips, billingRate]);

  const driverPayPerDay =
    values.isOutsideDriver && values.driverCostPerDay !== ''
      ? Number(values.driverCostPerDay)
      : null;

  const validateClient = () => {
    if (!values.date) return 'Date is required';
    if (!isEdit && !values.companyId) return 'Customer company is required';
    if (!values.jobTypeId) return 'Job type is required';
    if (values.isOutsideDriver) {
      if (!values.outsideDriverName.trim()) return 'Outside driver name is required';
      if (!values.outsideDriverMobile.trim()) return 'Mobile is required';
      if (!values.vehicleId) return 'Fleet vehicle is required';
      if (!values.replacedDriverId) return 'On replacement of is required';
      if (values.driverCostPerDay === '' || Number(values.driverCostPerDay) <= 0) {
        return 'Driver pay per day is required';
      }
    } else {
      if (!values.vehicleId) return 'Vehicle is required';
      if (!values.driverId) return 'Driver is required';
    }
    if (values.fromSiteMode === 'site' && !values.fromSiteId) return 'From site is required';
    if (values.fromSiteMode === 'temp' && !values.fromSiteTemp.trim()) {
      return 'From site (temp) is required';
    }
    if (values.toSiteMode === 'site' && !values.toSiteId) return 'To site is required';
    if (values.toSiteMode === 'temp' && !values.toSiteTemp.trim()) {
      return 'To site (temp) is required';
    }
    if (allowsBothBilling && !values.eodQuantityUnit) {
      return 'Select bill by hour or trip';
    }
    if (values.trips === '' || Number(values.trips) < 0) {
      return `${quantityLabel} is required`;
    }
    if (!isEdit && !billingCompanyId) {
      return 'Select a customer company for billing';
    }
    if (values.expense !== '' && Number(values.expense) > 0 && !values.expenseTypeId) {
      return 'Select an expense type for the expense amount';
    }
    if (values.expenseTypeId && (values.expense === '' || Number(values.expense) <= 0)) {
      return 'Enter an expense amount for the selected type';
    }
    return null;
  };

  const buildPayload = () => {
    const tripsValue = Number(values.trips) || 0;
    // On edit, the form no longer exposes rate/extras/deductions inputs.
    // We omit them from the payload so the backend keeps the existing values
    // intact instead of zeroing them out.
    const editOnlyFields = {
      ...(allowsBothBilling ? { quantityUnit: values.eodQuantityUnit } : {}),
      actualTrips: tripsValue,
      dieselFuel: values.dieselFuel !== '' ? Number(values.dieselFuel) : null,
      expense: values.expense !== '' ? Number(values.expense) : null,
      expenseTypeId: values.expenseTypeId ? Number(values.expenseTypeId) : null,
      expenseTypeId: values.expenseTypeId ? Number(values.expenseTypeId) : null,
      remarks: values.remarks || null,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      approved: canApprove ? values.approved : false,
      loadedByVehicleId:
        showLoadedBy && values.loadedByVehicleId ? Number(values.loadedByVehicleId) : null,
      loadedByDriverId:
        showLoadedBy && values.loadedByDriverId ? Number(values.loadedByDriverId) : null,
      ...(values.isOutsideDriver
        ? {
            vehicleId: Number(values.vehicleId),
            outsideDriverMobile: values.outsideDriverMobile.trim(),
            replacedDriverId: Number(values.replacedDriverId),
            driverCost: Number(values.driverCostPerDay),
          }
        : {}),
    };
    if (isEdit) return editOnlyFields;

    return {
      ...editOnlyFields,
      date: values.date,
      companyId: billingCompanyId ?? null,
      jobTypeId: Number(values.jobTypeId),
      vehicleId: values.vehicleId ? Number(values.vehicleId) : null,
      driverId: values.isOutsideDriver
        ? null
        : values.driverId
        ? Number(values.driverId)
        : null,
      isOutsideDriver: values.isOutsideDriver,
      outsideDriverName: values.isOutsideDriver ? values.outsideDriverName : null,
      outsideDriverMobile: values.isOutsideDriver
        ? values.outsideDriverMobile.trim()
        : null,
      outsideDriverVehicle: null,
      replacedDriverId: values.isOutsideDriver
        ? Number(values.replacedDriverId)
        : null,
      fromSiteId:
        values.fromSiteMode === 'site' && values.fromSiteId ? Number(values.fromSiteId) : null,
      toSiteId: values.toSiteMode === 'site' && values.toSiteId ? Number(values.toSiteId) : null,
      fromSiteTemp: values.fromSiteMode === 'temp' ? values.fromSiteTemp : null,
      toSiteTemp: values.toSiteMode === 'temp' ? values.toSiteTemp : null,
      plannedTrips: tripsValue,
      // Rate comes from the rate card (auto-resolved on the server when null).
      // When we already know it client-side we pass it through for transparency.
      driverCost: values.isOutsideDriver ? Number(values.driverCostPerDay) : null,
      ratePerTrip: billingRate != null ? Number(billingRate) : null,
      extraCharges: 0,
      deductions: 0,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateClient();
    if (err) {
      toast.error(err);
      return;
    }
    const payload = buildPayload();
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEodEntry(entry.id, payload);
        toast.success('EOD entry updated');
      } else {
        await createEodEntry(payload);
        toast.success('EOD entry saved');
      }
      onSuccess?.();
    } catch (apiErr) {
      toast.error(apiErr.response?.data?.message || 'Failed to save EOD entry');
    } finally {
      setSubmitting(false);
    }
  };

  const displayBillingRate = isEdit
    ? entry?.ratePerTrip != null
      ? Number(entry.ratePerTrip)
      : billingRate
    : billingRate;
  const displayTotal = isEdit
    ? entry?.totalAmount != null
      ? Number(entry.totalAmount)
      : totalAmount
    : totalAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          One entry per vehicle per day · afternoon check-in (end time optional)
        </p>
      )}

      <div className="billing-summary-bar">
        <span className="font-medium text-slate-700">
          Billing company:{' '}
          <span className="text-slate-900">
            {billingCompanyName || (billingCompanyId ? 'Selected' : '— pick customer company')}
          </span>
        </span>
        <span className="text-slate-400">|</span>
        <span className="font-medium text-slate-700">
          Bill rate:{' '}
          <span className="text-slate-900">
            {displayBillingRate != null
              ? `${formatCurrency(displayBillingRate)}/${rateUnitSuffix}`
              : '—'}
          </span>
        </span>
        {values.isOutsideDriver && (
          <>
            <span className="text-slate-400">|</span>
            <span className="font-medium text-slate-700">
              Driver pay:{' '}
              <span className="text-slate-900">
                {driverPayPerDay != null ? `${formatCurrency(driverPayPerDay)}/day` : '—'}
              </span>
            </span>
          </>
        )}
        <span className="ml-auto text-lg font-bold text-emerald-700">
          Bill total: {formatCurrency(displayTotal)}
        </span>
      </div>
      {!isEdit && autoRateNote && (
        <p className="-mt-2 text-xs text-slate-500">{autoRateNote}</p>
      )}

      <FormSection title="WHEN, WHAT & FOR" description="Date, customer company, and type of work for this afternoon entry.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input-field"
              value={values.date}
              onChange={(e) => setField('date', e.target.value)}
              disabled={locked || isEdit}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Customer company <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={locked || isEdit}
              required
            >
              <option value="">Select customer company</option>
              {customerCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 sm:max-w-md">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Type <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.jobTypeId}
              onChange={(e) => setField('jobTypeId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select job type</option>
              {jobTypes.map((jt) => (
                <option key={jt.id} value={jt.id}>
                  {jt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Who"
        description="Fleet driver and vehicle, or an outside hire."
      >
        <label className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.isOutsideDriver}
            onChange={(e) => setField('isOutsideDriver', e.target.checked)}
            disabled={locked}
          />
          Outside driver (not on payroll)
        </label>

      {!values.isOutsideDriver ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.vehicleId}
              onChange={(e) => setField('vehicleId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                  {v.vehicleType ? ` · ${v.vehicleType}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Driver <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.driverId}
              onChange={(e) => setField('driverId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Outside Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              value={values.outsideDriverName}
              onChange={(e) => setField('outsideDriverName', e.target.value)}
              disabled={locked}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              value={values.outsideDriverMobile}
              onChange={(e) => setField('outsideDriverMobile', e.target.value)}
              disabled={locked}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Fleet vehicle <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.vehicleId}
              onChange={(e) => setField('vehicleId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select fleet vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                  {v.vehicleType ? ` · ${v.vehicleType}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              On replacement of <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={values.replacedDriverId}
              onChange={(e) => setField('replacedDriverId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select fleet driver</option>
              {fleetDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.mobile ? ` · ${d.mobile}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Driver pay per day <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              placeholder="Amount paid to outside driver for the day"
              value={values.driverCostPerDay}
              onChange={(e) => setField('driverCostPerDay', e.target.value)}
              disabled={locked}
            />
            <p className="mt-1 text-xs text-slate-500">
              What you pay the outside hire for the day — not the customer bill rate.
            </p>
          </div>
        </div>
      )}

      {showLoadedBy && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Loaded by (vehicle)
            </label>
            <select
              className="input-field"
              value={values.loadedByVehicleId}
              onChange={(e) => {
                const nextVehicleId = e.target.value;
                setValues((prev) => ({
                  ...prev,
                  loadedByVehicleId: nextVehicleId,
                  loadedByDriverId: '',
                }));
              }}
              disabled={locked}
            >
              <option value="">Select JCB or Hitachi (optional)</option>
              {loaderVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                  {v.vehicleTypeRef?.name || v.vehicleType
                    ? ` · ${v.vehicleTypeRef?.name || v.vehicleType}`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Loaded by (driver)
            </label>
            <select
              className="input-field"
              value={values.loadedByDriverId}
              onChange={(e) => {
                const driverId = e.target.value;
                if (!driverId) {
                  setField('loadedByDriverId', '');
                  return;
                }
                const driver = loadedByDriverOptions.find(
                  (d) => String(d.id) === driverId
                );
                const loaderVid = driver ? driverDefaultVehicleId(driver) : null;
                setValues((prev) => ({
                  ...prev,
                  loadedByDriverId: driverId,
                  loadedByVehicleId:
                    loaderVid && loaderVehicleIdSet.has(String(loaderVid))
                      ? String(loaderVid)
                      : prev.loadedByVehicleId,
                }));
              }}
              disabled={locked || loadedByDriverOptions.length === 0}
            >
              <option value="">
                {loadedByDriverOptions.length === 0
                  ? 'No fleet drivers available'
                  : 'Select driver (optional)'}
              </option>
              {loadedByDriverOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.mobile ? ` · ${d.mobile}` : ''}
                  {driverDefaultVehicleId(d)
                    ? (() => {
                        const v = vehicles.find(
                          (veh) =>
                            String(veh.id) === String(driverDefaultVehicleId(d))
                        );
                        return v?.vehicleNumber ? ` · ${v.vehicleNumber}` : '';
                      })()
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">
            JCB or Hitachi that loaded this vehicle, and the driver who operated it.
          </p>
        </div>
      )}
      </FormSection>

      <FormSection
        title="Route"
        description="Master sites linked to the customer company (and shared unassigned sites). Use temporary names for one-off locations."
      >
      {!values.companyId && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Select a customer company above to filter sites, or pick from all master sites below.
        </p>
      )}
      {values.companyId && filteredSites.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No master sites for this customer yet. Add sites under Sites (link them to the customer), or
          use Temporary for one-off locations.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">From Site</label>
          <select
            className="input-field"
            value={values.fromSiteMode}
            onChange={(e) => setField('fromSiteMode', e.target.value)}
            disabled={locked}
          >
            <option value="site">Master site</option>
            <option value="temp">Temporary</option>
          </select>
          {values.fromSiteMode === 'site' ? (
            <select
              className="input-field"
              value={values.fromSiteId}
              onChange={(e) => setField('fromSiteId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select site</option>
              {filteredSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                  {s.company?.companyName ? ` · ${s.company.companyName}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              placeholder="Temporary site name"
              value={values.fromSiteTemp}
              onChange={(e) => setField('fromSiteTemp', e.target.value)}
              disabled={locked}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">To Site</label>
          <select
            className="input-field"
            value={values.toSiteMode}
            onChange={(e) => setField('toSiteMode', e.target.value)}
            disabled={locked}
          >
            <option value="site">Master site</option>
            <option value="temp">Temporary</option>
          </select>
          {values.toSiteMode === 'site' ? (
            <select
              className="input-field"
              value={values.toSiteId}
              onChange={(e) => setField('toSiteId', e.target.value)}
              disabled={locked}
            >
              <option value="">Select site</option>
              {filteredSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                  {s.company?.companyName ? ` · ${s.company.companyName}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              placeholder="Temporary site name"
              value={values.toSiteTemp}
              onChange={(e) => setField('toSiteTemp', e.target.value)}
              disabled={locked}
            />
          )}
        </div>
      </div>
      </FormSection>

      <FormSection
        title={isHoursBilling ? 'Hours & amount' : 'Trips & amount'}
        description={
          allowsBothBilling
            ? 'This vehicle type can be billed per hour or per trip. Choose how this entry should be billed, then enter the quantity.'
            : values.isOutsideDriver
            ? isHoursBilling
              ? 'Customer billing uses hours × per-hour company rate (above). Driver pay per day is your cost to the outside hire.'
              : 'Customer billing uses trips × company rate (above). Driver pay per day is your cost to the outside hire.'
            : isHoursBilling
            ? 'Hourly vehicles are billed using the per-hour rate card shown above.'
            : 'Trips are billed using the company rate card shown above.'
        }
      >
        {allowsBothBilling && !isEdit && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Bill this entry by</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="eodQuantityUnit"
                  value="trip"
                  checked={values.eodQuantityUnit === 'trip'}
                  onChange={() => setField('eodQuantityUnit', 'trip')}
                  disabled={locked}
                />
                Per trip
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="eodQuantityUnit"
                  value="hour"
                  checked={values.eodQuantityUnit === 'hour'}
                  onChange={() => setField('eodQuantityUnit', 'hour')}
                  disabled={locked}
                />
                Per hour
              </label>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {quantityLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step={isHoursBilling ? '0.25' : '1'}
              className="input-field text-lg font-semibold"
              value={values.trips}
              onChange={(e) => setField('trips', e.target.value)}
              disabled={locked}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              End time (afternoon)
            </label>
            <input
              type="time"
              className="input-field"
              value={values.endTime}
              onChange={(e) => setField('endTime', e.target.value)}
              disabled={locked}
            />
          </div>
        </div>
        {!isEdit && (
          <p className="text-sm text-slate-600">
            {Number(values.trips) || 0} {isHoursBilling ? 'hr' : `trip${Number(values.trips) === 1 ? '' : 's'}`}{' '}
            × {displayBillingRate != null ? formatCurrency(displayBillingRate) : '—'} ={' '}
            <strong className="text-emerald-700">{formatCurrency(totalAmount)}</strong>
            {values.isOutsideDriver && driverPayPerDay != null && (
              <span className="text-slate-500">
                {' '}
                · Driver cost: {formatCurrency(driverPayPerDay)}/day (not multiplied by{' '}
                {isHoursBilling ? 'hours' : 'trips'})
              </span>
            )}
          </p>
        )}
      </FormSection>

      <details className="form-section group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between">
            More details (optional)
            <span className="text-xs font-normal text-slate-400 group-open:hidden">Diesel, expense type, start time, remarks</span>
          </span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Diesel/Fuel</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={values.dieselFuel}
                onChange={(e) => setField('dieselFuel', e.target.value)}
                disabled={locked}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expense type</label>
              <select
                className="input-field"
                value={values.expenseTypeId}
                onChange={(e) => setField('expenseTypeId', e.target.value)}
                disabled={locked}
              >
                <option value="">Select expense type</option>
                {expenseTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expense amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={values.expense}
                onChange={(e) => setField('expense', e.target.value)}
                disabled={locked}
                placeholder="Amount for selected type"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Time</label>
              <input
                type="time"
                className="input-field"
                value={values.startTime}
                onChange={(e) => setField('startTime', e.target.value)}
                disabled={locked}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              rows={2}
              className="input-field"
              value={values.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
              disabled={locked}
              placeholder="Notes for this trip (optional)"
            />
          </div>
        </div>
      </details>

      {canApprove && !locked && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.approved}
            onChange={(e) => setField('approved', e.target.checked)}
          />
          Approve this entry
        </label>
      )}

      {locked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This entry is invoiced and cannot be edited without approve permission.
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {!locked && (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update Entry' : 'Save EOD Entry'}
          </Button>
        )}
      </div>
    </form>
  );
}

