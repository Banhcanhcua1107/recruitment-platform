'use client';

import { useMemo } from 'react';
import { PersonalInfoContent } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';
import SuggestionInput from '../inputs/SuggestionInput';
import provincesData from '@/data/suggestions/vn-provinces.json';

interface PersonalInfoSectionProps {
  sectionId: string;
  content: PersonalInfoContent;
  isEditing: boolean;
}

export default function PersonalInfoSection({ sectionId, content, isEditing }: PersonalInfoSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();

  const provinces = useMemo(() => {
    return (provincesData as Array<{ name: string }>).map(p => p.name);
  }, []);

  const handleChange = (field: keyof PersonalInfoContent, value: string) => {
    updateSection(sectionId, {
      ...content,
      [field]: value,
    });
  };

  // View mode
  if (!isEditing) {
    const hasData = content.fullName || content.email || content.phone;
    
    if (!hasData) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Chưa có thông tin cá nhân</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm thông tin
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {content.fullName && (
          <InfoItem label="Họ và tên" value={content.fullName} icon="person" />
        )}
        {content.email && (
          <InfoItem label="Email" value={content.email} icon="mail" />
        )}
        {content.phone && (
          <InfoItem label="Số điện thoại" value={content.phone} icon="phone" />
        )}
        {content.address && (
          <InfoItem label="Địa chỉ" value={content.address} icon="location_on" />
        )}
        {content.dateOfBirth && (
          <InfoItem label="Ngày sinh" value={formatDate(content.dateOfBirth)} icon="cake" />
        )}
        {content.gender && (
          <InfoItem label="Giới tính" value={formatGender(content.gender)} icon="wc" />
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={content.fullName || ''}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Nguyễn Văn A"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={content.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@example.com"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            Số điện thoại
          </label>
          <input
            type="tel"
            value={content.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="0901 234 567"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Address with suggestion */}
        <SuggestionInput
          label="Tỉnh/Thành phố"
          value={content.address || ''}
          onChange={(value) => handleChange('address', value)}
          suggestions={provinces}
          placeholder="TP. Hồ Chí Minh"
          icon="location_on"
        />

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            Ngày sinh
          </label>
          <input
            type="date"
            value={content.dateOfBirth || ''}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">
            Giới tính
          </label>
          <select
            value={content.gender || ''}
            onChange={(e) => handleChange('gender', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          >
            <option value="">-- Chọn --</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      {/* Done button */}
      <div className="flex justify-end">
        <button
          onClick={() => setEditingSection(null)}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
        >
          Xong
        </button>
      </div>
    </div>
  );
}

// Helper components
function InfoItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-slate-500">{icon}</span>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-slate-900 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatGender(gender: string): string {
  const map: Record<string, string> = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
  };
  return map[gender] || gender;
}
