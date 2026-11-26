import { useEffect, useState } from 'react';
import { birdsApi, setsApi } from '../api';
import { getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Icon from '../components/Icon';
import { ErrorBox, LoadingBox } from '../components/Spinner';
import { num, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';
import { useLanguage } from '../i18n/LanguageContext';

function emptyForm(setId = '') {
  return {
    set: setId,
    date: todayInput(),
    newBirds: 0,
    mortality: 0,
    soldBirds: 0,
    notes: '',
  };
}

export default function BirdManagement() {
  const toast = useToast();
  const { t } = useLanguage();
  const [setFilter, setSetFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data: setsData, loading: setsLoading } = useFetch(setsApi.getAll);
  const { data, loading, error, refetch } = useFetch(
    birdsApi.getAll,
    { set: setFilter },
    { records: [] }
  );

  useEffect(() => {
    refetch({ set: setFilter });
  }, [setFilter]);

  useEffect(() => {
    if (editing) {
      setForm({
        set: editing.set?._id || editing.set || '',
        date: editing.date ? editing.date.slice(0, 10) : todayInput(),
        newBirds: editing.newBirds || 0,
        mortality: editing.mortality || 0,
        soldBirds: editing.soldBirds || 0,
        notes: editing.notes || '',
      });
    }
  }, [editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(setFilter || ''));
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await birdsApi.update(editing._id, form);
        toast.success(t('birds.updated'));
      } else {
        await birdsApi.create(form);
        toast.success(t('birds.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to save bird record.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await birdsApi.remove(record._id);
      toast.success(t('birds.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'date', header: t('birds.date'), render: (r) => fmtDate(r.date) },
    { key: 'set', header: t('birds.set'), render: (r) => <span className="font-semibold">{r.set?.name || '-'}</span> },
    { key: 'openingBirds', header: t('birds.opening'), render: (r) => num(r.openingBirds) },
    { key: 'newBirds', header: t('birds.newBirds'), render: (r) => <span className="text-emerald-600">+{num(r.newBirds)}</span> },
    { key: 'mortality', header: t('birds.mortality'), render: (r) => <span className="text-red-600">-{num(r.mortality)}</span> },
    { key: 'soldBirds', header: t('birds.soldBirds'), render: (r) => <span className="text-amber-600">-{num(r.soldBirds)}</span> },
    {
      key: 'currentBirds',
      header: t('birds.current'),
      render: (r) => <span className="font-bold text-brand-700">{num(r.currentBirds)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('birds.title')}
        subtitle={t('birds.subtitle')}
        actions={[
          <button key="add" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> {t('birds.addRecord')}
          </button>,
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="label mb-0">{t('eggs.setLabel')}</label>
        <select className="input !w-auto" value={setFilter} onChange={(e) => setSetFilter(e.target.value)}>
          <option value="">{t('eggs.allSets')}</option>
          {!(setsLoading) && (setsData?.sets || []).map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.records || [])}
        loading={loading}
        emptyTitle={t('birds.noRecords')}
        emptyHint={t('birds.noRecordsHint')}
        actions={(record) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => openEdit(record)} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(record)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `${t('common.edit')} ${t('birds.set')}` : t('birds.addRecord')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t('birds.set')} *`}>
              <select className="input" value={form.set} onChange={setField('set')} required>
                <option value="">{t('eggs.set')}</option>
                {!(setsLoading) && (setsData?.sets || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('common.date')}>
              <input className="input" type="date" value={form.date} onChange={setField('date')} />
            </Field>
            <Field label={t('birds.newBirds')}>
              <input className="input" type="number" min="0" value={form.newBirds} onChange={setField('newBirds')} />
            </Field>
            <Field label={t('birds.mortality')}>
              <input className="input" type="number" min="0" value={form.mortality} onChange={setField('mortality')} />
            </Field>
            <Field label={t('birds.soldBirds')}>
              <input className="input" type="number" min="0" value={form.soldBirds} onChange={setField('soldBirds')} />
            </Field>
          </div>
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
        title={`${t('common.delete')}?`}
        message="The record will be soft-deleted. Bird counts will be recalculated."
        confirmText={t('common.delete')}
      />
    </div>
  );
}
