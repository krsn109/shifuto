'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { Skill } from '@/utils/shift-algorithm/types'

export async function createStaff(formData: FormData) {
    const supabase = await createClient()

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

    // Create user using Service Role Key
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
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string
    const skills = formData.getAll('skills') as string[]

    const email = `${employeeId}@example.com` // Use employeeId as email prefix for simplicity or keep existing logic if needed. 
    // Actually, user requested to manage employeeId. 
    // If we use email as ID, changing employeeId means changing email.
    // Let's store employeeId in profile and keep email as is for now, OR update email too.
    // Updating email is complex (requires verification).
    // Let's just store employeeId in profile.

    // But wait, the current logic generates email FROM employeeId.
    // const email = `shift-app-${employeeId}@gmail.com`

    // If we want to allow changing employeeId, we should decouple it from email or update email.
    // For now, let's just save employeeId to profile on creation.

    // 1. Create Auth User
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

    // Update profile with employeeId
    if (userData.user) {
        await supabaseAdmin
            .from('profiles')
            .update({ employee_id: employeeId })
            .eq('id', userData.user.id)
    }

    // 2. Add Skills
    if (skills.length > 0 && userData.user) {
        // Get skill IDs
        const { data: skillData } = await supabase
            .from('skills')
            .select('id, name')
            .in('name', skills)

        if (skillData) {
            const userSkills = skillData.map(s => ({
                user_id: userData.user!.id,
                skill_id: s.id
            }))

            const { error: skillError } = await supabase
                .from('user_skills')
                .insert(userSkills)

            if (skillError) {
                console.error('Error adding skills:', skillError)
                // Continue even if skill addition fails, but log it
            }
        }
    }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function deleteStaff(userId: string) {
    const supabase = await createClient()

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

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

    // Delete user from Auth (cascade deletes profile)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function updateStaffSkills(userId: string, skills: string[]) {
    const supabase = await createClient()

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

    // 1. Delete existing skills
    await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)

    // 2. Add new skills
    if (skills.length > 0) {
        const { data: skillData } = await supabase
            .from('skills')
            .select('id, name')
            .in('name', skills)

        if (skillData) {
            const userSkills = skillData.map(s => ({
                user_id: userId,
                skill_id: s.id
            }))

            const { error } = await supabase
                .from('user_skills')
                .insert(userSkills)

            if (error) return { error: error.message }
        }
    }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function updateStaffName(formData: FormData) {
    const supabase = await createClient()

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

    const staffId = formData.get('staffId') as string
    const fullName = formData.get('fullName') as string

    if (!staffId || !fullName) return { error: 'Missing required fields' }

    // Update profile
    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', staffId)

    if (error) {
        console.error('Error updating staff name:', error)
        return { error: error.message }
    }

    // Also update Auth user metadata if possible (requires Service Role)
    // For now, just updating the profile table is enough for the app display.
    // If we want to keep auth metadata in sync, we need the admin client again.

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

    await supabaseAdmin.auth.admin.updateUserById(staffId, {
        user_metadata: { full_name: fullName }
    })

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function updateEmployeeId(userId: string, newEmployeeId: string) {
    const supabase = await createClient()

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Unauthorized' }

    // Update profile
    const { error } = await supabase
        .from('profiles')
        .update({ employee_id: newEmployeeId })
        .eq('id', userId)

    if (error) {
        console.error('Error updating employee ID:', error)
        return { error: 'Failed to update employee ID' }
    }

    revalidatePath('/admin/staff')
    return { success: true }
}
