'use client';

import type {
  CareerGoalContent,
  CertificationsContent,
  EducationContent,
  ExperienceContent,
  LanguagesContent,
  PersonalInfoContent,
  Section,
  SkillsContent,
  SummaryContent,
} from '../types/profile';
import { useProfileBuilder } from '../stores/profileBuilderStore';
import EmptyState from './EmptyState';
import SectionCard from './SectionCard';
import EducationSection from './sections/EducationSection';
import ExperienceSection from './sections/ExperienceSection';
import CertificationsSection from './sections/CertificationsSection';
import LanguagesSection from './sections/LanguagesSection';
import PersonalInfoSection from './sections/PersonalInfoSection';
import SkillsSection from './sections/SkillsSection';
import TextSection from './sections/TextSection';

interface SectionRendererProps {
  section: Section;
  readOnly?: boolean;
}

export default function SectionRenderer({
  section,
  readOnly = false,
}: SectionRendererProps) {
  const { editingSectionId } = useProfileBuilder();
  const isEditing = editingSectionId === section.id;

  const renderContent = () => {
    switch (section.type) {
      case 'personal_info':
        return (
          <PersonalInfoSection
            sectionId={section.id}
            content={section.content as PersonalInfoContent}
            isEditing={isEditing}
          />
        );

      case 'skills':
        return (
          <SkillsSection
            sectionId={section.id}
            content={section.content as SkillsContent}
            isEditing={isEditing}
          />
        );

      case 'languages':
        return (
          <LanguagesSection
            sectionId={section.id}
            content={section.content as LanguagesContent}
            isEditing={isEditing}
          />
        );

      case 'experience':
        return (
          <ExperienceSection
            sectionId={section.id}
            content={section.content as ExperienceContent}
            isEditing={isEditing}
          />
        );

      case 'education':
        return (
          <EducationSection
            sectionId={section.id}
            content={section.content as EducationContent}
            isEditing={isEditing}
          />
        );

      case 'certifications':
        return (
          <CertificationsSection
            sectionId={section.id}
            content={section.content as CertificationsContent}
            isEditing={isEditing}
          />
        );

      case 'summary':
        return (
          <TextSection
            sectionId={section.id}
            content={section.content as SummaryContent}
            isEditing={isEditing}
            placeholder="Viết về bản thân, điểm mạnh nổi bật và giá trị bạn mang lại cho nhà tuyển dụng."
            emptyMessage="Chưa có phần giới thiệu bản thân."
          />
        );

      case 'career_goal':
        return (
          <TextSection
            sectionId={section.id}
            content={section.content as CareerGoalContent}
            isEditing={isEditing}
            placeholder="Mô tả mục tiêu nghề nghiệp ngắn hạn và định hướng bạn đang theo đuổi."
            emptyMessage="Chưa có mục tiêu nghề nghiệp."
          />
        );

      case 'projects':
        return (
          <EmptyState
            sectionType={section.type}
            description="Mục dự án sẽ được hoàn thiện ở pha tiếp theo."
          />
        );

      case 'links':
        return (
          <EmptyState
            sectionType={section.type}
            description="Thêm liên kết LinkedIn, GitHub hoặc portfolio để hồ sơ nổi bật hơn."
          />
        );

      default:
        return (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
            Thành phần này hiện chưa được hỗ trợ.
          </div>
        );
    }
  };

  return (
    <SectionCard section={section} readOnly={readOnly}>
      {renderContent()}
    </SectionCard>
  );
}
