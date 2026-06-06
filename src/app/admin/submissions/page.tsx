import { createClient } from '@/utils/supabase/server'
import { getCurrentSubmissionPeriod } from '@/utils/date'
import { redirect } from 'next/navigation'

export default async function SubmissionsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Check admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/')

    const { targetStart, targetEnd } = getCurrentSubmissionPeriod()

    // Helper to format date as YYYY-MM-DD in local time
    const toLocalISOString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const startDate = toLocalISOString(targetStart)
    const endDate = toLocalISOString(targetEnd)

    // Fetch all staff
    const { data: staffList } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id')
        .eq('role', 'staff')
        .order('employee_id', { ascending: true })

    // Fetch requests
    const { data: requests } = await supabase
        .from('shift_requests')
        .select('user_id, date, time_slot_id, time_slots(name)')
        .gte('date', startDate)
        .lte('date', endDate)

    // Fetch assignments
    const { data: assignments } = await supabase
        .from('shift_assignments')
        .select('user_id, date, time_slot_id, time_slots(name)')
        .gte('date', startDate)
        .lte('date', endDate)

    // Process data
    const staffStatus = staffList?.map(staff => {
        const staffRequests = requests?.filter(r => r.user_id === staff.id) || []
        const staffAssignments = assignments?.filter(a => a.user_id === staff.id) || []

        const requestCount = staffRequests.length
        const assignmentCount = staffAssignments.length
        const isSubmitted = requestCount > 0

        // Calculate match rate (how many requests were granted)
        const grantedRequests = staffRequests.filter(req =>
            staffAssignments.some(assign =>
                assign.date === req.date && assign.time_slot_id === req.time_slot_id
            )
        ).length

        // Determine employee ID
        const employeeId = staff.employee_id || ''

        return {
            ...staff,
            requestCount,
            assignmentCount,
            isSubmitted,
            grantedRequests,
            employeeId
        }
    }) || []

    staffStatus.sort((a, b) => {
        const aId = a.employeeId || ''
        const bId = b.employeeId || ''

        // Simple string comparison is sufficient for fixed-length 8-digit strings
        // "00000001" < "00000002" < ... < "00000019"
        if (aId < bId) return -1
        if (aId > bId) return 1

        return 0
    })

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <h1 className="text-2xl font-semibold text-gray-900">シフト提出状況</h1>
                <p className="mt-2 text-sm text-gray-600">
                    対象期間: {startDate} 〜 {endDate}
                </p>

                <div className="mt-8 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">スタッフ名</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">提出状況</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">希望数</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">確定数</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">採用率</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {staffStatus.map((staff) => (
                                            <tr key={staff.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{staff.full_name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {staff.isSubmitted ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                            提出済み
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                            未提出
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{staff.requestCount}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{staff.assignmentCount}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {staff.requestCount > 0
                                                        ? `${Math.round((staff.assignmentCount / staff.requestCount) * 100)}%`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
