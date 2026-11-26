import { useState } from 'react';
import { customersApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n/LanguageContext';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Spinner';
import { Badge } from '../components/Badge';
import { fmtDate } from '../utils/format';
import Field from '../components/Field';
import { useNavigate } from 'react-router-dom';

const TYPES = ['Household', 'Shop', 'Hotel', 'Restaurant', 'Bakery', 'Regular Customer', 'Other'];

function emptyForm() {
  return { name: '', mobile: '', address: '', area: '', customerType: 'Household', defaultPrice: '', notes: '' };
}

export default function Customers() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data, loading, error, refetch } = useFetch(
    customersApi.getAll,
    {},
    { customers: [] }
  );

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      name: record.name || '',
      mobile: record.mobile || '',
      address: record.address || '',
      area: record.area || '',
      customerType: record.customerType || 'Household',
      defaultPrice: record.defaultPrice ?? '',
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error(t('customers.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await customersApi.update(editing._id, form);
        toast.success(t('customers.updated'));
      } else {
        await customersApi.create(form);
        toast.success(t('customers.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await customersApi.remove(record._id);
      toast.success(t('customers.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const doSearch = () => refetch({ search: search || undefined });

  const customers = (data?.customers || []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.area?.toLowerCase().includes(q)
    );
  });

  const columns = [
    { key: 'name', header: t('common.name'), render: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { key: 'mobile', header: t('common.mobile'), render: (r) => r.mobile || '-' },
    { key: 'area', header: t('customers.area'), render: (r) => r.area || '-' },
    { key: 'customerType', header: t('customers.customerType'), render: (r) => <Badge className="bg-slate-100 text-slate-700">{t('customers.customerTypes.' + (r.customerType || 'Other'))}</Badge> },
    { key: 'defaultPrice', header: t('customers.defaultPriceEgg'), render: (r) => (r.defaultPrice ? `₹${Number(r.defaultPrice).toFixed(2)}` : '-') },
    {
      key: 'createdAt',
      header: t('customers.added'),
      render: (r) => fmtDate(r.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('customers.addCustomer')}
          </button>,
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            className="input pl-9"
            placeholder={t('customers.searchHint')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <button className="btn-secondary" onClick={doSearch}>{t('common.search')}</button>
        <button className="btn-ghost" onClick={() => { setSearch(''); refetch({ search: undefined }); }}>{t('customers.clear')}</button>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : customers}
        loading={loading}
        emptyTitle={t('customers.noRecords')}
        emptyHint={t('customers.noRecordsHint')}
        actions={(record) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => navigate(`/customers/${record._id}`)} title={t('customers.viewLedger')}>
              <Icon name="eye" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2" onClick={() => openEdit(record)} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('customers.editTitle') : t('customers.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t('common.name')} *`}>
              <input className="input" value={form.name} onChange={setField('name')} required />
            </Field>
            <Field label={t('common.mobile')}>
              <input className="input" value={form.mobile} onChange={setField('mobile')} placeholder="e.g. 9876543210" />
            </Field>
            <Field label={t('customers.area')}>
              <input className="input" value={form.area} onChange={setField('area')} />
            </Field>
            <Field label={t('customers.customerType')}>
              <select className="input" value={form.customerType} onChange={setField('customerType')}>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{t('customers.customerTypes.' + ty)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('customers.defaultPriceEgg')} hint={t('customers.hintDefaultPrice')}>
              <input className="input" type="number" step="0.01" min="0" value={form.defaultPrice} onChange={setField('defaultPrice')} />
            </Field>
          </div>
          <Field label={t('customers.address')}>
            <input className="input" value={form.address} onChange={setField('address')} />
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={form.notes} onChange={setField('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('customers.deleteTitle')}
        message={`"${confirm?.name}" ${t('customers.deleteMsg')}`}
        confirmText={t('common.delete')}
      />
    </div>
  );
}