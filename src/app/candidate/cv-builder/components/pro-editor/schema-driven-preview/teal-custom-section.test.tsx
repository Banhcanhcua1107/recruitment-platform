import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveSectionStyleConfig } from "./section-renderers";
import { getTemplateConfig } from "./template-config";
import { TEMPLATE_SECTION_COMPONENTS } from "./template-section-registry";

const customComponent = TEMPLATE_SECTION_COMPONENTS.custom;

assert.ok(customComponent, "custom sections should use a dedicated renderer instead of the generic SectionShell fallback");

const template = getTemplateConfig("teal-timeline");
const styleConfig = resolveSectionStyleConfig(template, "custom", "Mục tùy chỉnh", "custom");

const markup = renderToStaticMarkup(
  React.createElement(customComponent, {
    data: {
      title: "Mục tùy chỉnh",
      text: "Trong 3 năm tới, tôi hướng đến vị trí Staff Engineer.",
    },
    mode: "preview",
    styleConfig,
    isActive: false,
    onChange: () => undefined,
    onAddAbove: () => undefined,
    onAddBelow: () => undefined,
  }),
);

assert.match(markup, /border px-1\.5 py-1\.5/, "custom section should use the same section frame rhythm as other Teal Timeline sections");
assert.match(markup, /Mục tùy chỉnh/, "custom section should render the section title through the Teal renderer");

console.log("teal custom section renderer tests passed");
