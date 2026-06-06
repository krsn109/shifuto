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
        // 1. Setup Master Data (Skills & TimeSlots) if not exists
        // (Assuming they exist from previous steps, but let's fetch them)
        const { data: skills } = await supabase.from('skills').select('*')
        const { data: timeSlots } = await supabase.from('time_slots').select('*')

        if (!skills || !timeSlots) {
            return NextResponse.json({ error: 'Master data missing' }, { status: 500 })
        }

        const skillMap = new Map(skills.map(s => [s.name, s.id]))
        const slotIds = timeSlots.map(t => t.id)

        // 2. Create 20 Dummy Staff
        const createdStaffIds: string[] = []

        for (let i = 1; i <= 20; i++) {
            const employeeId = `990000${i.toString().padStart(2, '0')}` // 99000001 ~ 99000020
            const email = `shift-app-${employeeId}@gmail.com`
            const password = 'password123'
            const fullName = `テストスタッフ${i}`

            // Check if user exists
            const { data: existingUsers } = await supabase.auth.admin.listUsers()
            const existingUser = existingUsers.users.find(u => u.email === email)

            let userId = existingUser?.id

            if (!userId) {
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: fullName }
                })
                if (createError) throw createError
                userId = newUser.user!.id
            }

            createdStaffIds.push(userId)

            // 3. Assign Skills (Random Level)
            // Level 1: 3レジ, 4レジ
            // Level 2: + 1レジ
            // Level 3: + 2レジ
            // Level 4: + 日配
            const level = Math.floor(Math.random() * 4) + 1
            const staffSkills: string[] = ['3レジ', '4レジ']
            if (level >= 2) staffSkills.push('1レジ')
            if (level >= 3) staffSkills.push('2レジ')
            if (level >= 4) staffSkills.push('日配')

            // Clear existing skills
            await supabase.from('user_skills').delete().eq('user_id', userId)

            // Insert new skills
            const userSkillsToInsert = staffSkills
                .map(name => skillMap.get(name))
                .filter(id => id !== undefined)
                .map(skillId => ({
                    user_id: userId,
                    skill_id: skillId
                }))

            if (userSkillsToInsert.length > 0) {
                await supabase.from('user_skills').insert(userSkillsToInsert)
            }
        }

        // 4. Create Shift Requests for Next Period (2025-12-11 to 2025-12-25)
        // Based on current date 2025-11-24, the valid submission period is for 12/11 - 12/25.
        const startDate = new Date('2025-12-11')
        const endDate = new Date('2025-12-25')
        const requestsToInsert = []

        // Clear existing requests for these users in this period
        await supabase.from('shift_requests')
            .delete()
            .in('user_id', createdStaffIds)
            .gte('date', '2025-12-11')
            .lte('date', '2025-12-25')

        for (const userId of createdStaffIds) {
            let currentDate = new Date(startDate)
            while (currentDate <= endDate) {
                // 60% chance to request a shift
                if (Math.random() < 0.6) {
                    const randomSlotId = slotIds[Math.floor(Math.random() * slotIds.length)]
                    requestsToInsert.push({
                        user_id: userId,
                        date: currentDate.toISOString().split('T')[0],
                        time_slot_id: randomSlotId
                    })
                }
                currentDate.setDate(currentDate.getDate() + 1)
            }
        }

        if (requestsToInsert.length > 0) {
            const { error } = await supabase.from('shift_requests').insert(requestsToInsert)
            if (error) throw error
        }

        // 5. Create Shift Assignments for Current Period (2025-11-11 to 2025-11-25)
        // This is to populate the dashboard with "Confirmed Shifts"
        const currentStartDate = new Date('2025-11-11')
        const currentEndDate = new Date('2025-11-25')
        const assignmentsToInsert = []

        // Clear existing assignments for these users in this period
        await supabase.from('shift_assignments')
            .delete()
            .in('user_id', createdStaffIds)
            .gte('date', '2025-11-11')
            .lte('date', '2025-11-25')

        for (const userId of createdStaffIds) {
            let currentDate = new Date(currentStartDate)
            while (currentDate <= currentEndDate) {
                // 50% chance to have a shift assigned
                if (Math.random() < 0.5) {
                    const randomSlotId = slotIds[Math.floor(Math.random() * slotIds.length)]
                    assignmentsToInsert.push({
                        user_id: userId,
                        date: currentDate.toISOString().split('T')[0],
                        time_slot_id: randomSlotId
                    })
                }
                currentDate.setDate(currentDate.getDate() + 1)
            }
        }

        if (assignmentsToInsert.length > 0) {
            const { error } = await supabase.from('shift_assignments').insert(assignmentsToInsert)
            if (error) throw error
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdStaffIds.length} staff, ${requestsToInsert.length} requests (Next), and ${assignmentsToInsert.length} assignments (Current).`
        })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
