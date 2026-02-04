'use client';

import { SkillsContent, Skill } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';
import SkillTagInput from '../inputs/SkillTagInput';

interface SkillsSectionProps {
  sectionId: string;
  content: SkillsContent;
  isEditing: boolean;
}

export default function SkillsSection({ sectionId, content, isEditing }: SkillsSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();

  const handleSkillsChange = (skills: Skill[]) => {
    updateSection(sectionId, { skills });
  };

  // View mode
  if (!isEditing) {
    if (content.skills.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Chưa có kỹ năng nào</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm kỹ năng
          </button>
        </div>
      );
    }

    // Group skills by category
    const grouped = content.skills.reduce((acc, skill) => {
      const cat = skill.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {} as Record<string, Skill[]>);

    const categoryLabels: Record<string, string> = {
      frontend: 'Frontend',
      backend: 'Backend',
      database: 'Database',
      devops: 'DevOps',
      mobile: 'Mobile',
      data: 'Data',
      design: 'Design',
      soft_skills: 'Soft Skills',
      tools: 'Tools',
      marketing: 'Marketing',
      other: 'Khác',
    };

    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        frontend: 'bg-blue-100 text-blue-700',
        backend: 'bg-green-100 text-green-700',
        database: 'bg-purple-100 text-purple-700',
        devops: 'bg-orange-100 text-orange-700',
        mobile: 'bg-pink-100 text-pink-700',
        data: 'bg-cyan-100 text-cyan-700',
        design: 'bg-rose-100 text-rose-700',
        soft_skills: 'bg-amber-100 text-amber-700',
        tools: 'bg-slate-100 text-slate-700',
        marketing: 'bg-violet-100 text-violet-700',
        other: 'bg-slate-100 text-slate-700',
      };
      return colors[category] || colors.other;
    };

    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, skills]) => (
          <div key={category}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {categoryLabels[category] || category}
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <span
                  key={skill.id}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold ${getCategoryColor(category)}`}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <SkillTagInput
        skills={content.skills}
        onChange={handleSkillsChange}
        placeholder="Tìm và thêm kỹ năng (VD: ReactJS, Python...)"
        maxSkills={20}
      />

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
