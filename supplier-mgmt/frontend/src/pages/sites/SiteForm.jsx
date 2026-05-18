import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createSite, updateSite } from '../../api/sites.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const schema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
  siteType: z.enum(['pickup', 'delivery', 'both', 'site_by_site']),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

const defaultValues = {
  siteName: '',
  address: '',
  city: '',
  contactPerson: '',
  mobile: '',
  siteType: 'both',
  status: 'active',
  notes: '',
};

export default function SiteForm({ site, onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(site);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (site) {
      reset({
        siteName: site.siteName || '',
        address: site.address || '',
        city: site.city || '',
        contactPerson: site.contactPerson || '',
        mobile: site.mobile || '',
        siteType: site.siteType || 'both',
        status: site.status || 'active',
        notes: site.notes || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [site, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateSite(site.id, values);
        toast.success('Site updated');
      } else {
        await createSite(values);
        toast.success('Site created');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save site');
    }
  };

  const err = (name) =>
    errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Site Name <span className="text-red-500">*</span>
        </label>
        <input className="input-field" {...register('siteName')} />
        {err('siteName')}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea rows={2} className="input-field" {...register('address')} />
        {err('address')}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          City <span className="text-red-500">*</span>
        </label>
        <input className="input-field" {...register('city')} />
        {err('city')}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Contact Person</label>
          <input className="input-field" {...register('contactPerson')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
          <input className="input-field" {...register('mobile')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Site Type</label>
          <select className="input-field" {...register('siteType')}>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="both">Both</option>
            <option value="site_by_site">Site-by-Site</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field" {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea rows={2} className="input-field" {...register('notes')} />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
