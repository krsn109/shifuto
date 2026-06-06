import { createClient } from '@/utils/supabase/server'
import ShiftCalendar from './calendar'
import { getCurrentSubmissionPeriod, formatDate } from '@/utils/date'

export default async function ShiftsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please login</div>
    }

    // Calculate current submission period
    const { targetStart, targetEnd } = getCurrentSubmissionPeriod()

    // Fetch time slots
    const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('*')
        .order('start_time')

    // Fetch existing requests for this user
    const { data: requests } = await supabase
        .from('shift_requests')
        .select('date, time_slot_id')
        .eq('user_id', user.id)

    const formatDisplayDate = (d: Date) =>
        `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">シフト希望提出</h1>
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                現在の提出対象期間: <span className="font-bold">{formatDisplayDate(targetStart)} 〜 {formatDisplayDate(targetEnd)}</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                ※ 上記期間外の日付は編集できません（ロックアイコンが表示されます）。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ShiftCalendar
                timeSlots={timeSlots || []}
                existingRequests={requests || []}
                targetPeriod={{
                    start: formatDate(targetStart),
                    end: formatDate(targetEnd)
                }}
            />
        </div>
    )
}
