'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 font-['Manrope']">
      <div className="max-w-md w-full text-center space-y-6">
         <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
         </div>
         
         <h1 className="text-3xl font-black text-slate-900">Đăng nhập thất bại</h1>
         
         <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 text-left">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Chi tiết lỗi:</p>
            <p className="font-mono text-red-600 break-words text-sm">
              {errorDescription || error || "Đã xảy ra lỗi không xác định."}
            </p>
            {errorCode && <p className="text-xs text-slate-400 mt-2 font-mono">Code: {errorCode}</p>}
         </div>

         <p className="text-slate-500">
            Có vẻ như hệ thống gặp sự cố khi lưu thông tin của bạn. Vui lòng thử lại hoặc liên hệ hỗ trợ.
         </p>

         <div className="pt-4">
            <Link 
              href="/login"
              className="inline-flex items-center justify-center py-4 px-8 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Quay lại Đăng nhập
            </Link>
         </div>
      </div>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}
