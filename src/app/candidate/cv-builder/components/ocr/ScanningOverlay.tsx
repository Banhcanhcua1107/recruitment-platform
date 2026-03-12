"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, ScanLine } from "lucide-react";

interface ScanningOverlayProps {
  fileName: string;
  fileType: string;
}

export function ScanningOverlay({
  fileName,
  fileType,
}: ScanningOverlayProps) {
  const isPDF = fileType.includes("pdf");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-8 py-8"
    >
      <div className="relative h-96 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-500/10">
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
            {isPDF ? (
              <FileText size={40} className="text-red-400" />
            ) : (
              <ScanLine size={40} className="text-blue-400" />
            )}
          </div>

          <div className="text-center">
            <p className="max-w-[200px] break-words text-center text-sm font-bold text-slate-700">
              {fileName}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isPDF ? "Tài liệu PDF" : "Tệp ảnh"}
            </p>
          </div>

          <div className="mt-4 w-full space-y-2 px-2">
            {[100, 80, 90, 60, 85, 70, 50, 95].map((width, index) => (
              <motion.div
                key={index}
                className="h-2 rounded-full bg-slate-100"
                style={{ width: `${width}%` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.1,
                }}
              />
            ))}
          </div>
        </div>

        <motion.div
          className="pointer-events-none absolute left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #3b82f6 20%, #2563eb 50%, #3b82f6 80%, transparent)",
            boxShadow:
              "0 0 20px 4px rgba(37, 99, 235, 0.3), 0 0 60px 8px rgba(37, 99, 235, 0.1)",
          }}
          animate={{ top: ["5%", "95%", "5%"] }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        <motion.div
          className="pointer-events-none absolute left-0 right-0 h-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, transparent 100%)",
          }}
          animate={{ top: ["5%", "95%", "5%"] }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        {[
          "top-2 left-2",
          "top-2 right-2",
          "bottom-2 left-2",
          "bottom-2 right-2",
        ].map((position, index) => (
          <motion.div
            key={index}
            className={`absolute ${position} h-4 w-4 border-blue-500`}
            style={{
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "transparent",
              ...(index === 0 && {
                borderTopColor: "#3b82f6",
                borderLeftColor: "#3b82f6",
                borderRadius: "4px 0 0 0",
              }),
              ...(index === 1 && {
                borderTopColor: "#3b82f6",
                borderRightColor: "#3b82f6",
                borderRadius: "0 4px 0 0",
              }),
              ...(index === 2 && {
                borderBottomColor: "#3b82f6",
                borderLeftColor: "#3b82f6",
                borderRadius: "0 0 0 4px",
              }),
              ...(index === 3 && {
                borderBottomColor: "#3b82f6",
                borderRightColor: "#3b82f6",
                borderRadius: "0 0 4px 0",
              }),
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ScanLine size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-blue-700">
            AI đang phân tích CV...
          </span>
        </motion.div>

        <p className="max-w-xs text-center text-xs text-slate-400">
          Đang trích xuất thông tin cá nhân, kinh nghiệm, kỹ năng và học vấn từ
          CV của bạn
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="h-2 w-2 rounded-full bg-blue-500"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
