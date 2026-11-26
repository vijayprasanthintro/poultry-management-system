import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message = '', confirmText, danger = true }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const finalTitle = title || t('common.areYouSure');
  const finalText = confirmText || t('common.delete');
  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep the dialog open so the user can retry or cancel.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!busy ? onClose : undefined} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 text-2xl">
          {danger ? '⚠' : '🗑'}
        </div>
        <h3 className="mt-3 text-center font-bold text-slate-900">{finalTitle}</h3>
        {message && <p className="mt-1 text-center text-sm text-slate-500">{message}</p>}
        <div className="mt-5 flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            className={danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? t('common.saving') : finalText}
          </button>
        </div>
      </div>
    </div>
  );
}
