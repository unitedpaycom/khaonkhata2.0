import React from 'react';

export interface ModalField {
  k: string;
  l: string;
  t?: 'text' | 'number' | 'date' | 'sel' | 'textarea';
  v?: string | number;
  step?: string;
  placeholder?: string;
  o?: [string | number, string][];
}

interface ModalProps {
  isOpen: boolean;
  title: string;
  fields?: ModalField[];
  message?: string;
  onConfirm: (values: Record<string, string>) => void | boolean | Promise<void | boolean>;
  onCancel: () => void;
  onDelete?: () => void;
  confirmText?: string;
  cancelText?: string;
  deleteText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  fields = [],
  message,
  onConfirm,
  onCancel,
  onDelete,
  confirmText = 'সেভ',
  cancelText = 'বাতিল',
  deleteText = 'মুছুন',
}) => {
  const [formData, setFormData] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      fields.forEach(f => {
        initial[f.k] = f.v !== undefined ? String(f.v) : '';
      });
      setFormData(initial);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onConfirm(formData);
    if (res !== false) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'var(--card)', color: 'var(--ink)' }}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {message && <p className="text-sm mb-4 text-[var(--mut)]">{message}</p>}

        {fields.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => (
              <div key={f.k}>
                <label className="block text-xs text-[var(--mut)] mb-1">{f.l}</label>
                {f.t === 'sel' ? (
                  <select
                    value={formData[f.k] ?? ''}
                    onChange={e => setFormData({ ...formData, [f.k]: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]"
                  >
                    {(f.o || []).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : f.t === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={formData[f.k] ?? ''}
                    placeholder={f.placeholder}
                    onChange={e => setFormData({ ...formData, [f.k]: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]"
                  />
                ) : (
                  <input
                    type={f.t || 'text'}
                    step={f.step}
                    placeholder={f.placeholder}
                    value={formData[f.k] ?? ''}
                    onChange={e => setFormData({ ...formData, [f.k]: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]"
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2 justify-end pt-4">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onCancel();
                  }}
                  className="btn d"
                >
                  {deleteText}
                </button>
              )}
              <button type="button" onClick={onCancel} className="btn g">
                {cancelText}
              </button>
              <button type="submit" className="btn">
                {confirmText}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2 justify-end pt-4">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onCancel();
                }}
                className="btn d"
              >
                {deleteText}
              </button>
            )}
            <button type="button" onClick={onCancel} className="btn g">
              {cancelText}
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await onConfirm(formData);
                if (res !== false) {
                  onCancel();
                }
              }}
              className="btn"
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
