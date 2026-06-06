'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ShiftGenerator } from '@/utils/shift-algorithm/generator'
import { Staff, ShiftRequest, ShiftResult, TimeSlotId, Skill, AlgorithmPeriod } from '@/utils/shift-algorithm/types'

export async function generateShifts(
    startDate: string,
    endDate: string,
    customHeadcounts?: Record<string, Record<AlgorithmPeriod, number>>
) {
    const supabase = await createClient()

    // 1. Fetch Time Slots to map ID <-> Name
    const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('id, name')

    if (!timeSlots) throw new Error('Time slots not found')

    const slotIdToName = new Map<number, TimeSlotId>()
    const slotNameToId = new Map<string, number>()

    timeSlots.forEach(ts => {
        slotIdToName.set(ts.id, ts.name as TimeSlotId)
        slotNameToId.set(ts.name, ts.id)
    })

    // 2. Fetch Staff and Skills
    const { data: profiles } = await supabase
        .from('profiles')
        .select(`
      id, 
      full_name,
      user_skills (
        skills (
          name
        )
      )
    `)
        .eq('role', 'staff')

    if (!profiles) throw new Error('Staff not found')

    const staffList: Staff[] = profiles.map(p => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        skills: p.user_skills.map((us: any) => us.skills.name as Skill)
    }))

    const staffNameMap = new Map<string, string>()
    staffList.forEach(s => staffNameMap.set(s.id, s.name))

    // 3. Fetch Requests
    const { data: requests } = await supabase
        .from('shift_requests')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

    if (!requests) throw new Error('Requests not found')

    const algoRequests: ShiftRequest[] = requests.map(r => ({
        staffId: r.user_id,
        staffName: staffNameMap.get(r.user_id) || 'Unknown',
        date: r.date,
        slotId: slotIdToName.get(r.time_slot_id) as TimeSlotId
    })).filter(r => r.slotId) // Filter out invalid slots if any

    // 4. Run Algorithm
    const generator = new ShiftGenerator(staffList, algoRequests, startDate, endDate, customHeadcounts)
    const result = generator.generate()

    return {
        ...result,
        allStaff: staffList
    }
}

export async function saveShifts(
    assignments: { staffId: string, date: string, slotId: TimeSlotId }[],
    customHeadcounts?: Record<string, Record<AlgorithmPeriod, number>>
) {
    const supabase = await createClient()

    // Get slot mapping again (or pass it, but fetching is safer)
    const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('id, name')

    if (!timeSlots) throw new Error('Time slots not found')
    const slotNameToId = new Map<string, number>()
    timeSlots.forEach(ts => slotNameToId.set(ts.name, ts.id))

    // Prepare DB records
    const records = assignments.map(a => ({
        user_id: a.staffId,
        date: a.date,
        time_slot_id: slotNameToId.get(a.slotId)
    })).filter(r => r.time_slot_id)

    // Delete existing assignments for these dates/users? 
    // Or just upsert? Unique constraint is (user_id, date, time_slot_id).
    // But a user might have a different slot assigned previously.
    // We should probably clear assignments for the date range first, or use upsert carefully.
    // For now, let's assume we are generating for a clean range or overwriting.
    // To be safe, we should delete overlapping assignments first.

    if (records.length > 0) {
        const dates = [...new Set(records.map(r => r.date))]

        // Delete existing for these dates
        await supabase
            .from('shift_assignments')
            .delete()
            .in('date', dates)

        // Insert new
        const { error } = await supabase
            .from('shift_assignments')
            .insert(records)

        if (error) throw error
    }

    // Save custom headcounts if provided
    if (customHeadcounts) {
        const headcountRecords = Object.entries(customHeadcounts).map(([date, counts]) => ({
            date,
            morning: counts.morning,
            afternoon: counts.afternoon,
            night: counts.night
        }))

        // Upsert headcounts
        const { error: headcountError } = await supabase
            .from('daily_headcounts')
            .upsert(headcountRecords, { onConflict: 'date' })

        if (headcountError) throw headcountError
    }
}

export async function updateShiftAssignment(staffId: string, date: string, slotId: TimeSlotId) {
    const supabase = await createClient()

    const { data: timeSlot } = await supabase
        .from('time_slots')
        .select('id')
        .eq('name', slotId)
        .single()

    if (!timeSlot) throw new Error('Time slot not found')

    // Check if assignment exists
    const { data: existing } = await supabase
        .from('shift_assignments')
        .select('id')
        .eq('user_id', staffId)
        .eq('date', date)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('shift_assignments')
            .update({ time_slot_id: timeSlot.id })
            .eq('user_id', staffId)
            .eq('date', date)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('shift_assignments')
            .insert({
                user_id: staffId,
                date: date,
                time_slot_id: timeSlot.id
            })
        if (error) throw error
    }

    revalidatePath('/')
    revalidatePath('/admin/shifts')
}

export async function deleteShiftAssignment(staffId: string, date: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('user_id', staffId)
        .eq('date', date)

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/admin/shifts')
}

export async function getAllStaff() {
    const supabase = await createClient()
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id')
        .eq('role', 'staff')

    if (!profiles) return []

    // Sort by employee_id (8-digit string)
    profiles.sort((a, b) => {
        const aId = a.employee_id || ''
        const bId = b.employee_id || ''

        if (aId < bId) return -1
        if (aId > bId) return 1
        return 0
    })

    return profiles.map(p => ({
        id: p.id,
        name: p.full_name || 'Unknown'
    }))
}
