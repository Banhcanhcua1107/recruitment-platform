import "server-only";

import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

interface ResumeBlock {
  block_id: string;
  is_visible?: boolean;
  data?: Record<string, unknown>;
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatPrimitive(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function flattenValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenValue(item)).filter(Boolean);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj).flatMap(([key, nested]) => {
      if (key === "id") {
        return [];
      }
      const lines = flattenValue(nested);
      if (lines.length === 0) {
        return [];
      }
      if (lines.length === 1) {
        return [`${humanizeKey(key)}: ${lines[0]}`];
      }
      return [humanizeKey(key), ...lines.map((line) => `- ${line}`)];
    });
  }

  const primitive = formatPrimitive(value);
  return primitive ? primitive.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
}

function extractBlockLines(block: ResumeBlock): string[] {
  if (!block.is_visible) {
    return [];
  }

  const data = block.data ?? {};
  const items = Array.isArray(data.items) ? data.items : null;

  if (items) {
    return items.flatMap((item, index) => {
      const lines = flattenValue(item);
      if (lines.length === 0) {
        return [];
      }
      return index === 0 ? lines : ["", ...lines];
    });
  }

  return flattenValue(data);
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.45,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 18,
  },
  section: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#1d4ed8",
  },
  line: {
    marginBottom: 4,
  },
});

function ResumePdfDocument({
  title,
  blocks,
}: {
  title: string;
  blocks: ResumeBlock[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {blocks.map((block) => {
          const lines = extractBlockLines(block);
          if (lines.length === 0) {
            return null;
          }

          return (
            <View key={block.block_id} style={styles.section}>
              <Text style={styles.sectionTitle}>{humanizeKey(block.block_id)}</Text>
              {lines.map((line, index) => (
                <Text key={`${block.block_id}-${index}`} style={styles.line}>
                  {line}
                </Text>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function renderResumePdfBuffer(input: {
  title: string;
  resumeData: ResumeBlock[];
}) {
  return renderToBuffer(
    <ResumePdfDocument title={input.title} blocks={input.resumeData} />
  );
}
