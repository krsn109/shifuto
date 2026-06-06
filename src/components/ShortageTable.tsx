'use client'

import React, { useState, useTransition } from 'react'
import { assignShift } from '@/app/shifts/actions'
import { updateDailyHeadcount } from '@/app/admin/headcounts/actions'
import { AlgorithmPeriod } from '@/utils/shift-algorithm/types'

interface ShortageTableProps {
    dates: string[]
    shortages: Record<string, Record<string, { missing: number; candidates: string[]; emergencyStaff: string[] }>>
    currentUserId: string
    isAdmin?: boolean
}

export default function ShortageTable({ dates, shortages, currentUserId, isAdmin = false }: ShortageTableProps) {
    const periods = ['S-13', '13-17', '16-L']
    const [loading, setLoading] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Map display periods to algorithm periods for admin updates
    const periodMap: Record<string, AlgorithmPeriod> = {
        'S-13': 'morning',
        '13-17': 'afternoon',
        '16-L': 'night'
    }

    // Filter dates that actually have shortages OR have emergency staff assigned
    const datesWithShortages = dates.filter(date => {
        const dayShortages = shortages[date]
        if (!dayShortages) return false
        return periods.some(p => {
            const info = dayShortages[p]
            return (info?.missing || 0) > 0 || (info?.emergencyStaff?.length || 0) > 0
        })
    })

    const handleAdminUpdate = async (date: string, period: string, delta: number) => {
        if (!isAdmin) return
        startTransition(async () => {
            try {
                const algoPeriod = periodMap[period]
                if (algoPeriod) {
                    await updateDailyHeadcount(date, algoPeriod, delta)
                }
            } catch (e) {
                console.error(e)
                alert('更新に失敗しました')
            }
        })
    }

    const handleCellClick = async (date: string, period: string, missing: number) => {
        if (isAdmin) return // Admins handle clicks differently (via +/- buttons)
        if (missing <= 0 || loading) return

        // 即時反映（確認なし）
        // if (!window.confirm(`${date} の ${period} に入りますか？`)) return

        setLoading(true)
        try {
            const res = await assignShift(date, period)
            if (res.error) {
                alert(res.error)
            } else {
                // Success - UI updates automatically via revalidatePath
            }
        } catch (e) {
            console.error(e)
            alert('エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    // Helper to generate consistent color from name
    const getColorFromName = (name: string) => {
        const colors = [
            'bg-red-100 text-red-700',
            'bg-orange-100 text-orange-700',
            'bg-amber-100 text-amber-700',
            'bg-yellow-100 text-yellow-700',
            'bg-lime-100 text-lime-700',
            'bg-green-100 text-green-700',
            'bg-emerald-100 text-emerald-700',
            'bg-teal-100 text-teal-700',
            'bg-cyan-100 text-cyan-700',
            'bg-sky-100 text-sky-700',
            'bg-blue-100 text-blue-700',
            'bg-indigo-100 text-indigo-700',
            'bg-violet-100 text-violet-700',
            'bg-purple-100 text-purple-700',
            'bg-fuchsia-100 text-fuchsia-700',
            'bg-pink-100 text-pink-700',
            'bg-rose-100 text-rose-700',
        ]
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    if (datesWithShortages.length === 0) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center text-green-800">
                現在、人員不足はありません。
            </div>
        )
    }

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {datesWithShortages.map(date => {
                    const [y, m, d] = date.split('-').map(Number)
                    const dateObj = new Date(y, m - 1, d)
                    const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]

                    return (
                        <div key={date} className="bg-white shadow-sm rounded-xl border border-red-100 p-4">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                <h3 className="font-bold text-gray-900">
                                    {m}/{d} <span className="text-sm font-normal">({dayName})</span>
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {periods.map(period => {
                                    const info = shortages[date]?.[period]
                                    const missing = info?.missing || 0
                                    const emergencyStaff = info?.emergencyStaff || []

                                    return (
                                        <div key={period} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-600 w-12">{period}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-gray-400">不足:</span>
                                                    <span className={`font-bold ${missing > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                        {missing}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {emergencyStaff.length > 0 && (
                                                    <div className="flex -space-x-1 overflow-hidden">
                                                        {emergencyStaff.map((name, i) => (
                                                            <div
                                                                key={i}
                                                                className={`flex h-7 w-7 shrink-0 rounded-full ${getColorFromName(name)} text-xs font-bold items-center justify-center ring-2 ring-white leading-none`}
                                                                title={name}
                                                            >
                                                                {name.slice(0, 1)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {isAdmin ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleAdminUpdate(date, period, -1)}
                                                            disabled={isPending}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                                        >
                                                            -
                                                        </button>
                                                        <button
                                                            onClick={() => handleAdminUpdate(date, period, 1)}
                                                            disabled={isPending}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCellClick(date, period, missing)}
                                                        disabled={missing <= 0 || loading}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${missing > 0
                                                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {missing > 0 ? '入る' : '充足'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                        <tr>
                            <th scope="col" rowSpan={2} className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 sticky left-0 bg-red-50 z-10 border-r border-b border-gray-200">
                                日付 (不足あり)
                            </th>
                            {periods.map(period => (
                                <th key={period} colSpan={2} scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-gray-900 border-b border-l border-gray-200">
                                    {period}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {periods.map(period => (
                                <React.Fragment key={`${period}-sub`}>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 bg-white w-20">
                                        不足数
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 bg-white min-w-[120px]">
                                        代打
                                    </th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {datesWithShortages.map(date => {
                            const [y, m, d] = date.split('-').map(Number)
                            const dateObj = new Date(y, m - 1, d)
                            const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
                            return (
                                <tr key={date}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 sticky left-0 bg-white z-10 border-r border-gray-200">
                                        {m}/{d} ({dayName})
                                    </td>
                                    {periods.map(period => {
                                        const info = shortages[date]?.[period]
                                        const missing = info?.missing || 0
                                        const emergencyStaff = info?.emergencyStaff || []
                                        const initialMissing = missing + emergencyStaff.length
                                        const filled = emergencyStaff.length

                                        let bgClass = ''
                                        if (missing > 0) {
                                            bgClass = 'bg-red-50 hover:bg-red-100'
                                        } else if (initialMissing > 0) {
                                            bgClass = 'bg-green-50'
                                        }

                                        return (
                                            <React.Fragment key={`${date}-${period}`}>
                                                <td className={`whitespace-nowrap px-2 py-4 text-sm text-center border-l border-gray-100 ${bgClass}`}>
                                                    {isAdmin ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    handleAdminUpdate(date, period, -1)
                                                                }}
                                                                disabled={isPending || initialMissing <= 0}
                                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                                            >
                                                                -
                                                            </button>
                                                            <span className={`font-medium ${missing > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {filled} / {initialMissing}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    handleAdminUpdate(date, period, 1)
                                                                }}
                                                                disabled={isPending}
                                                                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        initialMissing > 0 ? (
                                                            missing > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        handleCellClick(date, period, missing)
                                                                    }}
                                                                    className="w-full h-full text-red-600 font-bold focus:outline-none cursor-pointer"
                                                                >
                                                                    {filled} / {initialMissing}
                                                                </button>
                                                            ) : (
                                                                <span className="text-green-600 font-medium">
                                                                    {filled} / {initialMissing}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-4 text-xs text-gray-500 border-l border-gray-100">
                                                    {emergencyStaff.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {emergencyStaff.map(name => (
                                                                <span key={name} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorFromName(name)}`}>
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )
}
