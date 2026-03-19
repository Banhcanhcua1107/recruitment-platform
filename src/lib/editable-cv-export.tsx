/* eslint-disable jsx-a11y/alt-text */
import "server-only";

import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createAdminClient } from "@/utils/supabase/admin";
import type {
  CVArtifactRecord,
  EditableCVBlockRecord,
  EditableCVPageRecord,
} from "@/types/cv-import";

interface ExportPagePayload {
  page: EditableCVPageRecord;
  backgroundArtifact: CVArtifactRecord | null;
  blocks: EditableCVBlockRecord[];
  assetArtifacts: Map<string, CVArtifactRecord>;
}

function toDataUri(contentType: string, buffer: Buffer) {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function downloadArtifactAsDataUri(artifact: CVArtifactRecord | null) {
  if (!artifact) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(artifact.storage_bucket)
    .download(artifact.storage_path);
  if (error || !data) {
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return toDataUri(artifact.content_type, buffer);
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: "#ffffff",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  text: {
    position: "absolute",
    color: "#0f172a",
    fontSize: 10,
    lineHeight: 1.3,
  },
  image: {
    position: "absolute",
  },
});

function ExportDocument({
  pages,
}: {
  pages: Array<{
    width: number;
    height: number;
    backgroundSrc: string | null;
    blocks: Array<{
      id: string;
      type: string;
      text: string;
      imageSrc: string | null;
      bbox: { x: number; y: number; width: number; height: number };
    }>;
  }>;
}) {
  return (
    <Document>
      {pages.map((page, pageIndex) => (
        <Page
          key={`export-page-${pageIndex + 1}`}
          size={{ width: page.width, height: page.height }}
          style={styles.page}
        >
          {page.backgroundSrc ? (
            <Image src={page.backgroundSrc} style={styles.background} />
          ) : null}

          {page.blocks.map((block) => {
            const frame = {
              left: block.bbox.x,
              top: block.bbox.y,
              width: block.bbox.width,
              height: Math.max(block.bbox.height, 12),
            };

            if (block.imageSrc) {
              return (
                <Image
                  key={block.id}
                  src={block.imageSrc}
                  style={{
                    ...styles.image,
                    ...frame,
                  }}
                />
              );
            }

            return (
              <View
                key={block.id}
                style={{
                  ...styles.text,
                  ...frame,
                }}
              >
                <Text>{block.text}</Text>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}

export async function renderEditableCVExportBuffer(input: {
  pages: EditableCVPageRecord[];
  blocks: EditableCVBlockRecord[];
  artifactsById: Map<string, CVArtifactRecord>;
}) {
  const pagePayloads: ExportPagePayload[] = input.pages.map((page) => ({
    page,
    backgroundArtifact: input.artifactsById.get(page.background_artifact_id) ?? null,
    blocks: input.blocks
      .filter((block) => block.page_id === page.id)
      .sort((left, right) => left.sequence - right.sequence),
    assetArtifacts: input.artifactsById,
  }));

  const renderedPages = await Promise.all(
    pagePayloads.map(async ({ page, backgroundArtifact, blocks, assetArtifacts }) => ({
      width: page.canonical_width_px,
      height: page.canonical_height_px,
      backgroundSrc: await downloadArtifactAsDataUri(backgroundArtifact),
      blocks: await Promise.all(
        blocks.map(async (block) => ({
          id: block.id,
          type: block.type,
          text: block.edited_text ?? block.original_text ?? "",
          imageSrc: block.asset_artifact_id
            ? await downloadArtifactAsDataUri(assetArtifacts.get(block.asset_artifact_id) ?? null)
            : null,
          bbox: block.bbox_px,
        }))
      ),
    }))
  );

  return renderToBuffer(<ExportDocument pages={renderedPages} />);
}
