import { useEffect, useState } from 'react';
import { feedApi, setsApi } from '../api';
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
import { num, fmtDate, inr, todayInput } from '../utils/format';
import Field from '../components/Field';

function emptyForm() {
  return {
    name: '',
    feedType: 'Layer Mash',
    quantity: 1,
    weight: '',
    unit: 'KG',
    bagWeightKg: '',
    pricePerKg: '',
    supplier: '',
    purchaseDate: todayInput(),
    expiryDate: '',
    set: '',
    notes: '',
  };
}

export default function FeedManagement() {
  const { t } = useLanguage();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [stock, setStock] = useState(null);

  const { data: setsData, loading: setsLoading } = useFetch(setsApi.getAll);
  const { data, loading, error, refetch } = useFetch(feedApi.getAll, {}, { feeds: [] });

  useEffect(() => {
    feedApi
      .stock()
      .then(({ data: d }) => setStock(d.stock))
      .catch(() => setStock(null));
  }, [data]);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        feedType: editing.feedType || 'Layer Mash',
        quantity: editing.quantity || 1,
        weight: editing.weight ?? '',
        unit: editing.unit || 'KG',
        bagWeightKg: editing.bagWeightKg || '',
        pricePerKg: editing.pricePerKg || '',
        supplier: editing.supplier || '',
        purchaseDate: editing.purchaseDate ? editing.purchaseDate.slice(0, 10) : todayInput(),
        expiryDate: editing.expiryDate ? editing.expiryDate.slice(0, 10) : '',
        set: editing.set?._id || editing.set || '',
        notes: editing.notes || '',
      });
    }
  }, [editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error(t('feed.validationName'));
      return;
    }
    if (form.unit === 'BAGS' && (!form.bagWeightKg || Number(form.bagWeightKg) <= 0)) {
      toast.error(t('feed.validationBag'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await feedApi.update(editing._id, form);
        toast.success(t('feed.updated'));
      } else {
        await feedApi.create(form);
        toast.success(t('feed.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, t('feed.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await feedApi.remove(record._id);
      toast.success(t('feed.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'name', header: t('feed.feedName'), render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'feedType', header: t('feed.type'), render: (r) => r.feedType },
    { key: 'quantity', header: t('common.quantity'), render: (r) => `${num(r.quantity)} ${r.unit}` },
    { key: 'weight', header: t('feed.weight'), render: (r) => (r.unit === 'BAGS' ? `${num(r.weight)} kg` : r.unit === 'GRAMS' ? `${num(r.weight)} g` : `${num(r.weight)} kg`) },
    { key: 'pricePerKg', header: t('feed.pricePerKg'), render: (r) => inr(r.pricePerKg, 2) },
    { key: 'totalCost', header: t('feed.totalCost'), render: (r) => <span className="font-bold">{inr(r.totalCost)}</span> },
    { key: 'supplier', header: t('feed.supplier'), render: (r) => r.supplier || '-' },
    { key: 'purchaseDate', header: t('feed.purchaseDate'), render: (r) => fmtDate(r.purchaseDate) },
    { key: 'set', header: t('eggs.set'), render: (r) => r.set?.name || t('feed.general') },
  ];

  return (
    <div>
      <PageHeader
        title={t('feed.title')}
        subtitle={t('feed.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('feed.addFeed')}
          </button>,
        ]}
      />

      {stock && (
        <div className={`mb-4 rounded-xl border p-4 ${stock.lowStock ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feed.available')}</p>
              <p className="text-2xl font-bold text-slate-900">{num(stock.availableKg)} kg</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feed.purchased')}</p>
              <p className="text-lg font-semibold text-slate-700">{num(stock.purchasedKg)} kg</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feed.used')}</p>
              <p className="text-lg font-semibold text-slate-700">{num(stock.usedKg)} kg</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('feed.minimumStock')}</p>
              <p className="text-lg font-semibold text-slate-700">{num(stock.minimumStock)} kg</p>
            </div>
            {stock.lowStock && (
              <div className="rounded-lg bg-white border border-red-200 px-3 py-1.5">
                <p className="text-sm font-bold text-red-600">{t('feed.lowStockTitle')} ⚠</p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.feeds || [])}
        loading={loading}
        emptyTitle={t('feed.noRecords')}
        emptyHint={t('feed.noRecordsHint')}
        actions={(record) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => { setEditing(record); setModalOpen(true); }} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('feed.editTitle') : t('feed.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('feed.name')}>
              <input className="input" value={form.name} onChange={setField('name')} placeholder="e.g. Layer Mash A" required />
            </Field>
            <Field label={t('feed.type')}>
              <select className="input" value={form.feedType} onChange={setField('feedType')}>
                {['Layer Mash', 'Starter Feed', 'Grower Feed', 'Finisher Feed', 'Concentrate', 'Other'].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>
            <Field label={t('feed.unit')}>
              <select className="input" value={form.unit} onChange={setField('unit')}>
                <option value="KG">KG</option>
                <option value="GRAMS">GRAMS</option>
                <option value="BAGS">BAGS</option>
              </select>
            </Field>
            {form.unit === 'BAGS' ? (
              <>
                <Field label={t('feed.bagCount')}>
                  <input className="input" type="number" min="0" value={form.quantity} onChange={setField('quantity')} />
                </Field>
                <Field label={t('feed.bagWeight')}>
                  <input className="input" type="number" step="0.5" min="0" value={form.bagWeightKg} onChange={setField('bagWeightKg')} placeholder="e.g. 50" />
                </Field>
              </>
            ) : (
              <Field label={form.unit === 'GRAMS' ? t('feed.weightGrams') : t('feed.weightKg')}>
                <input className="input" type="number" step="0.5" min="0" value={form.weight} onChange={setField('weight')} placeholder="e.g. 500" />
              </Field>
            )}
            <Field label={t('feed.pricePerKgLabel')}>
              <input className="input" type="number" step="0.01" min="0" value={form.pricePerKg} onChange={setField('pricePerKg')} placeholder="e.g. 32.50" />
            </Field>
            <Field label={t('feed.supplier')}>
              <input className="input" value={form.supplier} onChange={setField('supplier')} />
            </Field>
            <Field label={t('eggs.set')}>
              <select className="input" value={form.set} onChange={setField('set')}>
                <option value="">{t('feed.generalAll')}</option>
                {!(setsLoading) && (setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('feed.purchaseDate')}>
              <input className="input" type="date" value={form.purchaseDate} onChange={setField('purchaseDate')} />
            </Field>
            <Field label={t('feed.expiryDate')}>
              <input className="input" type="date" value={form.expiryDate} onChange={setField('expiryDate')} />
            </Field>
          </div>
          <Field label={t('common.notes')}>
            <textarea className="input" rows="2" value={form.notes} onChange={setField('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('feed.saveFeed')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title={t('feed.deleteTitle')}
        message={t('feed.deleteMsg')}
        confirmText={t('common.delete')}
      />
    </div>
  );
}