'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

// 1. LOGIN
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Strict Rule: Always redirect to Home
  revalidatePath('/', 'layout')
  redirect('/')
}

// 2. SIGNUP
export async function signup(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const roleInput = formData.get('role') as string
  
  // Normalize Role
  const role = roleInput === 'employer' ? 'hr' : 'candidate'

  // SignUp
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role, 
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Manual Profile Creation (Critical requirement)
  if (data.user) {
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role
        })
    
    // Log error but generally we proceed if auth succeeded. 
    // Ideally we should handle this gracefully.
    if (profileError) {
        console.error("Profile creation failed:", profileError)
        return { error: "Created user but failed to set profile. Please contact support." }
    }
  }

  // Redirect to Home is implicit success for direct login-after-signup
  // If email confirmation is off, this works. If on, user sees checking email.
  // Assuming auto-confirm or session exists.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/')
  }

  return { success: 'Check your email to confirm your account.' }
}

// 3. UPDATE ROLE (For /role-selection)
export async function updateRole(role: 'candidate' | 'employer') {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
        redirect('/login')
    }

    const dbRole = role === 'employer' ? 'hr' : 'candidate'

    const { error } = await supabase
        .from('profiles')
        .update({ role: dbRole })
        .eq('id', user.id)

    if (error) {
        console.error("Error updating role:", error)
        return { error: "Failed to update role" }
    }

    // Success -> Redirect Home
    revalidatePath('/', 'layout')
    redirect('/')
}

// 4. SIGNOUT
export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
