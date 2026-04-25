"use client";

import React, { useMemo, useRef, useState } from "react";
import type { DocumentEditorMetadata, SupportedFileType } from "@/types/editor";

interface ImageEditorProps {
  metadata: DocumentEditorMetadata;
  onBack: () => void;
  onSave: (args: {
    file: Blob;
    fileName: string;
    fileType: SupportedFileType;
    baseVersionId: string;
  }) => Promise<void>;
  isSaving: boolean;
}

type Rotation = 0 | 90 | 180 | 270;

export default function ImageEditor({ metadata, onBack, onSave, isSaving }: ImageEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState(metadata.fileUrl);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [scale, setScale] = useState(1);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(100);
  const [cropHeight, setCropHeight] = useState(100);
  const [isBusy, setIsBusy] = useState(false);

  const canSave = useMemo(() => !isBusy && !isSaving, [isBusy, isSaving]);
  const rotationClass =
    rotation === 0
      ? "rotate-0"
      : rotation === 90
        ? "rotate-90"
        : rotation === 180
          ? "rotate-180"
          : "-rotate-90";
  const scaleClass = getScaleClass(scale);

  const onReplaceClick = () => fileInputRef.current?.click();

  const onReplaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
  };

  const saveImage = async () => {
    setIsBusy(true);
    try {
      const blob = await renderTransformedImage(previewUrl, rotation, scale, {
        enabled: cropEnabled,
        xPercent: cropX,
        yPercent: cropY,
        widthPercent: cropWidth,
        heightPercent: cropHeight,
      });
      await onSave({
        file: blob,
        fileName: "edited-image.png",
        fileType: "image",
        baseVersionId: metadata.latestFileVersionId,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700"
          >
            Back
          </button>
          <p className="text-sm font-medium text-slate-600">Image Editor</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRotation((prev) => (((prev - 90 + 360) % 360) as Rotation))}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            Rotate -90
          </button>
          <button
            type="button"
            onClick={() => setRotation((prev) => (((prev + 90) % 360) as Rotation))}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            Rotate +90
          </button>
          <button
            type="button"
            onClick={onReplaceClick}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => setCropEnabled((prev) => !prev)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${cropEnabled ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            Crop
          </button>
          {cropEnabled ? (
            <button
              type="button"
              onClick={() => {
                setCropX(0);
                setCropY(0);
                setCropWidth(100);
                setCropHeight(100);
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              Reset crop
            </button>
          ) : null}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Zoom</span>
            <input
              title="Zoom image"
              aria-label="Zoom image"
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
            />
          </div>
          <button
            type="button"
            onClick={() => void saveImage()}
            disabled={!canSave}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving || isBusy ? "Saving..." : "Save"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          title="Replace image"
          aria-label="Replace image"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={onReplaceFile}
        />
      </header>

      {cropEnabled ? (
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-white px-4 py-2.5 text-xs md:grid-cols-4">
          <label className="flex items-center gap-2 text-slate-600">
            Crop X
            <input
              title="Crop X"
              aria-label="Crop X"
              type="range"
              min={0}
              max={Math.max(0, 100 - cropWidth)}
              step={1}
              value={cropX}
              onChange={(e) => setCropX(Number(e.target.value))}
            />
            <span className="w-10 text-right">{cropX}%</span>
          </label>

          <label className="flex items-center gap-2 text-slate-600">
            Crop Y
            <input
              title="Crop Y"
              aria-label="Crop Y"
              type="range"
              min={0}
              max={Math.max(0, 100 - cropHeight)}
              step={1}
              value={cropY}
              onChange={(e) => setCropY(Number(e.target.value))}
            />
            <span className="w-10 text-right">{cropY}%</span>
          </label>

          <label className="flex items-center gap-2 text-slate-600">
            Crop W
            <input
              title="Crop width"
              aria-label="Crop width"
              type="range"
              min={10}
              max={100 - cropX}
              step={1}
              value={cropWidth}
              onChange={(e) => setCropWidth(Number(e.target.value))}
            />
            <span className="w-10 text-right">{cropWidth}%</span>
          </label>

          <label className="flex items-center gap-2 text-slate-600">
            Crop H
            <input
              title="Crop height"
              aria-label="Crop height"
              type="range"
              min={10}
              max={100 - cropY}
              step={1}
              value={cropHeight}
              onChange={(e) => setCropHeight(Number(e.target.value))}
            />
            <span className="w-10 text-right">{cropHeight}%</span>
          </label>
        </div>
      ) : null}

      <main className="flex flex-1 items-center justify-center bg-slate-100 p-4">
        <div className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <img
            src={previewUrl}
            alt="Source"
            className={`block max-h-[90vh] max-w-[90vw] origin-center object-contain transition-transform duration-150 ${rotationClass} ${scaleClass}`}
          />
        </div>
      </main>
    </div>
  );
}

function getScaleClass(scale: number): string {
  const value = Math.round(scale * 10) / 10;
  const map: Record<string, string> = {
    "0.5": "scale-50",
    "0.6": "scale-[0.6]",
    "0.7": "scale-[0.7]",
    "0.8": "scale-[0.8]",
    "0.9": "scale-90",
    "1": "scale-100",
    "1.1": "scale-110",
    "1.2": "scale-[1.2]",
    "1.3": "scale-[1.3]",
    "1.4": "scale-[1.4]",
    "1.5": "scale-150",
    "1.6": "scale-[1.6]",
    "1.7": "scale-[1.7]",
    "1.8": "scale-[1.8]",
    "1.9": "scale-[1.9]",
    "2": "scale-200",
  };

  return map[value.toString()] ?? "scale-100";
}

async function renderTransformedImage(
  imageUrl: string,
  rotation: Rotation,
  scale: number,
  crop?: {
    enabled: boolean;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  },
): Promise<Blob> {
  const normalizedCrop =
    crop ?? {
      enabled: false,
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    };

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const radians = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const targetWidth = img.width * scale;
        const targetHeight = img.height * scale;
        const canvasWidth = targetWidth * cos + targetHeight * sin;
        const canvasHeight = targetWidth * sin + targetHeight * cos;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(canvasWidth));
        canvas.height = Math.max(1, Math.floor(canvasHeight));

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is unavailable."));
          return;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

        if (!normalizedCrop.enabled) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Khong tao duoc file anh dau ra."));
                return;
              }
              resolve(blob);
            },
            "image/png",
            0.95,
          );
          return;
        }

        const cropCanvas = document.createElement("canvas");
        const sx = Math.floor((normalizedCrop.xPercent / 100) * canvas.width);
        const sy = Math.floor((normalizedCrop.yPercent / 100) * canvas.height);
        const sw = Math.max(1, Math.floor((normalizedCrop.widthPercent / 100) * canvas.width));
        const sh = Math.max(1, Math.floor((normalizedCrop.heightPercent / 100) * canvas.height));

        cropCanvas.width = Math.min(sw, Math.max(1, canvas.width - sx));
        cropCanvas.height = Math.min(sh, Math.max(1, canvas.height - sy));

        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) {
          reject(new Error("Crop canvas context is unavailable."));
          return;
        }

        cropCtx.drawImage(
          canvas,
          sx,
          sy,
          cropCanvas.width,
          cropCanvas.height,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height,
        );

        cropCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Khong tao duoc file anh dau ra."));
              return;
            }
            resolve(blob);
          },
          "image/png",
          0.95,
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Khong tai duoc anh de chinh sua."));
    img.src = imageUrl;
  });
}
