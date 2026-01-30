import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() { // Thêm async ở đây
  const cookieStore = await cookies() // Thêm await ở đây

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Method này có thể bị lỗi nếu gọi từ Server Component 
            // nhưng session vẫn sẽ được xử lý bởi Middleware
          }
        },
      },
    }
  )
}