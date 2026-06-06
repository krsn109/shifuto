'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    try {
        const supabase = await createClient()

        const employeeId = formData.get('employeeId') as string
        const password = formData.get('password') as string

        // Convert employee ID to a dummy email address
        const email = `${employeeId}@example.com`

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Login attempt failed:', { email, error })
            return { error: `ログインに失敗しました (${email}): ${error.message}` }
        }

        return { success: true }
    } catch (e) {
        console.error('Login Action Error:', e)
        return { error: 'Login failed: ' + (e instanceof Error ? e.message : 'Unknown error') }
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    // Create a Supabase client with the Service Role Key to bypass email confirmation
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const employeeId = formData.get('employeeId') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    // Convert employee ID to a dummy email address
    // Using gmail.com to pass strict email validation
    const email = `shift-app-${employeeId}@gmail.com`

    // Use admin auth to create user with email confirmed automatically
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
        }
    })

    if (createError) {
        return { error: createError.message }
    }

    // Sign in immediately after creation
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) {
        return { error: signInError.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
