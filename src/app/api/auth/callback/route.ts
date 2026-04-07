import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getCanonicalAppOrigin } from '@/lib/url/canonical-origin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getCanonicalAppOrigin(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // 1. Kiểm tra profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // 2. Nếu chưa có role -> Bắt buộc đi chọn vai trò
      if (!profile || !profile.role) {
        return NextResponse.redirect(`${origin}/register/role-selection`)
      }

      // 3. Nếu đã có role -> Vào đúng Dashboard của họ
      return NextResponse.redirect(`${origin}/${profile.role}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=failed`)
}