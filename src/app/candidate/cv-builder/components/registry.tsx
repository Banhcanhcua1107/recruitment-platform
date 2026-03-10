import { 
  CVSection, 
  PersonalInfoData, 
  ExperienceListSectionData, 
  HeaderData,
  RichOutlineNode,
  RichOutlineSectionData,
  SummarySectionData,
  EducationListSectionData,
  SkillListSectionData,
  ExperienceItem, 
  EducationItem,
  SkillItem
} from '../types';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';
import React from 'react';

// --- Header Block ---
const HeaderBlock = ({ data, theme }: { data: HeaderData, theme: any }) => (
  <div className="flex items-center gap-6 mb-2">
     {data.avatarUrl && (
        <div className="size-24 rounded-full overflow-hidden border-2 shadow-sm shrink-0" style={{ borderColor: theme.colors.primary }}>
            <img src={data.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        </div>
     )}
     <div>
        <h1 className="text-4xl font-extrabold text-slate-900 leading-tight" style={{ fontFamily: theme.fonts.heading }}>
            {data.fullName || 'Your Name'}
        </h1>
        <p className="text-xl font-medium mt-1" style={{ color: theme.colors.primary }}>
            {data.title || 'Professional Title'}
        </p>
     </div>
  </div>
);

// --- Personal Info Block ---
const PersonalInfoBlock = ({ data }: { data: PersonalInfoData }) => (
    <div className="flex flex-wrap gap-4 text-sm text-slate-600 border-b border-slate-200 pb-6 mb-6">
        {data.email && (
            <div className="flex items-center gap-1.5">
                <Mail size={14} className="opacity-70" />
                <span>{data.email}</span>
            </div>
        )}
        {data.phone && (
            <div className="flex items-center gap-1.5">
                <Phone size={14} className="opacity-70" />
                <span>{data.phone}</span>
            </div>
        )}
         {data.address && (
            <div className="flex items-center gap-1.5">
                <MapPin size={14} className="opacity-70" />
                <span>{data.address}</span>
            </div>
        )}
        {data.socials?.map((social: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5">
                <Globe size={14} className="opacity-70" />
                <a href={social.url} target="_blank" rel="noreferrer" className="hover:underline">{social.network}</a>
            </div>
        ))}
    </div>
);

// --- Summary Block ---
const SummaryBlock = ({ data }: { data: SummarySectionData }) => (
    <div className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-100 pb-1 w-full">
            Professional Summary
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {data.text || 'Add a professional summary...'}
        </p>
    </div>
);

const CustomTextBlock = ({ data, title }: { data: { text?: string }, title?: string }) => (
    <div className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-100 pb-1 w-full">
            {title || 'Custom Section'}
        </h3>
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {data.text || 'Add custom content...'}
        </div>
    </div>
);

const RichOutlineNodeBlock = ({ node }: { node: RichOutlineNode }) => {
  if (node.kind === "heading") {
    return (
      <li className="list-none">
        <div className="font-semibold text-slate-900">{node.text}</div>
        {node.children.length > 0 && (
          <ul className="mt-1 space-y-1 ml-4">
            {node.children.map((child) => (
              <RichOutlineNodeBlock key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className={node.kind === "bullet" ? "list-disc ml-4" : "list-none"}>
      <div className="text-slate-700">
        {node.kind === "meta" ? <span className="text-slate-500">{node.text}</span> : node.text}
      </div>
      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1 ml-4">
          {node.children.map((child) => (
            <RichOutlineNodeBlock key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const RichOutlineBlock = ({ data, title }: { data: RichOutlineSectionData; title?: string }) => (
  <div className="mb-6">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-100 pb-1 w-full">
      {title || "Structured Outline"}
    </h3>
    <ul className="text-sm text-slate-700 leading-relaxed space-y-1">
      {data.nodes.length > 0 ? (
        data.nodes.map((node) => <RichOutlineNodeBlock key={node.id} node={node} />)
      ) : (
        <li className="list-none text-slate-400">Add structured content...</li>
      )}
    </ul>
  </div>
);

// --- Experience Block ---
const ExperienceListBlock = ({ data }: { data: ExperienceListSectionData }) => (
  <div className="mb-6">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b-2 border-slate-100 pb-1">
        Work Experience
    </h3>
    <div className="space-y-5">
        {(data.items || []).map((item: ExperienceItem) => (
        <div key={item.id} className="relative pl-4 border-l-2 border-slate-200">
             {/* Timeline dot */}
             <div className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-slate-300"></div>
             
             <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-bold text-slate-900">{item.position}</h4>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.startDate} - {item.endDate}
                </span>
             </div>
             
             <p className="text-xs font-bold text-emerald-600 mb-2">{item.company}</p>
             <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
        </div>
        ))}
    </div>
  </div>
);

// --- Education Block ---
const EducationListBlock = ({ data }: { data: EducationListSectionData }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b-2 border-slate-100 pb-1">
          Education
      </h3>
      <div className="space-y-4">
          {(data.items || []).map((item: EducationItem) => (
          <div key={item.id}>
               <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-slate-900">{item.institution}</h4>
                  <span className="text-xs font-semibold text-slate-500">
                      {item.startDate} - {item.endDate}
                  </span>
               </div>
               <p className="text-sm text-slate-600">{item.degree}</p>
          </div>
          ))}
      </div>
    </div>
);

// --- Skills Block ---
const SkillListBlock = ({ data, theme }: { data: SkillListSectionData, theme: any }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b-2 border-slate-100 pb-1">
          Skills
      </h3>
      <div className="flex flex-wrap gap-2">
          {(data.items || []).map((item: SkillItem) => (
            <span 
                key={item.id} 
                className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md"
            >
                {item.name}
            </span>
          ))}
      </div>
    </div>
);


const GenericBlock = ({ type }: { type: string }) => (
  <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-center">
    <p className="text-xs font-bold text-slate-400 uppercase">Unknown Block: {type}</p>
  </div>
);

export const CVComponentRenderer = ({ section, theme }: { section: CVSection, theme: any }) => {
  switch (section.type) {
    case 'header':
      return <HeaderBlock data={section.data as HeaderData} theme={theme} />;
    case 'personal_info':
      return <PersonalInfoBlock data={section.data as PersonalInfoData} />;
    case 'summary':
       return <SummaryBlock data={section.data as SummarySectionData} />;
    case 'experience_list':
      return <ExperienceListBlock data={section.data as ExperienceListSectionData} />;
    case 'education_list':
        return <EducationListBlock data={section.data as EducationListSectionData} />;
    case 'skill_list':
        return <SkillListBlock data={section.data as SkillListSectionData} theme={theme} />;
    case 'rich_outline':
        return <RichOutlineBlock data={section.data as RichOutlineSectionData} title={section.title} />;
    case 'custom_text':
        return <CustomTextBlock data={section.data as { text?: string }} title={section.title} />;
    default:
      return <GenericBlock type={section.type} />;
  }
};
