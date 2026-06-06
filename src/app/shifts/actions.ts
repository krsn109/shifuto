'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function submitShiftRequest(date: string, timeSlotId: number) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Check if request already exists
    const { data: existing } = await supabase
        .from('shift_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('time_slot_id', timeSlotId)
        .single()

    if (existing) {
        // If exists, delete it (toggle off)
        const { error } = await supabase
            .from('shift_requests')
            .delete()
            .eq('id', existing.id)

        if (error) return { error: error.message }
    } else {
        // If not exists, insert it (toggle on)
        const { error } = await supabase
            .from('shift_requests')
            .insert({
                user_id: user.id,
                date,
                time_slot_id: timeSlotId,
            })

        if (error) return { error: error.message }
    }

    revalidatePath('/shifts')
    return { success: true }
}

export async function assignShift(date: string, slotName: string) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Get all slots
    const { data: allSlots } = await supabase
        .from('time_slots')
        .select('*')

    if (!allSlots) return { error: 'System error' }

    const targetSlot = allSlots.find(s => s.name === slotName)
    if (!targetSlot) return { error: 'Invalid slot' }

    // Check existing assignment for this date
    const { data: existingAssignment } = await supabase
        .from('shift_assignments')
        .select('id, time_slot_id')
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

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

    if (existingAssignment) {
        const currentSlot = allSlots.find(s => s.id === existingAssignment.time_slot_id)
        if (!currentSlot) return { error: 'Current slot invalid' }

        // 1. Undo Check: If clicking the exact same slot, remove it
        if (currentSlot.id === targetSlot.id) {
            const { error } = await supabaseAdmin
                .from('shift_assignments')
                .delete()
                .eq('id', existingAssignment.id)

            if (error) return { error: error.message }
            revalidatePath('/shifts')
            revalidatePath('/admin/shifts')
            return { success: true, message: 'Removed assignment' }
        }

        // 2. Merge Logic
        const mergeRules = [
            { parts: ['S-13', '13-17'], result: 'S-17' },
            { parts: ['13-17', '16-L'], result: '13-L' },
            { parts: ['S-17', '16-L'], result: 'S-L' },
            { parts: ['S-13', '13-L'], result: 'S-L' },
        ]

        const p1 = currentSlot.name
        const p2 = targetSlot.name

        const rule = mergeRules.find(r =>
            (r.parts[0] === p1 && r.parts[1] === p2) ||
            (r.parts[1] === p1 && r.parts[0] === p2)
        )

        if (rule) {
            const resultSlot = allSlots.find(s => s.name === rule.result)
            if (resultSlot) {
                const { error } = await supabaseAdmin
                    .from('shift_assignments')
                    .update({
                        time_slot_id: resultSlot.id,
                        is_emergency: true
                    })
                    .eq('id', existingAssignment.id)

                if (error) return { error: error.message }
                revalidatePath('/shifts')
                revalidatePath('/admin/shifts')
                return { success: true, message: `Merged to ${rule.result}` }
            }
        }

        return { error: `Cannot merge ${p1} with ${p2}` }
    }

    // No existing assignment, create new
    const { error } = await supabaseAdmin
        .from('shift_assignments')
        .insert({
            user_id: user.id,
            date,
            time_slot_id: targetSlot.id,
            is_emergency: true
        })

    if (error) return { error: error.message }

    revalidatePath('/shifts')
    revalidatePath('/admin/shifts')
    return { success: true }
}
