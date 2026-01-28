export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-primary">
        Nền tảng Tuyển dụng v4
      </h1>
      <p className="mt-4 text-secondary text-lg">
        Tailwind CSS v4 đã hoạt động!
      </p>
      <button className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition">
        Bắt đầu ngay
      </button>
    </div>
  );
}