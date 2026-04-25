"use client";

import { useState } from "react";
import { useAppDialog } from "@/components/ui/app-dialog";

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export default function TestOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const { alert } = useAppDialog();

  const handleTest = async () => {
    if (!file) {
      await alert({
        title: "Thiếu tệp đầu vào",
        description: "Please select a CV image or PDF.",
        confirmText: "Đã hiểu",
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${AI_SERVICE_URL}/parse-cv`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      await alert({
        title: "Không thể kết nối AI service",
        description: `Could not connect to the AI service at ${AI_SERVICE_URL}.`,
        confirmText: "Đã hiểu",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h1 className="mb-4 text-2xl font-bold">Test AI CV Scanner (Qwen-VL)</h1>
      <label htmlFor="cv-file" className="mb-2 block font-medium">
        Select CV File:
      </label>
      <input
        id="cv-file"
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleTest}
        className="ml-2 rounded bg-blue-600 p-2 text-white"
      >
        {loading ? "Scanning..." : "Start scan"}
      </button>
      {result && (
        <pre className="mt-10 rounded bg-black p-5 text-green-400">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
