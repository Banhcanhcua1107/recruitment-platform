"use client";

import React from "react";
import { motion } from "framer-motion";
import { ScanLine, FileText } from "lucide-react";

interface ScanningOverlayProps {
  fileName: string;
  fileType: string;
}

export function ScanningOverlay({ fileName, fileType }: ScanningOverlayProps) {
  const isPDF = fileType.includes("pdf");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col items-center gap-8 w-full max-w-md mx-auto py-8"
    >
      {/* File Preview Card with Scanner */}
      <div className="relative w-72 h-96 rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* File icon content */}
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100">
            {isPDF ? (
              <FileText size={40} className="text-red-400" />
            ) : (
              <ScanLine size={40} className="text-blue-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
              {fileName}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
              {isPDF ? "PDF Document" : "Image File"}
            </p>
          </div>

          {/* Fake text lines to simulate document content */}
          <div className="w-full space-y-2 mt-4 px-2">
            {[100, 80, 90, 60, 85, 70, 50, 95].map((w, i) => (
              <motion.div
                key={i}
                className="h-2 bg-slate-100 rounded-full"
                style={{ width: `${w}%` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Laser Scan Line ────────────────────────── */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, #3b82f6 20%, #2563eb 50%, #3b82f6 80%, transparent)",
            boxShadow:
              "0 0 20px 4px rgba(37, 99, 235, 0.3), 0 0 60px 8px rgba(37, 99, 235, 0.1)",
          }}
          animate={{
            top: ["5%", "95%", "5%"],
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        {/* Glow effect at scan line edges */}
        <motion.div
          className="absolute left-0 right-0 h-8 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, transparent 100%)",
          }}
          animate={{
            top: ["5%", "95%", "5%"],
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        {/* Corner scan markers */}
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map(
          (pos, i) => (
            <motion.div
              key={i}
              className={`absolute ${pos} w-4 h-4 border-blue-500`}
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "transparent",
                ...(i === 0 && { borderTopColor: "#3b82f6", borderLeftColor: "#3b82f6", borderRadius: "4px 0 0 0" }),
                ...(i === 1 && { borderTopColor: "#3b82f6", borderRightColor: "#3b82f6", borderRadius: "0 4px 0 0" }),
                ...(i === 2 && { borderBottomColor: "#3b82f6", borderLeftColor: "#3b82f6", borderRadius: "0 0 0 4px" }),
                ...(i === 3 && { borderBottomColor: "#3b82f6", borderRightColor: "#3b82f6", borderRadius: "0 0 4px 0" }),
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          )
        )}
      </div>

      {/* Status Text */}
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

        <p className="text-xs text-slate-400 text-center max-w-xs">
          Đang trích xuất thông tin cá nhân, kinh nghiệm, kỹ năng và học vấn từ CV của bạn
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-500"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
