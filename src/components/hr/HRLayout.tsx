"use client";

import { type ReactNode } from "react";
import type { HRWorkspaceModel } from "./hrWorkspaceModel";
import {
  WorkspaceLayout,
  type WorkspaceHeaderConfig,
  type WorkspaceShellModel,
} from "@/components/workspace";
import { hrSidebarConfig } from "@/components/workspace/sidebarConfigs";

const HR_HEADER_CONFIG: WorkspaceHeaderConfig = {
  compactHintIcon: "workspaces",
  compactHintText: "Điều hướng recruiter workspace",
  menuAriaLabel: {
    tablet: "Toggle recruiter sidebar",
    mobile: "Open recruiter navigation",
    close: "Close recruiter navigation",
  },
  drawerTitle: "Điều hướng",
};

function toWorkspaceModel(model: HRWorkspaceModel): WorkspaceShellModel {
  return {
    headerVariant: model.headerVariant,
    showTitleInHeader: model.showTitleInHeader,
    title: model.title,
    description: model.description,
    breadcrumbs: model.breadcrumbs,
    sidebarItems: model.sidebarItems,
  };
}

export default function HRLayout({
  children,
  model,
}: {
  children: ReactNode;
  model: HRWorkspaceModel;
}) {
  return (
    <WorkspaceLayout
      model={toWorkspaceModel(model)}
      sidebarConfig={hrSidebarConfig}
      headerConfig={HR_HEADER_CONFIG}
    >
      {children}
    </WorkspaceLayout>
  );
}
