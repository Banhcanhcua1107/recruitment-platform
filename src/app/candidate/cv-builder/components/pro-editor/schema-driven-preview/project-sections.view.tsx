"use client";

import { useState, type DragEvent } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableList, EditableText } from "./inline-editors";
import {
  addGroupSubSection,
  addProject,
  addProjectSection,
  removeGroupSubSection,
  removeProject,
  removeProjectSection,
  reorderProjectSections,
  updateGroupSubSection,
  updateProjectDuration,
  updateProjectLayout,
  updateProjectName,
  updateProjectSection,
} from "./project-sections.controller";
import type {
  ProjectGroupSection,
  ProjectModel,
  ProjectSection,
  ProjectSubSection,
} from "./project-sections.model";

interface ProjectCollectionEditorProps {
  projects: ProjectModel[];
  isSectionActive: boolean;
  onChange: (nextProjects: ProjectModel[]) => void;
}

interface ProjectItemProps {
  project: ProjectModel;
  index: number;
  projects: ProjectModel[];
  isSectionActive: boolean;
  onChange: (nextProjects: ProjectModel[]) => void;
}

const labelCellClassName =
  "w-42 border border-slate-300 bg-slate-100 px-2.5 py-1.5 align-top text-[12px] font-bold text-slate-700";
const valueCellClassName = "border border-slate-300 px-2.5 py-1.5 align-top";

function renderSubSectionType(subSection: ProjectSubSection) {
  return subSection.type === "info" ? "Info" : "List";
}

function ProjectGroupEditor({
  projectId,
  group,
  projects,
  isSectionActive,
  onChange,
}: {
  projectId: string;
  group: ProjectGroupSection;
  projects: ProjectModel[];
  isSectionActive: boolean;
  onChange: (nextProjects: ProjectModel[]) => void;
}) {
  return (
    <div className="space-y-2 border-l-2 border-teal-100 pl-3">
      {group.sections.map((subSection) => (
        <div key={subSection.id} className="rounded-md border border-slate-200 bg-slate-50/70 p-2">
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-24 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {renderSubSectionType(subSection)}
            </div>

            <div className="flex-1">
              <EditableText
                value={subSection.label}
                placeholder="Sub-section label"
                isSectionActive={isSectionActive}
                onCommit={(nextLabel) => {
                  onChange(
                    updateGroupSubSection(projects, projectId, group.id, subSection.id, {
                      label: nextLabel,
                    }),
                  );
                }}
                multiline={false}
                showToolbar={false}
                readClassName="px-0 py-0 text-[12px] font-semibold leading-5 text-slate-700"
                editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
              />
            </div>

            {isSectionActive ? (
              <button
                type="button"
                onClick={() => onChange(removeGroupSubSection(projects, projectId, group.id, subSection.id))}
                className="inline-flex h-6 w-6 items-center justify-center text-slate-400 hover:text-rose-600"
                title="Xóa sub-section"
              >
                <Trash2 size={11} />
              </button>
            ) : null}
          </div>

          {subSection.type === "info" ? (
            <EditableText
              value={subSection.value}
              placeholder="Nội dung"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => {
                onChange(
                  updateGroupSubSection(projects, projectId, group.id, subSection.id, {
                    value: nextValue,
                  }),
                );
              }}
              multiline
              minRows={1}
              showToolbar={false}
              readClassName="px-0 py-0 text-[12px] leading-5 text-slate-800"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          ) : (
            <EditableList
              items={subSection.items}
              placeholder="Mục danh sách"
              isSectionActive={isSectionActive}
              onCommit={(nextItems) => {
                onChange(
                  updateGroupSubSection(projects, projectId, group.id, subSection.id, {
                    items: nextItems,
                  }),
                );
              }}
              readClassName="px-0 py-0"
              editClassName="rounded-none border border-slate-300 bg-white px-2 py-2 shadow-none"
            />
          )}
        </div>
      ))}

      {isSectionActive ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onChange(addGroupSubSection(projects, projectId, group.id, "info"))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Sub info
          </button>
          <button
            type="button"
            onClick={() => onChange(addGroupSubSection(projects, projectId, group.id, "list"))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Sub list
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProjectSectionRow({
  project,
  section,
  projects,
  isSectionActive,
  isDropTarget,
  onChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  project: ProjectModel;
  section: ProjectSection;
  projects: ProjectModel[];
  isSectionActive: boolean;
  isDropTarget: boolean;
  onChange: (nextProjects: ProjectModel[]) => void;
  onDragStart: (sectionId: string) => void;
  onDragOver: (event: DragEvent<HTMLTableRowElement>, sectionId: string) => void;
  onDrop: (event: DragEvent<HTMLTableRowElement>, sectionId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <tr
      onDragOver={(event) => onDragOver(event, section.id)}
      onDrop={(event) => onDrop(event, section.id)}
      onDragEnd={onDragEnd}
      className={cn(isDropTarget ? "bg-teal-50/70" : undefined)}
    >
      <td className={labelCellClassName}>
        <div className="flex items-start gap-1.5">
          {isSectionActive ? (
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", section.id);
                onDragStart(section.id);
              }}
              className="inline-flex h-5 w-5 cursor-grab items-center justify-center rounded border border-slate-300 bg-white text-slate-400 hover:text-slate-600"
              title="Kéo để đổi thứ tự"
            >
              <GripVertical size={11} />
            </button>
          ) : null}

          <div className="flex-1">
            <EditableText
              value={section.label}
              placeholder="Section label"
              isSectionActive={isSectionActive}
              onCommit={(nextLabel) => {
                onChange(updateProjectSection(projects, project.id, section.id, { label: nextLabel }));
              }}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[12px] font-bold leading-5 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          </div>

          {isSectionActive ? (
            <button
              type="button"
              onClick={() => onChange(removeProjectSection(projects, project.id, section.id))}
              className="inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
              title="Xóa section"
            >
              <Trash2 size={11} />
            </button>
          ) : null}
        </div>
      </td>

      <td className={valueCellClassName}>
        {section.type === "info" ? (
          <EditableText
            value={section.value}
            placeholder="Nội dung"
            isSectionActive={isSectionActive}
            onCommit={(nextValue) => {
              onChange(updateProjectSection(projects, project.id, section.id, { value: nextValue }));
            }}
            multiline
            minRows={1}
            showToolbar={false}
            readClassName="px-0 py-0 text-[12px] leading-5 text-slate-800"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        ) : null}

        {section.type === "list" ? (
          <EditableList
            items={section.items}
            placeholder="Mục danh sách"
            isSectionActive={isSectionActive}
            onCommit={(nextItems) => {
              onChange(updateProjectSection(projects, project.id, section.id, { items: nextItems }));
            }}
            readClassName="px-0 py-0"
            editClassName="rounded-none border border-slate-300 bg-white px-2 py-2 shadow-none"
          />
        ) : null}

        {section.type === "group" ? (
          <ProjectGroupEditor
            projectId={project.id}
            group={section}
            projects={projects}
            isSectionActive={isSectionActive}
            onChange={onChange}
          />
        ) : null}
      </td>
    </tr>
  );
}

function ProjectStackedLayout({
  project,
  projects,
  isSectionActive,
  onChange,
}: {
  project: ProjectModel;
  projects: ProjectModel[];
  isSectionActive: boolean;
  onChange: (nextProjects: ProjectModel[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-slate-300 bg-slate-50/70 px-2.5 py-2 text-[12px] text-slate-700">
        <span className="font-semibold">Duration: </span>
        <span>{project.duration.from || "--"}</span>
        <span className="mx-1">-</span>
        <span>{project.duration.to || "--"}</span>
      </div>

      {project.sections.map((section) => (
        <div key={section.id} className="rounded-md border border-slate-300 px-2.5 py-2">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <EditableText
              value={section.label}
              placeholder="Section label"
              isSectionActive={isSectionActive}
              onCommit={(nextLabel) => {
                onChange(updateProjectSection(projects, project.id, section.id, { label: nextLabel }));
              }}
              multiline={false}
              showToolbar={false}
              readClassName="px-0 py-0 text-[12px] font-bold leading-5 text-slate-700"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
            {isSectionActive ? (
              <button
                type="button"
                onClick={() => onChange(removeProjectSection(projects, project.id, section.id))}
                className="inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
                title="Xóa section"
              >
                <Trash2 size={11} />
              </button>
            ) : null}
          </div>

          {section.type === "info" ? (
            <EditableText
              value={section.value}
              placeholder="Nội dung"
              isSectionActive={isSectionActive}
              onCommit={(nextValue) => {
                onChange(updateProjectSection(projects, project.id, section.id, { value: nextValue }));
              }}
              multiline
              minRows={1}
              showToolbar={false}
              readClassName="px-0 py-0 text-[12px] leading-5 text-slate-800"
              editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
            />
          ) : null}

          {section.type === "list" ? (
            <EditableList
              items={section.items}
              placeholder="Mục danh sách"
              isSectionActive={isSectionActive}
              onCommit={(nextItems) => {
                onChange(updateProjectSection(projects, project.id, section.id, { items: nextItems }));
              }}
              readClassName="px-0 py-0"
              editClassName="rounded-none border border-slate-300 bg-white px-2 py-2 shadow-none"
            />
          ) : null}

          {section.type === "group" ? (
            <ProjectGroupEditor
              projectId={project.id}
              group={section}
              projects={projects}
              isSectionActive={isSectionActive}
              onChange={onChange}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProjectItem({ project, index, projects, isSectionActive, onChange }: ProjectItemProps) {
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);

  const onDropSection = (event: DragEvent<HTMLTableRowElement>, targetSectionId: string) => {
    if (!isSectionActive) {
      return;
    }

    event.preventDefault();

    const sourceSectionId = event.dataTransfer.getData("text/plain") || draggingSectionId;

    setDropTargetSectionId(null);
    setDraggingSectionId(null);

    if (!sourceSectionId || sourceSectionId === targetSectionId) {
      return;
    }

    onChange(reorderProjectSections(projects, project.id, sourceSectionId, targetSectionId));
  };

  return (
    <div className="group/project-item relative text-[12px] text-slate-800">
      <div className="mb-1.5 flex items-start gap-2">
        <EditableText
          value={project.projectName}
          placeholder={`PROJECT ${index + 1}`}
          isSectionActive={isSectionActive}
          onCommit={(nextValue) => onChange(updateProjectName(projects, project.id, nextValue))}
          multiline={false}
          showToolbar={false}
          readClassName="px-0 py-0 text-[13px] font-bold uppercase leading-6 text-slate-900"
          editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
        />

        {isSectionActive ? (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(updateProjectLayout(projects, project.id, "table"))}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-semibold",
                project.layoutVariant === "table"
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-slate-300 text-slate-600 hover:border-teal-300 hover:text-teal-700",
              )}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => onChange(updateProjectLayout(projects, project.id, "stacked"))}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-semibold",
                project.layoutVariant === "stacked"
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-slate-300 text-slate-600 hover:border-teal-300 hover:text-teal-700",
              )}
            >
              Stacked
            </button>
            <button
              type="button"
              onClick={() => onChange(removeProject(projects, project.id))}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-rose-600"
              title="Xóa dự án"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : null}
      </div>

      {project.layoutVariant === "stacked" ? (
        <ProjectStackedLayout
          project={project}
          projects={projects}
          isSectionActive={isSectionActive}
          onChange={onChange}
        />
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            <tr>
              <td className={labelCellClassName}>Duration</td>
              <td className={valueCellClassName}>
                <div className="flex flex-wrap items-center gap-1">
                  <EditableText
                    value={project.duration.from}
                    placeholder="01/2019"
                    isSectionActive={isSectionActive}
                    onCommit={(nextValue) => {
                      onChange(updateProjectDuration(projects, project.id, "from", nextValue));
                    }}
                    multiline={false}
                    showToolbar={false}
                    readClassName="inline px-0 py-0 text-[12px] leading-5 text-slate-800"
                    editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                  />
                  <span className="text-slate-500">-</span>
                  <EditableText
                    value={project.duration.to}
                    placeholder="Present"
                    isSectionActive={isSectionActive}
                    onCommit={(nextValue) => {
                      onChange(updateProjectDuration(projects, project.id, "to", nextValue));
                    }}
                    multiline={false}
                    showToolbar={false}
                    readClassName="inline px-0 py-0 text-[12px] leading-5 text-slate-800"
                    editClassName="inline rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
                  />
                </div>
              </td>
            </tr>

            {project.sections.map((section) => (
              <ProjectSectionRow
                key={section.id}
                project={project}
                section={section}
                projects={projects}
                isSectionActive={isSectionActive}
                isDropTarget={dropTargetSectionId === section.id}
                onChange={onChange}
                onDragStart={(sectionId) => setDraggingSectionId(sectionId)}
                onDragOver={(event, sectionId) => {
                  if (!isSectionActive || !draggingSectionId || draggingSectionId === sectionId) {
                    return;
                  }

                  event.preventDefault();
                  setDropTargetSectionId(sectionId);
                }}
                onDrop={onDropSection}
                onDragEnd={() => {
                  setDraggingSectionId(null);
                  setDropTargetSectionId(null);
                }}
              />
            ))}
          </tbody>
        </table>
      )}

      {isSectionActive ? (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onChange(addProjectSection(projects, project.id, "info"))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Add info
          </button>
          <button
            type="button"
            onClick={() => onChange(addProjectSection(projects, project.id, "list"))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Add list
          </button>
          <button
            type="button"
            onClick={() => onChange(addProjectSection(projects, project.id, "group"))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Add group
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectCollectionEditor({ projects, isSectionActive, onChange }: ProjectCollectionEditorProps) {
  return (
    <div className="space-y-3">
      {projects.map((project, index) => (
        <ProjectItem
          key={project.id || `project-item-${index}`}
          project={project}
          index={index}
          projects={projects}
          isSectionActive={isSectionActive}
          onChange={onChange}
        />
      ))}

      {isSectionActive ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onChange(addProject(projects))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={11} />
            Thêm dự án
          </button>
        </div>
      ) : null}
    </div>
  );
}
