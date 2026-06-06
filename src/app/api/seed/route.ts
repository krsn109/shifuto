import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const skills = [
        { name: '3レジ' },
        { name: '4レジ' },
        { name: '1レジ' },
        { name: '2レジ' },
        { name: '日配' }
    ]

    const { error } = await supabase
        .from('skills')
        .upsert(skills, { onConflict: 'name', ignoreDuplicates: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Skills seeded' })
}
