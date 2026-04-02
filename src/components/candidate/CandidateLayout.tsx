"use client";

import { type ReactNode } from "react";
import type { CandidateWorkspaceModel } from "./candidateWorkspaceModel";
import {
  WorkspaceLayout,
  type WorkspaceHeaderConfig,
  type WorkspaceShellModel,
} from "@/components/workspace";
import { candidateSidebarConfig } from "@/components/workspace/sidebarConfigs";

const CANDIDATE_HEADER_CONFIG: WorkspaceHeaderConfig = {
  compactHintIcon: "space_dashboard",
  compactHintText: "Điều hướng không gian ứng viên",
  menuAriaLabel: {
    tablet: "Toggle sidebar",
    mobile: "Open candidate navigation",
    close: "Close candidate navigation",
  },
  drawerTitle: "Điều hướng",
};

function toWorkspaceModel(model: CandidateWorkspaceModel): WorkspaceShellModel {
  return {
    headerVariant: model.headerVariant,
    showTitleInHeader: model.showTitleInHeader,
    title: model.title,
    description: model.description,
    breadcrumbs: model.breadcrumbs,
    sidebarItems: model.sidebarItems,
  };
}

export default function CandidateLayout({
  children,
  model,
}: {
  children: ReactNode;
  model: CandidateWorkspaceModel;
}) {
  return (
    <WorkspaceLayout
      model={toWorkspaceModel(model)}
      sidebarConfig={candidateSidebarConfig}
      headerConfig={CANDIDATE_HEADER_CONFIG}
    >
      {children}
    </WorkspaceLayout>
  );
}
