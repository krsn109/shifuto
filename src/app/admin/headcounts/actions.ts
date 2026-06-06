'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { AlgorithmPeriod } from '@/utils/shift-algorithm/types'

export async function updateDailyHeadcount(date: string, period: AlgorithmPeriod, delta: number) {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('Forbidden')

    // Get current headcount
    const { data: current } = await supabase
        .from('daily_headcounts')
        .select('*')
        .eq('date', date)
        .single()

    // Default values if not exists
    const defaults = {
        morning: 2,
        afternoon: 2,
        night: 5
    }

    const currentCount = current?.[period] ?? defaults[period]
    const newCount = Math.max(0, currentCount + delta)

    const updateData = {
        date,
        morning: current?.morning ?? defaults.morning,
        afternoon: current?.afternoon ?? defaults.afternoon,
        night: current?.night ?? defaults.night,
        [period]: newCount
    }

    const { error } = await supabase
        .from('daily_headcounts')
        .upsert(updateData, { onConflict: 'date' })

    if (error) throw error

    revalidatePath('/')
}
