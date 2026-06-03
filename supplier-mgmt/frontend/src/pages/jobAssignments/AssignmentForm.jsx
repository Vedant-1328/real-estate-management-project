import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fetchDrivers } from '../../api/drivers.js';
import { createAssignment, updateAssignment } from '../../api/jobAssignments.js';
import { fetchJobTypes } from '../../api/jobTypes.js';
import { fetchSites } from '../../api/sites.js';
import { fetchVehicles } from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';

const schema = z
  .object({
    assignmentDate: z.string().min(1, 'Date is required'),
    jobTypeId: z.string().min(1, 'Job type is required'),
    vehicleId: z.string().optional(),
    driverId: z.string().optional(),
    isOutsideDriver: z.boolean(),
    outsideDriverName: z.string().optional(),
    outsideDriverMobile: z.string().optional(),
    outsideDriverVehicle: z.string().optional(),
    replacedDriverId: z.string().optional(),
    fromSiteMode: z.enum(['site', 'temp']),
    fromSiteId: z.string().optional(),
    fromSiteTemp: z.string().optional(),
    toSiteMode: z.enum(['site', 'temp']),
    toSiteId: z.string().optional(),
    toSiteTemp: z.string().optional(),
    expectedTrips: z.coerce.number().min(1, 'Expected trips is required'),
    dieselFuel: z.coerce.number().min(0, 'Must be 0 or more').optional(),
    driverCost: z.coerce.number().optional(),
    instructions: z.string().optional(),
    status: z.enum([
      'planned',
      'assigned',
      'in_progress',
      'completed',
      'cancelled',
      'on_hold',
    ]),
  })
  .superRefine((data, ctx) => {
    if (data.isOutsideDriver) {
      if (!data.outsideDriverName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Outside driver name is required',
          path: ['outsideDriverName'],
        });
      }
    } else {
      if (!data.driverId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Driver is required',
          path: ['driverId'],
        });
      }
      if (!data.vehicleId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vehicle is required',
          path: ['vehicleId'],
        });
      }
    }
    if (data.fromSiteMode === 'site' && !data.fromSiteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'From site is required',
        path: ['fromSiteId'],
      });
    }
    if (data.fromSiteMode === 'temp' && !data.fromSiteTemp?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Temporary site name is required',
        path: ['fromSiteTemp'],
      });
    }
    if (data.toSiteMode === 'site' && !data.toSiteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'To site is required',
        path: ['toSiteId'],
      });
    }
    if (data.toSiteMode === 'temp' && !data.toSiteTemp?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Temporary site name is required',
        path: ['toSiteTemp'],
      });
    }
  });

function buildPayload(values, forceAssign = false) {
  return {
    assignmentDate: values.assignmentDate,
    jobTypeId: Number(values.jobTypeId),
    vehicleId: values.vehicleId ? Number(values.vehicleId) : null,
    driverId: values.isOutsideDriver ? null : values.driverId ? Number(values.driverId) : null,
    isOutsideDriver: values.isOutsideDriver,
    outsideDriverName: values.isOutsideDriver ? values.outsideDriverName : null,
    outsideDriverMobile: values.isOutsideDriver ? values.outsideDriverMobile || null : null,
    outsideDriverVehicle: values.isOutsideDriver ? values.outsideDriverVehicle || null : null,
    replacedDriverId:
      values.isOutsideDriver && values.replacedDriverId
        ? Number(values.replacedDriverId)
        : null,
    fromSiteId: values.fromSiteMode === 'site' && values.fromSiteId ? Number(values.fromSiteId) : null,
    toSiteId: values.toSiteMode === 'site' && values.toSiteId ? Number(values.toSiteId) : null,
    fromSiteTemp: values.fromSiteMode === 'temp' ? values.fromSiteTemp : null,
    toSiteTemp: values.toSiteMode === 'temp' ? values.toSiteTemp : null,
    expectedTrips: values.expectedTrips,
    dieselFuel: values.dieselFuel !== '' && values.dieselFuel != null ? values.dieselFuel : null,
    driverCost: values.isOutsideDriver ? values.driverCost ?? null : null,
    instructions: values.instructions || null,
    status: values.status,
    forceAssign,
  };
}

export default function AssignmentForm({ assignment, onSuccess, onCancel, outsideOnly = false }) {
  const toast = useToast();
  const canOverride = usePermission('job_assignments', 'override');
  const isEdit = Boolean(assignment?.id);
  const isCompleted = assignment?.status === 'completed';

  const [jobTypes, setJobTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sites, setSites] = useState([]);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [pendingValues, setPendingValues] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      assignmentDate: new Date().toISOString().slice(0, 10),
      jobTypeId: '',
      vehicleId: '',
      driverId: '',
      isOutsideDriver: outsideOnly,
      outsideDriverName: '',
      outsideDriverMobile: '',
      outsideDriverVehicle: '',
      replacedDriverId: '',
      fromSiteMode: 'site',
      fromSiteId: '',
      fromSiteTemp: '',
      toSiteMode: 'site',
      toSiteId: '',
      toSiteTemp: '',
      expectedTrips: 1,
      dieselFuel: '',
      driverCost: '',
      instructions: '',
      status: 'planned',
    },
  });

  const isOutsideDriver = watch('isOutsideDriver');
  const fromSiteMode = watch('fromSiteMode');
  const toSiteMode = watch('toSiteMode');

  const fleetDrivers = drivers.filter(
    (d) => d.driverType !== 'outside' && d.status !== 'inactive'
  );

  useEffect(() => {
    fetchJobTypes()
      .then((res) => setJobTypes(res.data?.data ?? []))
      .catch(() => {});
    fetchVehicles({ status: 'available' })
      .then((res) => setVehicles(res.data?.data ?? []))
      .catch(() => {});
    fetchDrivers({ limit: 500 })
      .then((res) => setDrivers(res.data?.data ?? []))
      .catch(() => {});
    fetchSites({ status: 'active' })
      .then((res) => setSites(res.data?.data ?? []))
      .catch(() => setSites([]));
  }, []);

  useEffect(() => {
    if (assignment) {
      reset({
        assignmentDate: assignment.assignmentDate?.slice(0, 10) || '',
        jobTypeId: String(assignment.jobTypeId || ''),
        vehicleId: assignment.vehicleId ? String(assignment.vehicleId) : '',
        driverId: assignment.driverId ? String(assignment.driverId) : '',
        isOutsideDriver: Boolean(assignment.outsideDriverName),
        outsideDriverName: assignment.outsideDriverName || '',
        outsideDriverMobile: assignment.outsideDriverMobile || '',
        outsideDriverVehicle: assignment.outsideDriverVehicle || '',
        replacedDriverId: assignment.replacedDriverId
          ? String(assignment.replacedDriverId)
          : '',
        fromSiteMode: assignment.fromSiteTemp ? 'temp' : 'site',
        fromSiteId: assignment.fromSiteId ? String(assignment.fromSiteId) : '',
        fromSiteTemp: assignment.fromSiteTemp || '',
        toSiteMode: assignment.toSiteTemp ? 'temp' : 'site',
        toSiteId: assignment.toSiteId ? String(assignment.toSiteId) : '',
        toSiteTemp: assignment.toSiteTemp || '',
        expectedTrips: assignment.expectedTrips ?? 1,
        dieselFuel: assignment.dieselFuel ?? '',
        driverCost: assignment.driverCost ?? '',
        instructions: assignment.instructions || '',
        status: assignment.status || 'planned',
      });
    }
  }, [assignment, reset]);

  const submitAssignment = async (values, forceAssign = false) => {
    const payload = buildPayload(values, forceAssign);
    try {
      if (isEdit) {
        await updateAssignment(assignment.id, payload);
        toast.success('Assignment updated');
      } else {
        await createAssignment(payload);
        toast.success('Assignment created');
      }
      setConflictOpen(false);
      setPendingValues(null);
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictMessage(
          err.response.data?.message || 'Vehicle/Driver is already assigned today.'
        );
        setPendingValues(values);
        setConflictOpen(true);
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to save assignment');
    }
  };

  const onSubmit = (values) => submitAssignment(values, false);

  const handleOverride = () => {
    if (pendingValues) submitAssignment(pendingValues, true);
  };

  const err = (name) =>
    errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input-field"
              disabled={isCompleted}
              {...register('assignmentDate')}
            />
            {err('assignmentDate')}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Type <span className="text-red-500">*</span>
            </label>
            <select className="input-field" disabled={isCompleted} {...register('jobTypeId')}>
              <option value="">Select job type</option>
              {jobTypes.map((jt) => (
                <option key={jt.id} value={jt.id}>
                  {jt.name}
                </option>
              ))}
            </select>
            {err('jobTypeId')}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select className="input-field" disabled={isCompleted} {...register('status')}>
              <option value="planned">Planned</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {!outsideOnly && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              disabled={isCompleted}
              {...register('isOutsideDriver')}
            />
            Outside Driver?
          </label>
        )}

        {!isOutsideDriver && !outsideOnly ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select className="input-field" disabled={isCompleted} {...register('vehicleId')}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber}
                  </option>
                ))}
              </select>
              {err('vehicleId')}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Driver <span className="text-red-500">*</span>
              </label>
              <select className="input-field" disabled={isCompleted} {...register('driverId')}>
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {err('driverId')}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Outside Driver Name <span className="text-red-500">*</span>
              </label>
              <input className="input-field" disabled={isCompleted} {...register('outsideDriverName')} />
              {err('outsideDriverName')}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
              <input className="input-field" disabled={isCompleted} {...register('outsideDriverMobile')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle Number</label>
              <input className="input-field" disabled={isCompleted} {...register('outsideDriverVehicle')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Driver Cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                disabled={isCompleted}
                {...register('driverCost')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Replacement of
              </label>
              <select className="input-field" disabled={isCompleted} {...register('replacedDriverId')}>
                <option value="">Select fleet driver</option>
                {fleetDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.mobile ? ` · ${d.mobile}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fleet Vehicle (optional)</label>
              <select className="input-field" disabled={isCompleted} {...register('vehicleId')}>
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">From Site</label>
            <select className="input-field" disabled={isCompleted} {...register('fromSiteMode')}>
              <option value="site">Master site</option>
              <option value="temp">Use temp site</option>
            </select>
            {fromSiteMode === 'site' ? (
              <select className="input-field" disabled={isCompleted} {...register('fromSiteId')}>
                <option value="">Select site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder="Temporary site name"
                disabled={isCompleted}
                {...register('fromSiteTemp')}
              />
            )}
            {err('fromSiteId')}
            {err('fromSiteTemp')}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">To Site</label>
            <select className="input-field" disabled={isCompleted} {...register('toSiteMode')}>
              <option value="site">Master site</option>
              <option value="temp">Use temp site</option>
            </select>
            {toSiteMode === 'site' ? (
              <select className="input-field" disabled={isCompleted} {...register('toSiteId')}>
                <option value="">Select site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder="Temporary site name"
                disabled={isCompleted}
                {...register('toSiteTemp')}
              />
            )}
            {err('toSiteId')}
            {err('toSiteTemp')}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Expected Trips <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            className="input-field max-w-xs"
            disabled={isCompleted}
            {...register('expectedTrips')}
          />
          {err('expectedTrips')}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Diesel/Fuel</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field max-w-xs"
            disabled={isCompleted}
            {...register('dieselFuel')}
          />
          {err('dieselFuel')}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
          <textarea
            rows={3}
            className="input-field"
            disabled={isCompleted}
            {...register('instructions')}
          />
        </div>

        {isCompleted && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This assignment is completed and cannot be edited.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {!isCompleted && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          )}
        </div>
      </form>

      <Modal open={conflictOpen} onClose={() => setConflictOpen(false)} title="Assignment conflict" size="sm">
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {conflictMessage || 'Vehicle/Driver is already assigned today. Do you want to override?'}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            {canOverride && (
              <Button type="button" onClick={handleOverride} disabled={isSubmitting}>
                Override &amp; Save
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
