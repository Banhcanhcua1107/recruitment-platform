'use client';

import { useState } from 'react';
import type {
  CertificationItem,
  CertificationsContent,
} from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';

interface CertificationsSectionProps {
  sectionId: string;
  content: CertificationsContent;
  isEditing: boolean;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CertificationsSection({
  sectionId,
  content,
  isEditing,
}: CertificationsSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CertificationItem>>({
    name: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    url: '',
  });

  const updateItem = (id: string, updates: Partial<CertificationItem>) => {
    updateSection(sectionId, {
      items: content.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    });
  };

  const removeItem = (id: string) => {
    updateSection(sectionId, {
      items: content.items.filter((item) => item.id !== id),
    });
  };

  const addItem = () => {
    if (!newItem.name?.trim() || !newItem.issuer?.trim()) {
      return;
    }

    const nextItem: CertificationItem = {
      id: crypto.randomUUID(),
      name: newItem.name.trim(),
      issuer: newItem.issuer.trim(),
      issueDate: newItem.issueDate || '',
      expiryDate: newItem.expiryDate?.trim() || undefined,
      url: newItem.url?.trim() || undefined,
    };

    updateSection(sectionId, {
      items: [...content.items, nextItem],
    });

    setNewItem({
      name: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      url: '',
    });
    setShowAddForm(false);
  };

  if (!isEditing) {
    if (content.items.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="mb-4 text-slate-400">Chưa có chứng chỉ nào.</p>
          <button
            type="button"
            onClick={() => setEditingSection(sectionId)}
            className="font-bold text-primary hover:underline"
          >
            + Thêm chứng chỉ
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {content.items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{item.name}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{item.issuer}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {formatDateLabel(item.issueDate) || 'Chưa rõ ngày cấp'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
              {item.expiryDate ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    event
                  </span>
                  Hết hạn {formatDateLabel(item.expiryDate)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Không thời hạn
                </span>
              )}

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700 hover:bg-sky-100"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Xem chứng chỉ
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content.items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                value={item.name}
                onChange={(event) => updateItem(item.id, { name: event.target.value })}
                placeholder="Tên chứng chỉ"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={item.issuer}
                onChange={(event) => updateItem(item.id, { issuer: event.target.value })}
                placeholder="Đơn vị cấp"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Xóa chứng chỉ"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Ngày cấp
              </label>
              <input
                type="date"
                value={item.issueDate?.slice(0, 10) || ''}
                onChange={(event) => updateItem(item.id, { issueDate: event.target.value })}
                aria-label="Ngày cấp chứng chỉ"
                title="Ngày cấp chứng chỉ"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Hết hạn
              </label>
              <input
                type="date"
                value={item.expiryDate?.slice(0, 10) || ''}
                onChange={(event) =>
                  updateItem(item.id, {
                    expiryDate: event.target.value || undefined,
                  })
                }
                aria-label="Ngày hết hạn chứng chỉ"
                title="Ngày hết hạn chứng chỉ"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Liên kết xác thực
              </label>
              <input
                type="url"
                value={item.url || ''}
                onChange={(event) => updateItem(item.id, { url: event.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </article>
      ))}

      {showAddForm ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-5">
          <h4 className="text-lg font-black text-slate-900">Thêm chứng chỉ mới</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={newItem.name || ''}
              onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
              placeholder="Tên chứng chỉ"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="text"
              value={newItem.issuer || ''}
              onChange={(event) => setNewItem((current) => ({ ...current, issuer: event.target.value }))}
              placeholder="Đơn vị cấp"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="date"
              value={newItem.issueDate?.slice(0, 10) || ''}
              onChange={(event) =>
                setNewItem((current) => ({
                  ...current,
                  issueDate: event.target.value,
                }))
              }
              aria-label="Ngày cấp chứng chỉ mới"
              title="Ngày cấp chứng chỉ mới"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="date"
              value={newItem.expiryDate?.slice(0, 10) || ''}
              onChange={(event) =>
                setNewItem((current) => ({
                  ...current,
                  expiryDate: event.target.value,
                }))
              }
              aria-label="Ngày hết hạn chứng chỉ mới"
              title="Ngày hết hạn chứng chỉ mới"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="md:col-span-2">
              <input
                type="url"
                value={newItem.url || ''}
                onChange={(event) => setNewItem((current) => ({ ...current, url: event.target.value }))}
                placeholder="Liên kết xác thực (tùy chọn)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-white"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={addItem}
              disabled={!newItem.name?.trim() || !newItem.issuer?.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Thêm chứng chỉ
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-4 text-sm font-bold text-slate-500 transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined">add</span>
          Thêm chứng chỉ
        </button>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditingSection(null)}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
