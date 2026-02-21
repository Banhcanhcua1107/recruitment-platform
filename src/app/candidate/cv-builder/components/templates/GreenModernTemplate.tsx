"use client";

import React from 'react';
import { useCVStore } from '../../store';
import { InlineText } from '../inline/InlineText';
import { InlineTextarea } from '../inline/InlineTextarea';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Code, 
  Layers, 
} from 'lucide-react';
import { 
  HeaderData, 
  PersonalInfoData, 
  ExperienceListSectionData, 
  EducationListSectionData, 
  SkillListSectionData, 
  SummarySectionData, 
  ProjectListSectionData, 
  AwardListSectionData,
  CVSection 
} from '../../types';

// --- Icons Mapping ---
const getSectionIcon = (type: string) => {
  switch (type) {
    case 'summary': return <User size={20} />;
    case 'experience_list': return <Briefcase size={20} />;
    case 'education_list': return <GraduationCap size={20} />;
    case 'skill_list': return <Code size={20} />;
    case 'project_list': return <Layers size={20} />;
    case 'award_list': return <Award size={20} />;
    default: return <User size={20} />;
  }
};

// --- Section Header Component ---
const SectionHeader = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-slate-100">
    <div className="text-emerald-600 bg-emerald-50 p-1.5 rounded-full">
        {icon}
    </div>
    <h2 className="text-xl font-bold text-emerald-600 uppercase tracking-wide">
      {title}
    </h2>
  </div>
);

export const GreenModernTemplate = () => {
  const { cv, updateSection, updateSectionData } = useCVStore();

  const handleUpdateData = (sectionId: string, data: Record<string, unknown>) => {
    updateSectionData(sectionId, data);
  };

  const renderSection = (section: CVSection) => {
    switch (section.type) {
      case 'header': {
        const data = section.data as HeaderData;
        return (
          <div className="mb-8">
            <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                    <div className="text-4xl font-extrabold text-emerald-600 leading-tight uppercase">
                        <InlineText 
                            value={data.fullName} 
                            onChange={(v) => handleUpdateData(section.id, { fullName: v })} 
                            className="font-extrabold"
                        />
                    </div>
                    <div className="text-xl font-medium text-slate-800">
                        <InlineText 
                            value={data.title} 
                            onChange={(v) => handleUpdateData(section.id, { title: v })} 
                        />
                    </div>
                </div>
                {data.avatarUrl && (
                    <div className="w-32 h-32 ml-6 rounded-md overflow-hidden bg-slate-200 border-2 border-emerald-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
          </div>
        );
      }

      case 'personal_info': {
        const data = section.data as PersonalInfoData;
        return (
          <div className="grid grid-cols-2 gap-y-2 gap-x-8 mb-8 text-sm text-slate-700">
             <div className="flex items-center gap-3">
                <span className="font-bold w-16 shrink-0">Ngày sinh</span>
                <InlineText value={data.dob || ''} onChange={(v) => handleUpdateData(section.id, { dob: v })} />
             </div>
             <div className="flex items-center gap-3">
                <span className="font-bold w-16 shrink-0">Email</span>
                <InlineText value={data.email} onChange={(v) => handleUpdateData(section.id, { email: v })} />
             </div>
             <div className="flex items-center gap-3">
                <span className="font-bold w-16 shrink-0">SĐT</span>
                <InlineText value={data.phone} onChange={(v) => handleUpdateData(section.id, { phone: v })} />
             </div>
             <div className="flex items-center gap-3">
                <span className="font-bold w-16 shrink-0">Địa chỉ</span>
                <InlineText value={data.address} onChange={(v) => handleUpdateData(section.id, { address: v })} />
             </div>
             {/* Website / Socials could go here */}
          </div>
        );
      }

      case 'summary': {
        const data = section.data as SummarySectionData;
        return (
          <div className="mb-8 group">
            <SectionHeader title={section.title || "Overview"} icon={getSectionIcon(section.type)} />
            <div className="text-sm text-slate-700 leading-relaxed">
                <InlineTextarea 
                    value={data.text} 
                    onChange={(v) => handleUpdateData(section.id, { text: v })} 
                    className="min-h-[100px]"
                />
            </div>
          </div>
        );
      }

      case 'experience_list': {
        const data = section.data as ExperienceListSectionData;
        return (
          <div className="mb-8">
            <SectionHeader title={section.title || "Experience"} icon={getSectionIcon(section.type)} />
            <div className="space-y-6">
                {data.items.map((item, index) => (
                    <div key={item.id} className="relative pl-6 border-l-2 border-slate-200">
                        {/* Dot */}
                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></div>
                        
                        <div className="flex justify-between items-baseline mb-1">
                            <div className="font-bold text-slate-900 uppercase text-sm">
                                <InlineText 
                                    value={item.startDate} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].startDate = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                    className="inline"
                                /> 
                                <span className="mx-1">-</span>
                                <InlineText 
                                    value={item.endDate} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].endDate = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                    className="inline"
                                />
                            </div>
                            <div className="font-bold text-slate-900 uppercase">
                                <InlineText 
                                    value={item.company} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].company = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </div>
                        </div>
                        
                        <div className="text-sm font-bold text-slate-700 italic mb-2">
                             <InlineText 
                                value={item.position} 
                                onChange={(v) => {
                                    const newItems = [...data.items];
                                    newItems[index].position = v;
                                    handleUpdateData(section.id, { items: newItems });
                                }} 
                            />
                        </div>

                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            <InlineTextarea 
                                value={item.description} 
                                onChange={(v) => {
                                    const newItems = [...data.items];
                                    newItems[index].description = v;
                                    handleUpdateData(section.id, { items: newItems });
                                }} 
                            />
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      }

      case 'education_list': {
        const data = section.data as EducationListSectionData;
        return (
          <div className="mb-8">
            <SectionHeader title={section.title || "Education"} icon={getSectionIcon(section.type)} />
            <div className="space-y-4">
                {data.items.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-start border-b border-dashed border-slate-200 pb-3">
                        <div className="w-32 font-bold text-sm text-slate-700 shrink-0">
                             <InlineText 
                                value={`${item.startDate} - ${item.endDate}`} 
                                onChange={(v) => {
                                    // Complex split logic omitted for simplicity unless requested
                                }}
                                placeholder="YYYY - YYYY"
                            />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 uppercase text-sm">
                                <InlineText 
                                    value={item.institution} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].institution = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </h4>
                            <p className="text-sm text-slate-600">
                                <InlineText 
                                    value={item.degree} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].degree = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      }

      case 'skill_list': {
        const data = section.data as SkillListSectionData;
        return (
          <div className="mb-8">
            <SectionHeader title={section.title || "Skills"} icon={getSectionIcon(section.type)} />
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                {data.items.map((item, index) => (
                    <li key={item.id}>
                        <span className="font-bold mr-2">{item.name.split(':')[0]}:</span> 
                        {/* Naive split for "Main: HTML, CSS" style */}
                        <InlineText 
                            value={item.name} 
                            onChange={(v) => {
                                const newItems = [...data.items];
                                newItems[index].name = v;
                                handleUpdateData(section.id, { items: newItems });
                            }} 
                        />
                    </li>
                ))}
            </ul>
          </div>
        );
      }

      case 'project_list': {
        const data = section.data as ProjectListSectionData;
        return (
          <div className="mb-8">
            <SectionHeader title={section.title || "Projects"} icon={getSectionIcon(section.type)} />
            <div className="space-y-6">
                {data.items.map((item, index) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-emerald-600 uppercase">
                                <InlineText 
                                    value={item.name} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].name = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </h3>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                {item.startDate} - {item.endDate}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                            <div className="font-bold text-slate-700">Client</div>
                            <div>
                                <InlineText 
                                    value={item.customer || ''} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].customer = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </div>

                            <div className="font-bold text-slate-700">Descriptions</div>
                            <div>
                                <InlineTextarea
                                    value={item.description} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].description = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </div>

                            <div className="font-bold text-slate-700">Team Size</div>
                            <div>{item.teamSize}</div>

                            <div className="font-bold text-slate-700">Position</div>
                            <div>
                                <InlineText 
                                    value={item.role} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].role = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </div>

                            <div className="font-bold text-slate-700">Technology</div>
                            <div className="whitespace-pre-wrap">
                                <InlineTextarea
                                    value={item.technologies} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].technologies = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      }

      case 'award_list': {
        const data = section.data as AwardListSectionData;
        return (
          <div className="mb-8">
            <SectionHeader title={section.title || "Awards"} icon={getSectionIcon(section.type)} />
            <div className="space-y-3">
                {data.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[80px_1fr] gap-4 text-sm">
                        <div className="font-bold text-slate-900 border-r border-slate-200 pr-4 text-right">
                            {item.date}
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-700">
                                <InlineText 
                                    value={item.title} 
                                    onChange={(v) => {
                                        const newItems = [...data.items];
                                        newItems[index].title = v;
                                        handleUpdateData(section.id, { items: newItems });
                                    }} 
                                />
                            </h4>
                            <p className="text-slate-600 italic">
                                {item.issuer}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div 
        className="w-full min-h-[297mm] p-[15mm] bg-white shadow-lg mx-auto print:shadow-none print:p-0 print:m-0"
        style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {cv.sections.map(section => (
        <div key={section.id} className="group relative">
            {/* Render Component */}
            {renderSection(section)}
            
            {/* Focus Indicator (Optional) */}
            <div className="absolute inset-0 border border-transparent group-hover:border-slate-100 pointer-events-none rounded-lg -m-2"></div>
        </div>
      ))}
    </div>
  );
};
