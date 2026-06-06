'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTimeSlot(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string

    const { error } = await supabase.from('time_slots').insert({
        name,
        start_time: startTime,
        end_time: endTime,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/time-slots')
    return { success: true }
}

export async function deleteTimeSlot(id: number) {
    const supabase = await createClient()

    const { error } = await supabase.from('time_slots').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/time-slots')
    return { success: true }
}
