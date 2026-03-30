import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSafeRedirectUrl(path: string, request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''

  if (url.hostname === '0.0.0.0') {
    url.hostname = 'localhost'
  }

  return url
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Create Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Refresh Session
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 3. STRICT GUARD LOGIC

  // TODO(multi-role): replace these path-prefix checks with membership-aware workspace guards.
  // A. Protected Routes (Candidate/HR Dashboard, Profile)
  // If NOT logged in -> Redirect to /login
  if (path.startsWith('/candidate') || path.startsWith('/hr') || path.startsWith('/profile')) {
      if (!user) {
        return NextResponse.redirect(getSafeRedirectUrl('/login', request))
      }
  }

  // B. Auth Routes (Login, Register)
  // If Logged in -> Redirect to / (Home)
  if (path.startsWith('/login') || path.startsWith('/register')) {
      // Exclude /register/role-selection if we are moving it, but user wants /role-selection separately.
      // If user is accessing /register/role-selection (old path), we should probably handle it or just focus on new path.
      // Assuming new path /role-selection is not under /register.
      
      if (user && !path.startsWith('/register/role-selection')) { 
          // Note: The prompt asks for /role-selection as a separate route.
          return NextResponse.redirect(getSafeRedirectUrl('/', request))
      }
  }

  // C. Role Selection Route (/role-selection)
  if (path.startsWith('/role-selection')) {
      if (!user) {
          // Not logged in -> Login
        return NextResponse.redirect(getSafeRedirectUrl('/login', request))
      }
      
      // TODO(multi-role): redirect to workspace selection only when the account has zero memberships.
      // Logged in -> Check if already has role
      const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

      if (profile?.role) {
          // Already has role -> Go Home
          return NextResponse.redirect(getSafeRedirectUrl('/', request))
      }
      // If role is null -> Allow stay on /role-selection
  }

  return response
}
