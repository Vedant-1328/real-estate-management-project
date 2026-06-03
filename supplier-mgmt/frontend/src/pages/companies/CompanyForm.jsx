import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../../components/Button.jsx';
import { createCompany, updateCompany } from '../../api/companies.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useServerFieldError } from '../../hooks/useServerFieldError.js';

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  billingAddress: z.string().optional(),
  gstNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v), 'Invalid IFSC code'),
  bankAccountHolderName: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  companyType: z.enum(['own', 'customer']),
  notes: z.string().optional(),
});

const defaultValues = {
  companyName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  billingAddress: '',
  gstNumber: '',
  paymentTerms: '',
  bankAccountNumber: '',
  bankIfscCode: '',
  bankAccountHolderName: '',
  status: 'active',
  companyType: 'customer',
  notes: '',
};

export default function CompanyForm({ company, defaultCompanyType = 'customer', onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(company);
  const serverCompanyName = useServerFieldError('companyName');
  const serverMobile = useServerFieldError('mobile');
  const serverEmail = useServerFieldError('email');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (company) {
      reset({
        companyName: company.companyName || '',
        contactPerson: company.contactPerson || '',
        mobile: company.mobile || '',
        email: company.email || '',
        billingAddress: company.billingAddress || '',
        gstNumber: company.gstNumber || '',
        paymentTerms: company.paymentTerms || '',
        bankAccountNumber: company.bankAccountNumber || '',
        bankIfscCode: company.bankIfscCode || '',
        bankAccountHolderName: company.bankAccountHolderName || '',
        status: company.status || 'active',
        companyType: company.companyType || defaultCompanyType,
        notes: company.notes || '',
      });
    } else {
      reset({ ...defaultValues, companyType: defaultCompanyType });
    }
  }, [company, defaultCompanyType, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        email: values.email || null,
        bankAccountNumber: values.bankAccountNumber || null,
        bankIfscCode: values.bankIfscCode || null,
        bankAccountHolderName: values.bankAccountHolderName || null,
      };
      if (isEdit) {
        await updateCompany(company.id, payload);
        toast.success('Company updated successfully');
      } else {
        await createCompany(payload);
        toast.success('Company created successfully');
      }
      onSuccess?.();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to save company';
      toast.error(msg);
    }
  };

  const fieldClass = (name) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
      errors[name]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
        : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
    }`;

  const companyType = watch('companyType');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('companyType')} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Type:{' '}
        <span className="font-semibold">
          {companyType === 'own' ? 'Own company' : 'Customer company'}
        </span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input className={fieldClass('companyName')} {...register('companyName')} />
        {(errors.companyName || serverCompanyName) && (
          <p className="mt-1 text-xs text-red-600">
            {errors.companyName?.message || serverCompanyName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input className={fieldClass('contactPerson')} {...register('contactPerson')} />
          {errors.contactPerson && (
            <p className="mt-1 text-xs text-red-600">{errors.contactPerson.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mobile <span className="text-red-500">*</span>
          </label>
          <input className={fieldClass('mobile')} {...register('mobile')} />
          {(errors.mobile || serverMobile) && (
            <p className="mt-1 text-xs text-red-600">{errors.mobile?.message || serverMobile}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input type="email" className={fieldClass('email')} {...register('email')} />
        {(errors.email || serverEmail) && (
          <p className="mt-1 text-xs text-red-600">{errors.email?.message || serverEmail}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Billing Address</label>
        <textarea
          rows={3}
          className={fieldClass('billingAddress')}
          {...register('billingAddress')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
          <input className={fieldClass('gstNumber')} {...register('gstNumber')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Terms</label>
          <input className={fieldClass('paymentTerms')} {...register('paymentTerms')} />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-800">Bank details</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Account holder name
          </label>
          <input
            className={fieldClass('bankAccountHolderName')}
            {...register('bankAccountHolderName')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bank account number
            </label>
            <input
              className={fieldClass('bankAccountNumber')}
              {...register('bankAccountNumber')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bank IFSC code</label>
            <input
              className={fieldClass('bankIfscCode')}
              placeholder="e.g. SBIN0001234"
              {...register('bankIfscCode')}
            />
            {errors.bankIfscCode && (
              <p className="mt-1 text-xs text-red-600">{errors.bankIfscCode.message}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
        <select className={fieldClass('status')} {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea rows={2} className={fieldClass('notes')} {...register('notes')} />
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
