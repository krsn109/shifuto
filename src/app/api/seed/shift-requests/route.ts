import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    try {
        // 1. Get all staff (exclude admin)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, employee_id')
            .eq('role', 'staff')
            .order('employee_id')

        if (profileError) throw profileError

        // 2. Get time slots
        const { data: timeSlots, error: slotError } = await supabase
            .from('time_slots')
            .select('id, name')

        if (slotError) throw slotError

        // Create slot map for easy lookup
        const slotMap: Record<string, number> = {}
        timeSlots?.forEach(slot => {
            slotMap[slot.name] = slot.id
        })

        // Verify required slots exist
        const requiredSlots = ['16-L', '13-17', '13-L', 'S-13', 'S-L']
        const availableSlots = Object.keys(slotMap)
        console.log('Available time slots:', availableSlots)

        // 3. Define target period: 2026-03-11 to 2026-03-25
        const startDate = new Date('2026-03-11')
        const endDate = new Date('2026-03-25')

        // Generate all dates in the period
        const dates: string[] = []
        let currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            const year = currentDate.getFullYear()
            const month = String(currentDate.getMonth() + 1).padStart(2, '0')
            const day = String(currentDate.getDate()).padStart(2, '0')
            dates.push(`${year}-${month}-${day}`)
            currentDate.setDate(currentDate.getDate() + 1)
        }

        // 4. Clear existing requests for this period
        await supabase
            .from('shift_requests')
            .delete()
            .gte('date', '2026-03-11')
            .lte('date', '2026-03-25')

        // 5. Create shift requests
        // - 2 staff members will NOT submit (indices 5 and 12)
        // - Each staff submits ~6 shifts
        // - Preference: 16-L, 13-17, occasionally 13-L (long shifts)
        // - Similar patterns among staff

        const requestsToInsert: { user_id: string; date: string; time_slot_id: number }[] = []

        // Define preferred time slot distribution
        // 16-L: 40%, 13-17: 35%, 13-L: 15%, S-13: 10%
        const getPreferredSlot = (rand: number): string => {
            if (rand < 0.40) return '16-L'
            if (rand < 0.75) return '13-17'
            if (rand < 0.90) return '13-L'
            return 'S-13'
        }

        // Define "popular days" where more staff will submit
        // Weekends and certain weekdays
        const getDateWeight = (dateStr: string): number => {
            const date = new Date(dateStr)
            const dayOfWeek = date.getDay()
            // Sunday=0, Saturday=6
            if (dayOfWeek === 0 || dayOfWeek === 6) return 0.8 // Weekend: high chance
            if (dayOfWeek === 5) return 0.7 // Friday: high chance
            if (dayOfWeek === 3) return 0.5 // Wednesday: medium
            return 0.35 // Other days: lower
        }

        profiles?.forEach((staff, index) => {
            // Skip 2 staff members (indices 5 and 12) - they won't submit
            if (index === 5 || index === 12) {
                console.log(`Skipping ${staff.full_name} (no submission)`)
                return
            }

            // Each staff submits approximately 6 shifts
            let submittedCount = 0
            const targetSubmissions = 5 + Math.floor(Math.random() * 3) // 5-7 submissions

            // Shuffle dates to distribute submissions randomly
            const shuffledDates = [...dates].sort(() => Math.random() - 0.5)

            for (const date of shuffledDates) {
                if (submittedCount >= targetSubmissions) break

                const weight = getDateWeight(date)
                // Add some personal variation
                const personalWeight = weight + (Math.random() * 0.2 - 0.1)

                if (Math.random() < personalWeight) {
                    const slotName = getPreferredSlot(Math.random())
                    const slotId = slotMap[slotName]

                    if (slotId) {
                        requestsToInsert.push({
                            user_id: staff.id,
                            date: date,
                            time_slot_id: slotId
                        })
                        submittedCount++
                    }
                }
            }

            // If we haven't reached target, add more randomly
            while (submittedCount < 5) {
                const randomDate = dates[Math.floor(Math.random() * dates.length)]
                // Check if already submitted for this date
                const alreadySubmitted = requestsToInsert.some(
                    r => r.user_id === staff.id && r.date === randomDate
                )
                if (!alreadySubmitted) {
                    const slotName = getPreferredSlot(Math.random())
                    const slotId = slotMap[slotName]
                    if (slotId) {
                        requestsToInsert.push({
                            user_id: staff.id,
                            date: randomDate,
                            time_slot_id: slotId
                        })
                        submittedCount++
                    }
                }
            }

            console.log(`${staff.full_name}: ${submittedCount} shifts submitted`)
        })

        // 6. Insert all requests
        if (requestsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('shift_requests')
                .insert(requestsToInsert)

            if (insertError) throw insertError
        }

        // 7. Summary
        const staffWithSubmissions = new Set(requestsToInsert.map(r => r.user_id)).size
        const staffWithoutSubmissions = (profiles?.length || 0) - staffWithSubmissions

        return NextResponse.json({
            success: true,
            period: '2026-03-11 to 2026-03-25',
            totalStaff: profiles?.length || 0,
            staffWithSubmissions,
            staffWithoutSubmissions,
            totalRequests: requestsToInsert.length,
            averagePerStaff: (requestsToInsert.length / staffWithSubmissions).toFixed(1)
        })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
