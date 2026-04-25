import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getCanonicalAppOrigin } from '@/lib/url/canonical-origin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getCanonicalAppOrigin(request.url)
  const code = searchParams.get('code')
  
  // Default to nothing here, logic will decide destination
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
         // Check Profile
         const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
         // If NO profile or NO role -> Redirect to Role Selection
         if (!profile) {
             // Create basic profile first (Strict requirement: ensure profile exists)
             await supabase.from('profiles').insert({
                 id: user.id,
                 email: user.email,
                 full_name: user.user_metadata?.full_name,
                 role: null // Explicitly null
             })
             return NextResponse.redirect(`${origin}/role-selection`)
         }

         if (!profile.role) {
             return NextResponse.redirect(`${origin}/role-selection`)
         }

         // If profile & role exist -> Redirect to Home
         return NextResponse.redirect(`${origin}/`)
      }
    }
  }

  // Error case
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
