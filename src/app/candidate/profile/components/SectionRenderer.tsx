'use client';

import { Section, SectionContent, PersonalInfoContent, SkillsContent, LanguagesContent, ExperienceContent, EducationContent, SummaryContent, CareerGoalContent } from '../types/profile';
import { useProfileBuilder } from '../stores/profileBuilderStore';
import SectionCard from './SectionCard';
import PersonalInfoSection from './sections/PersonalInfoSection';
import SkillsSection from './sections/SkillsSection';
import LanguagesSection from './sections/LanguagesSection';
import ExperienceSection from './sections/ExperienceSection';
import EducationSection from './sections/EducationSection';
import TextSection from './sections/TextSection';
import EmptyState from './EmptyState';

interface SectionRendererProps {
  section: Section;
}

export default function SectionRenderer({ section }: SectionRendererProps) {
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

      case 'summary':
        return (
          <TextSection
            sectionId={section.id}
            content={section.content as SummaryContent}
            isEditing={isEditing}
            placeholder="Viết về bản thân bạn: kinh nghiệm, điểm mạnh, thành tựu nổi bật..."
            emptyMessage="Chưa có giới thiệu bản thân"
          />
        );

      case 'career_goal':
        return (
          <TextSection
            sectionId={section.id}
            content={section.content as CareerGoalContent}
            isEditing={isEditing}
            placeholder="Mục tiêu nghề nghiệp ngắn hạn và dài hạn của bạn..."
            emptyMessage="Chưa có mục tiêu nghề nghiệp"
          />
        );

      // Placeholder for other sections
      case 'certifications':
      case 'projects':
      case 'links':
        return (
          <EmptyState
            sectionType={section.type}
            description="Section này đang được phát triển"
          />
        );

      default:
        return <div className="text-slate-400">Unknown section type</div>;
    }
  };

  return (
    <SectionCard section={section}>
      {renderContent()}
    </SectionCard>
  );
}
