import { CVSection, PersonalInfoData, ExperienceListSectionData, ExperienceItem } from '../types';

// Placeholder Components
const PersonalInfoBlock = ({ data }: { data: PersonalInfoData }) => (
  <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg">
    <h1 className="text-2xl font-bold text-slate-900">{data.fullName || 'Your Name'}</h1>
    <p className="text-primary font-medium">{data.title || 'Professional Title'}</p>
    <div className="text-xs text-slate-500 mt-2 space-y-1">
      <p>{data.email}</p>
      <p>{data.phone}</p>
    </div>
  </div>
);

const ExperienceListBlock = ({ data }: { data: ExperienceListSectionData }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-black uppercase tracking-widest border-b border-primary/20 pb-2 text-primary">Work Experience</h3>
    {(data.items || []).length === 0 && <p className="text-xs text-slate-400 italic">No experience added yet.</p>}
    {(data.items || []).map((db: ExperienceItem) => (
       <div key={db.id} className="mb-3">
          <div className="flex justify-between items-baseline">
             <h4 className="font-bold text-slate-800">{db.position}</h4>
             <span className="text-xs font-bold text-slate-400">{db.startDate} - {db.endDate}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mb-1">{db.company}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{db.description}</p>
       </div>
    ))}
  </div>
);

const GenericBlock = ({ type, title }: { type: string, title?: string }) => (
  <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-white">
    <p className="text-xs font-bold text-slate-400 uppercase">{title || type}</p>
  </div>
);

export const CVComponentRenderer = ({ section }: { section: CVSection }) => {
  switch (section.type) {
    case 'personal_info':
      return <PersonalInfoBlock data={section.data as PersonalInfoData} />;
    case 'experience_list':
      return <ExperienceListBlock data={section.data as ExperienceListSectionData} />;
    default:
      return <GenericBlock type={section.type} title={section.title} />;
  }
};
