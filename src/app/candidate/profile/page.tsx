'use client';

import { useEffect } from 'react';
import { useProfileBuilder, useProfileSections, useProfileLoading, useProfileError } from './stores/profileBuilderStore';
import ProfileHeader from './components/ProfileHeader';
import SectionRenderer from './components/SectionRenderer';
import AddSectionPanel from './components/AddSectionPanel';
import EmptyState from './components/EmptyState';
import CompletionCard from './components/CompletionCard';

export default function CandidateProfilePage() {
  const { loadProfile, document } = useProfileBuilder();
  const sections = useProfileSections();
  const isLoading = useProfileLoading();
  const error = useProfileError();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProfileHeader userName="Đang tải..." />
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 animate-pulse">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-10 bg-slate-200 rounded-xl" />
                    <div className="h-5 bg-slate-200 rounded w-32" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-40 mb-4" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-10">
          <span className="material-symbols-outlined text-6xl text-red-300 mb-4">error</span>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => loadProfile()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <ProfileHeader userName="Ứng viên" />

      {/* Main Content */}
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Sections */}
          <div className="lg:col-span-8 space-y-6">
            {sortedSections.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm">
                <EmptyState
                  variant="page"
                  title="Bắt đầu xây dựng hồ sơ"
                  description="Thêm các mục thông tin để tạo hồ sơ chuyên nghiệp. Nhà tuyển dụng sẽ dễ dàng tìm thấy bạn hơn!"
                  actionLabel="Thêm mục đầu tiên"
                />
              </div>
            ) : (
              sortedSections.map((section) => (
                <SectionRenderer key={section.id} section={section} />
              ))
            )}

            {/* Add Section CTA when has sections */}
            {sortedSections.length > 0 && (
              <button
                onClick={() => useProfileBuilder.getState().setAddPanelOpen(true)}
                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-2xl">add_circle</span>
                Thêm mục mới
              </button>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Completion Card */}
            <CompletionCard />

            {/* Quick Tips */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                Mẹo nhỏ
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Sử dụng các từ khóa phù hợp với ngành nghề để tăng khả năng được tìm thấy
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Mô tả thành tựu bằng số liệu cụ thể (VD: "Tăng doanh số 30%")
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Cập nhật hồ sơ thường xuyên để luôn ở đầu kết quả tìm kiếm
                </li>
              </ul>
            </div>

            {/* CTA Banner */}
            <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-[24px] p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 size-32 bg-white/10 rounded-full blur-2xl" />
              <h3 className="text-lg font-black mb-2 relative z-10">Cần hỗ trợ?</h3>
              <p className="text-blue-100 text-sm mb-4 relative z-10">
                Liên hệ đội ngũ TalentFlow để được tư vấn.
              </p>
              <button className="w-full py-3 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors relative z-10">
                Liên hệ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Section Panel */}
      <AddSectionPanel />
    </div>
  );
}