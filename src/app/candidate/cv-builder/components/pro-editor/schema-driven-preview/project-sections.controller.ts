import {
  createDefaultProjectModel,
  createDefaultProjectSection,
  createDefaultProjectSubSection,
  type ProjectLayoutVariant,
  type ProjectModel,
  type ProjectSection,
  type ProjectSectionType,
  type ProjectSubSection,
} from "./project-sections.model";

function mapProjectById(
  projects: ProjectModel[],
  projectId: string,
  updater: (project: ProjectModel) => ProjectModel,
) {
  return projects.map((project) => (project.id === projectId ? updater(project) : project));
}

export function addProject(projects: ProjectModel[]) {
  return [...projects, createDefaultProjectModel(projects.length + 1)];
}

export function removeProject(projects: ProjectModel[], projectId: string) {
  const nextProjects = projects.filter((project) => project.id !== projectId);

  if (nextProjects.length > 0) {
    return nextProjects;
  }

  return [createDefaultProjectModel(1)];
}

export function updateProjectName(projects: ProjectModel[], projectId: string, projectName: string) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    projectName,
  }));
}

export function updateProjectDuration(
  projects: ProjectModel[],
  projectId: string,
  key: "from" | "to",
  value: string,
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    duration: {
      ...project.duration,
      [key]: value,
    },
  }));
}

export function updateProjectLayout(
  projects: ProjectModel[],
  projectId: string,
  layoutVariant: ProjectLayoutVariant,
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    layoutVariant,
  }));
}

export function addProjectSection(projects: ProjectModel[], projectId: string, type: ProjectSectionType) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    sections: [...project.sections, createDefaultProjectSection(type)],
  }));
}

function applySectionUpdates(section: ProjectSection, updates: Partial<ProjectSection>): ProjectSection {
  if (section.type === "group") {
    const groupUpdates = updates as Partial<ProjectSection>;
    return {
      ...section,
      label: typeof groupUpdates.label === "string" ? groupUpdates.label : section.label,
    };
  }

  if (section.type === "list") {
    const listUpdates = updates as Partial<ProjectSection>;
    return {
      ...section,
      label: typeof listUpdates.label === "string" ? listUpdates.label : section.label,
      items: Array.isArray((listUpdates as { items?: unknown }).items)
        ? ((listUpdates as { items: string[] }).items)
        : section.items,
    };
  }

  const infoUpdates = updates as Partial<ProjectSection>;
  return {
    ...section,
    label: typeof infoUpdates.label === "string" ? infoUpdates.label : section.label,
    value: typeof (infoUpdates as { value?: unknown }).value === "string"
      ? ((infoUpdates as { value: string }).value)
      : section.value,
  };
}

export function updateProjectSection(
  projects: ProjectModel[],
  projectId: string,
  sectionId: string,
  updates: Partial<ProjectSection>,
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    sections: project.sections.map((section) => (
      section.id === sectionId ? applySectionUpdates(section, updates) : section
    )),
  }));
}

export function removeProjectSection(projects: ProjectModel[], projectId: string, sectionId: string) {
  return mapProjectById(projects, projectId, (project) => {
    const nextSections = project.sections.filter((section) => section.id !== sectionId);

    return {
      ...project,
      sections: nextSections.length > 0 ? nextSections : [createDefaultProjectSection("info")],
    };
  });
}

export function reorderProjectSections(
  projects: ProjectModel[],
  projectId: string,
  sourceSectionId: string,
  targetSectionId: string,
) {
  if (sourceSectionId === targetSectionId) {
    return projects;
  }

  return mapProjectById(projects, projectId, (project) => {
    const sourceIndex = project.sections.findIndex((section) => section.id === sourceSectionId);
    const targetIndex = project.sections.findIndex((section) => section.id === targetSectionId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return project;
    }

    const nextSections = [...project.sections];
    const [movedSection] = nextSections.splice(sourceIndex, 1);

    if (!movedSection) {
      return project;
    }

    nextSections.splice(targetIndex, 0, movedSection);

    return {
      ...project,
      sections: nextSections,
    };
  });
}

function applySubSectionUpdates(section: ProjectSubSection, updates: Partial<ProjectSubSection>): ProjectSubSection {
  if (section.type === "list") {
    return {
      ...section,
      label: typeof updates.label === "string" ? updates.label : section.label,
      items: Array.isArray((updates as { items?: unknown }).items)
        ? ((updates as { items: string[] }).items)
        : section.items,
    };
  }

  return {
    ...section,
    label: typeof updates.label === "string" ? updates.label : section.label,
    value: typeof (updates as { value?: unknown }).value === "string"
      ? ((updates as { value: string }).value)
      : section.value,
  };
}

export function addGroupSubSection(
  projects: ProjectModel[],
  projectId: string,
  groupId: string,
  type: "info" | "list",
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    sections: project.sections.map((section) => {
      if (section.id !== groupId || section.type !== "group") {
        return section;
      }

      return {
        ...section,
        sections: [...section.sections, createDefaultProjectSubSection(type)],
      };
    }),
  }));
}

export function updateGroupSubSection(
  projects: ProjectModel[],
  projectId: string,
  groupId: string,
  subSectionId: string,
  updates: Partial<ProjectSubSection>,
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    sections: project.sections.map((section) => {
      if (section.id !== groupId || section.type !== "group") {
        return section;
      }

      return {
        ...section,
        sections: section.sections.map((subSection) => (
          subSection.id === subSectionId
            ? applySubSectionUpdates(subSection, updates)
            : subSection
        )),
      };
    }),
  }));
}

export function removeGroupSubSection(
  projects: ProjectModel[],
  projectId: string,
  groupId: string,
  subSectionId: string,
) {
  return mapProjectById(projects, projectId, (project) => ({
    ...project,
    sections: project.sections.map((section) => {
      if (section.id !== groupId || section.type !== "group") {
        return section;
      }

      const nextSubSections = section.sections.filter((subSection) => subSection.id !== subSectionId);

      return {
        ...section,
        sections: nextSubSections.length > 0 ? nextSubSections : [createDefaultProjectSubSection("info")],
      };
    }),
  }));
}
