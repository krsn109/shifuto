'use client'

import { useState, useEffect, useRef } from 'react'
import { generateShifts, saveShifts, getAllStaff } from './actions'
import { ShiftResult, DailyShiftResult, Shortage, ShiftAssignment, AlgorithmPeriod } from '@/utils/shift-algorithm/types'
import { toPng } from 'html-to-image'
import ShiftScheduleTable from '@/components/ShiftScheduleTable'

export default function ShiftGeneratorPage() {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [result, setResult] = useState<ShiftResult | null>(null)
    const [allStaffList, setAllStaffList] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [customHeadcounts, setCustomHeadcounts] = useState<Record<string, Record<AlgorithmPeriod, number>>>({})
    const [showHeadcountConfig, setShowHeadcountConfig] = useState(false)
    const [configMode, setConfigMode] = useState<'daily' | 'weekly'>('weekly')
    const [weeklyHeadcounts, setWeeklyHeadcounts] = useState<Record<number, Record<AlgorithmPeriod, number>>>({
        0: { morning: 2, afternoon: 2, night: 5 }, // Sun
        1: { morning: 2, afternoon: 2, night: 5 }, // Mon
        2: { morning: 2, afternoon: 2, night: 5 }, // Tue
        3: { morning: 2, afternoon: 2, night: 5 }, // Wed
        4: { morning: 2, afternoon: 2, night: 5 }, // Thu
        5: { morning: 2, afternoon: 2, night: 5 }, // Fri
        6: { morning: 2, afternoon: 2, night: 5 }, // Sat
    })
    const exportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Fetch all staff on mount
        getAllStaff().then(setAllStaffList).catch(console.error)

        // Calculate default period (Next submission period)
        const now = new Date()
        const day = now.getDate()
        const year = now.getFullYear()
        const month = now.getMonth()

        let start: Date
        let end: Date

        // Logic matches getCurrentSubmissionPeriod in date.ts
        if (day >= 2 && day <= 15) {
            // Target: This month 26th to Next month 10th
            start = new Date(year, month, 26)
            end = new Date(year, month + 1, 10)
        } else {
            if (day === 1) {
                // Target: This month 11th to This month 25th
                start = new Date(year, month, 11)
                end = new Date(year, month, 25)
            } else {
                // Target: Next month 11th to Next month 25th
                start = new Date(year, month + 1, 11)
                end = new Date(year, month + 1, 25)
            }
        }

        // Format YYYY-MM-DD
        const formatDate = (d: Date) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const da = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${da}`
        }

        setStartDate(formatDate(start))
        setEndDate(formatDate(end))
    }, [])

    useEffect(() => {
        if (!startDate || !endDate) return

        const start = new Date(startDate)
        const end = new Date(endDate)
        const newHeadcounts: Record<string, Record<AlgorithmPeriod, number>> = {}

        // Create a loop date to avoid modifying start object
        const current = new Date(start)
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0]
            // Preserve existing values if date range just expanded/shrunk slightly?
            // For simplicity, reset or preserve if key exists.
            // Let's try to preserve if exists, else default.
            if (customHeadcounts[dateStr]) {
                newHeadcounts[dateStr] = customHeadcounts[dateStr]
            } else {
                newHeadcounts[dateStr] = {
                    morning: 2,
                    afternoon: 2,
                    night: 5
                }
            }
            current.setDate(current.getDate() + 1)
        }
        setCustomHeadcounts(newHeadcounts)
    }, [startDate, endDate])

    const handleGenerate = async () => {
        if (!startDate || !endDate) return
        setLoading(true)
        try {
            let headcountsToUse = customHeadcounts

            // If weekly mode, override customHeadcounts based on day of week
            if (configMode === 'weekly') {
                const start = new Date(startDate)
                const end = new Date(endDate)
                const generatedHeadcounts: Record<string, Record<AlgorithmPeriod, number>> = {}

                const current = new Date(start)
                while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0]
                    const dayOfWeek = current.getDay()
                    generatedHeadcounts[dateStr] = { ...weeklyHeadcounts[dayOfWeek] }
                    current.setDate(current.getDate() + 1)
                }
                headcountsToUse = generatedHeadcounts
            }

            const res = await generateShifts(startDate, endDate, headcountsToUse)
            setResult(res)
        } catch (error) {
            console.error(error)
            alert('シフト生成に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!result) return
        if (!confirm('この内容でシフトを確定しますか？既存のシフトは上書きされます。')) return

        setSaving(true)
        try {
            const allAssignments = result.results.flatMap(r => r.assignments)

            // Determine which headcounts to save
            let headcountsToSave = customHeadcounts
            if (configMode === 'weekly') {
                const start = new Date(startDate)
                const end = new Date(endDate)
                const generatedHeadcounts: Record<string, Record<AlgorithmPeriod, number>> = {}

                const current = new Date(start)
                while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0]
                    const dayOfWeek = current.getDay()
                    generatedHeadcounts[dateStr] = { ...weeklyHeadcounts[dayOfWeek] }
                    current.setDate(current.getDate() + 1)
                }
                headcountsToSave = generatedHeadcounts
            }

            await saveShifts(allAssignments, headcountsToSave)
            alert('シフトを保存しました')
        } catch (error) {
            console.error(error)
            alert('保存に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    const handleDownloadImage = async () => {
        if (!result || !exportRef.current) return

        try {
            const dataUrl = await toPng(exportRef.current, {
                backgroundColor: '#ffffff',
                width: 1200, // Force desktop width
                pixelRatio: 2, // High resolution
            })

            const link = document.createElement('a')
            link.download = `shift_schedule_${startDate}_${endDate}.png`
            link.href = dataUrl
            link.click()
        } catch (error) {
            console.error('Image generation failed:', error)
            alert(`画像の生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const updateHeadcount = (date: string, period: AlgorithmPeriod, delta: number) => {
        setCustomHeadcounts(prev => {
            const currentVal = prev[date]?.[period] ?? 2
            const next = Math.max(0, currentVal + delta)
            return {
                ...prev,
                [date]: {
                    ...prev[date],
                    [period]: next
                }
            }
        })
    }

    const updateWeeklyHeadcount = (dayOfWeek: number, period: AlgorithmPeriod, delta: number) => {
        setWeeklyHeadcounts(prev => {
            const currentVal = prev[dayOfWeek]?.[period] ?? 2
            const next = Math.max(0, currentVal + delta)
            return {
                ...prev,
                [dayOfWeek]: {
                    ...prev[dayOfWeek],
                    [period]: next
                }
            }
        })
    }

    const dayNames = ['日', '月', '火', '水', '木', '金', '土']

    // Prepare data for ShiftScheduleTable
    const getTableData = () => {
        if (!result) return null

        const dates = result.results.map(r => r.date)

        // Use all staff list fetched on mount
        // If allStaffList is empty (failed to fetch), fallback to result extraction
        let staff = allStaffList.length > 0 ? allStaffList : []

        if (staff.length === 0) {
            if (result.allStaff) {
                staff = result.allStaff.map(s => ({ id: s.id, name: s.name }))
            } else {
                // Fallback for older results
                const staffMap = new Map<string, string>()
                result.results.forEach(day => {
                    day.assignments.forEach(a => staffMap.set(a.staffId, a.staffName || 'Unknown'))
                    day.unassigned.forEach(u => staffMap.set(u.staffId, u.staffName || 'Unknown'))
                })
                staff = Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }))
            }
        }

        // Build assignments map
        const assignments: Record<string, Record<string, { name: string, isEmergency: boolean }>> = {}

        result.results.forEach(day => {
            day.assignments.forEach(a => {
                if (!assignments[a.staffId]) assignments[a.staffId] = {}
                assignments[a.staffId][day.date] = {
                    name: a.slotId,
                    isEmergency: false // Generated shifts are not emergency by default
                }
            })
        })

        return { dates, staff, assignments }
    }

    const tableData = getTableData()

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                    シフト自動生成
                </h2>
                <p className="mt-2 text-gray-600">
                    期間を指定してシフトを自動生成します。
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">開始日</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">終了日</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                    </div>
                </div>

                {/* Headcount Configuration */}
                <div className="border-t pt-4">
                    <button
                        type="button"
                        onClick={() => setShowHeadcountConfig(!showHeadcountConfig)}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                        <svg className={`w-4 h-4 mr-1 transform transition-transform ${showHeadcountConfig ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        必要人数を設定する
                    </button>

                    {showHeadcountConfig && (
                        <div className="mt-4 space-y-4 border rounded-md p-4 bg-gray-50">
                            <div className="flex space-x-4 border-b pb-2">
                                <button
                                    onClick={() => setConfigMode('weekly')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md ${configMode === 'weekly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    曜日ごとに設定
                                </button>
                                <button
                                    onClick={() => setConfigMode('daily')}
                                    className={`px-3 py-1 text-sm font-medium rounded-md ${configMode === 'daily' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    日ごとに設定
                                </button>
                            </div>

                            <p className="text-xs text-gray-500">※デフォルト: 午前2名 / 午後2名 / 夜5名</p>

                            {configMode === 'weekly' ? (
                                <div className="space-y-2">
                                    {dayNames.map((dayName, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                            <div className="font-medium text-gray-700 w-32 mb-2 sm:mb-0">{dayName}曜日</div>
                                            <div className="flex gap-2 sm:gap-4">
                                                {(['morning', 'afternoon', 'night'] as AlgorithmPeriod[]).map(period => (
                                                    <div key={period} className="flex flex-col items-center">
                                                        <span className="text-[10px] text-gray-500 mb-0.5">
                                                            {period === 'morning' ? '午前' : period === 'afternoon' ? '午後' : '夜'}
                                                        </span>
                                                        <div className="flex items-center bg-white rounded border border-gray-300 shadow-sm">
                                                            <button
                                                                onClick={() => updateWeeklyHeadcount(index, period, -1)}
                                                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 border-r border-gray-200 text-xs"
                                                            >
                                                                ◀
                                                            </button>
                                                            <span className="px-2 py-0.5 text-sm font-medium w-8 text-center">
                                                                {weeklyHeadcounts[index][period]}
                                                            </span>
                                                            <button
                                                                onClick={() => updateWeeklyHeadcount(index, period, 1)}
                                                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 border-l border-gray-200 text-xs"
                                                            >
                                                                ▶
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.entries(customHeadcounts).sort().map(([date, counts]) => (
                                        <div key={date} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                            <div className="font-medium text-gray-700 w-32 mb-2 sm:mb-0">{date}</div>
                                            <div className="flex gap-2 sm:gap-4">
                                                {(['morning', 'afternoon', 'night'] as AlgorithmPeriod[]).map(period => (
                                                    <div key={period} className="flex flex-col items-center">
                                                        <span className="text-[10px] text-gray-500 mb-0.5">
                                                            {period === 'morning' ? '午前' : period === 'afternoon' ? '午後' : '夜'}
                                                        </span>
                                                        <div className="flex items-center bg-white rounded border border-gray-300 shadow-sm">
                                                            <button
                                                                onClick={() => updateHeadcount(date, period, -1)}
                                                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 border-r border-gray-200 text-xs"
                                                            >
                                                                ◀
                                                            </button>
                                                            <span className="px-2 py-0.5 text-sm font-medium w-8 text-center">
                                                                {counts[period]}
                                                            </span>
                                                            <button
                                                                onClick={() => updateHeadcount(date, period, 1)}
                                                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 border-l border-gray-200 text-xs"
                                                            >
                                                                ▶
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading || !startDate || !endDate}
                    className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300"
                >
                    {loading ? '生成中...' : 'シフトを生成する'}
                </button>
            </div>

            {result && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">生成結果</h3>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleDownloadImage}
                                className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                画像として保存
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300"
                            >
                                {saving ? '保存中...' : 'この内容で確定する'}
                            </button>
                        </div>
                    </div>

                    {/* Hidden container for image generation */}
                    {tableData && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: '100vw', // Move off-screen to the right
                                width: '1200px',
                                zIndex: -1000,
                                visibility: 'visible'
                            }}
                        >
                            <div ref={exportRef} className="p-8" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
                                <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: '#111827' }}>シフト表 ({startDate} 〜 {endDate})</h2>
                                <ShiftScheduleTable
                                    dates={tableData.dates}
                                    staff={tableData.staff}
                                    assignments={tableData.assignments}
                                    forceDesktop={true}
                                    useSafeColors={true}
                                />
                            </div>
                        </div>
                    )}

                    {result.totalShortages > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        合計 {result.totalShortages} 件の人員不足があります。
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {result.results.map((day) => (
                            <DayResult key={day.date} day={day} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function DayResult({ day }: { day: DailyShiftResult }) {
    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {day.date}
                </h3>
                {day.shortages.length > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        不足あり
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        充足
                    </span>
                )}
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                    {/* Shortages */}
                    {day.shortages.length > 0 && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-red-50">
                            <dt className="text-sm font-medium text-red-500">不足情報</dt>
                            <dd className="mt-1 text-sm text-red-900 sm:mt-0 sm:col-span-2">
                                <ul className="list-disc pl-5 space-y-1">
                                    {day.shortages.map((s, idx) => (
                                        <li key={idx}>
                                            {translatePeriod(s.period)}: 必要 {s.required}名 / 確保 {s.actual}名 (不足 {s.missing}名)
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    )}

                    {/* Assignments */}
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">確定シフト ({day.assignments.length}名)</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="flex flex-wrap gap-2">
                                {day.assignments.map((a, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                                        {a.staffName || a.staffId.slice(0, 8)} ({a.slotId})
                                    </span>
                                ))}
                            </div>
                        </dd>
                    </div>

                    {/* Backups */}
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">待機メンバー ({day.unassigned.length}名)</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="flex flex-wrap gap-2">
                                {day.unassigned.map((u, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                                        {u.staffName || u.staffId.slice(0, 8)} ({u.slotId})
                                    </span>
                                ))}
                            </div>
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    )
}

function translatePeriod(p: string) {
    switch (p) {
        case 'morning': return '午前'
        case 'afternoon': return '午後'
        case 'night': return '夜'
        default: return p
    }
}
