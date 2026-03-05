"use client";
import { useState } from "react";

export default function TestOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    if (!file) return alert("Hãy chọn 1 ảnh/PDF CV");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Gọi đến endpoint FastAPI bạn đã dựng ở Prompt 4
      const res = await fetch("http://localhost:8000/parse-cv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối Backend!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Test AI CV Scanner (Qwen-VL)</h1>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleTest} className="bg-blue-600 text-white p-2 rounded ml-2">
        {loading ? "Đang quét..." : "Bắt đầu quét"}
      </button>
      {result && <pre className="mt-10 bg-black text-green-400 p-5 rounded">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}