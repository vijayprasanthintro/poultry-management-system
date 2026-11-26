import { useState, useEffect } from 'react';
import { setsApi } from '../api';
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
import { num, fmtDate, todayInput } from '../utils/format';
import Field from '../components/Field';

const emptyForm = {
  name: '',
  birdCount: 0,
  breed: '',
  startingDate: todayInput(),
  house: '',
  age: 0,
  status: 'ACTIVE',
  notes: '',
};

export default function PoultrySets() {
  const toast = useToast();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data, loading, error, refetch } = useFetch(setsApi.getAll);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        birdCount: editing.birdCount ?? 0,
        breed: editing.breed || '',
        startingDate: editing.startingDate ? editing.startingDate.slice(0, 10) : todayInput(),
        house: editing.house || '',
        age: editing.age ?? 0,
        status: editing.status || 'ACTIVE',
        notes: editing.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (set) => {
    setEditing(set);
    setModalOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await setsApi.update(editing._id, form);
        toast.success(t('poultrysets.updated'));
      } else {
        await setsApi.create(form);
        toast.success(t('poultrysets.created'));
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to save poultry set.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (set) => {
    try {
      await setsApi.remove(set._id);
      toast.success(t('poultrysets.deleted'));
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'name', header: t('poultrysets.setName'), render: (r) => <span className="font-bold">{r.name}</span> },
    {
      key: 'birdCount',
      header: t('poultrysets.birdCount'),
      render: (r) => (
        <span>
          {num(r.birdCount)}{' '}
          <span className="text-xs text-slate-500">(started {num(r.startingBirdCount)})</span>
        </span>
      ),
    },
    { key: 'breed', header: t('poultrysets.breed'), render: (r) => r.breed || '-' },
    { key: 'startingDate', header: t('poultrysets.startingDate'), render: (r) => fmtDate(r.startingDate) },
    { key: 'age', header: t('poultrysets.age'), render: (r) => num(r.age) },
    { key: 'house', header: t('poultrysets.house'), render: (r) => r.house || '-' },
    {
      key: 'status',
      header: t('poultrysets.status'),
      render: (r) => <Badge>{r.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title={t('poultrysets.title')} subtitle={t('poultrysets.subtitle')} actions={[<button key="add" className="btn-primary" onClick={openCreate}><Icon name="plus" className="h-4 w-4" /> {t('poultrysets.addSet')}</button>]} />

      {error && <ErrorBox message={error} onRetry={() => refetch()} />}

      <DataTable
        columns={columns}
        rows={loading ? [] : (data?.sets || [])}
        loading={loading}
        emptyTitle={t('poultrysets.noRecords')}
        emptyHint={t('poultrysets.noRecordsHint')}
        actions={(set) => (
          <>
            <button className="btn-ghost !px-2" onClick={() => openEdit(set)} title={t('common.edit')}>
              <Icon name="edit" className="h-4 w-4" />
            </button>
            <button className="btn-ghost !px-2 !text-red-600" onClick={() => setConfirm(set)} title={t('common.delete')}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('poultrysets.editTitle') : t('poultrysets.createTitle')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t('poultrysets.setName')} *`}>
              <input className="input" value={form.name} onChange={setField('name')} required placeholder="e.g. SET 1" />
            </Field>
            <Field label={t('poultrysets.birdCount')}>
              <input className="input" type="number" min="0" value={form.birdCount} onChange={setField('birdCount')} />
            </Field>
            <Field label={t('poultrysets.breed')}>
              <input className="input" value={form.breed} onChange={setField('breed')} placeholder="e.g. BV-300 Layer" />
            </Field>
            <Field label={t('poultrysets.startingDate')}>
              <input className="input" type="date" value={form.startingDate} onChange={setField('startingDate')} />
            </Field>
            <Field label={t('poultrysets.house')}>
              <input className="input" value={form.house} onChange={setField('house')} placeholder="e.g. House A" />
            </Field>
            <Field label={t('poultrysets.age')}>
              <input className="input" type="number" min="0" value={form.age} onChange={setField('age')} />
            </Field>
            <Field label={t('poultrysets.status')}>
              <select className="input" value={form.status} onChange={setField('status')}>
                <option value="ACTIVE">{t('status.ACTIVE')}</option>
                <option value="INACTIVE">{t('status.INACTIVE')}</option>
              </select>
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
        title="Deactivate this set?"
        message={`"${confirm?.name}" will be deactivated but its history is preserved.`}
        confirmText={t('common.delete')}
      />
    </div>
  );
}