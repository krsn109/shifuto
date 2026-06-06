'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateShiftAssignment, deleteShiftAssignment } from '@/app/admin/shifts/actions'
import { TimeSlotId } from '@/utils/shift-algorithm/types'

interface ShiftScheduleTableProps {
    dates: string[]
    staff: { id: string; name: string }[]
    assignments: Record<string, Record<string, { name: string, isEmergency: boolean }>> // staffId -> date -> { name, isEmergency }
    forceDesktop?: boolean
    useSafeColors?: boolean
    editable?: boolean
    timeSlotOptions?: TimeSlotId[]
}

const DEFAULT_TIME_SLOTS: TimeSlotId[] = ['S-13', 'S-17', '13-17', '13-L', '16-L', '17-L', 'S-L']

export default function ShiftScheduleTable({
    dates,
    staff,
    assignments,
    forceDesktop = false,
    useSafeColors = false,
    editable = false,
    timeSlotOptions = DEFAULT_TIME_SLOTS
}: ShiftScheduleTableProps) {
    const router = useRouter()
    const [editingCell, setEditingCell] = useState<{ staffId: string; date: string } | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<TimeSlotId>('S-13')
    const [isPending, startTransition] = useTransition()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const beginEdit = (staffId: string, date: string, slotName: string) => {
        setEditingCell({ staffId, date })
        setSelectedSlot(slotName as TimeSlotId)
        setErrorMessage(null)
    }

    const handleUpdate = () => {
        if (!editingCell) return
        setErrorMessage(null)
        startTransition(async () => {
            try {
                await updateShiftAssignment(editingCell.staffId, editingCell.date, selectedSlot)
                setEditingCell(null)
                router.refresh()
            } catch (error: any) {
                setErrorMessage(error?.message || '更新に失敗しました')
            }
        })
    }

    const handleDelete = () => {
        if (!editingCell) return
        setErrorMessage(null)
        startTransition(async () => {
            try {
                await deleteShiftAssignment(editingCell.staffId, editingCell.date)
                setEditingCell(null)
                router.refresh()
            } catch (error: any) {
                setErrorMessage(error?.message || '削除に失敗しました')
            }
        })
    }

    // Helper for safe colors (Hex fallback for image generation)
    const getSafeStyle = (type: 'red' | 'blue' | 'orange' | 'gray' | 'header' | 'border') => {
        if (!useSafeColors) return {}
        switch (type) {
            case 'red': return { backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', boxShadow: 'none' }
            case 'blue': return { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', boxShadow: 'none' }
            case 'orange': return { backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', boxShadow: 'none' }
            case 'gray': return { backgroundColor: '#F9FAFB', color: '#111827', border: '1px solid #E5E7EB', boxShadow: 'none' }
            case 'header': return { backgroundColor: '#F9FAFB', color: '#111827' }
            case 'border': return { borderColor: '#E5E7EB' }
            default: return {}
        }
    }

    const renderEditableControls = (isDesktop: boolean) => (
        <div className={`flex ${isDesktop ? 'flex-wrap justify-center' : 'flex-col items-end'} gap-1 text-xs`}>
            <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value as TimeSlotId)}
                className={`rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${isDesktop ? 'w-full text-xs' : 'w-40 text-xs'}`}
            >
                {timeSlotOptions.map(slotOption => (
                    <option key={slotOption} value={slotOption}>{slotOption}</option>
                ))}
            </select>
            <div className={`flex ${isDesktop ? 'flex-wrap justify-center' : 'gap-1'} ${isDesktop ? 'gap-1 mt-1' : ''}`}>
                <button
                    onClick={handleUpdate}
                    disabled={isPending}
                    className="px-2 py-0.5 rounded bg-indigo-600 text-white disabled:opacity-50"
                >
                    保存
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="px-2 py-0.5 rounded bg-red-50 text-red-600"
                >
                    削除
                </button>
                <button
                    onClick={() => setEditingCell(null)}
                    className="px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                >
                    取消
                </button>
            </div>
        </div>
    )

    return (
        <>
            {editable && errorMessage && (
                <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    {errorMessage}
                </div>
            )}
            {/* Mobile View (List) */}
            {!forceDesktop && (
                <div className="md:hidden space-y-4">
                    {dates.map(date => {
                        const [y, m, d] = date.split('-').map(Number)
                        const dateObj = new Date(y, m - 1, d)
                        const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

                        // Check if there are any assignments for this day
                        const hasAssignments = staff.some(person => assignments[person.id]?.[date])

                        return (
                            <div key={date} className={`bg-white shadow-sm rounded-xl border p-4 ${isWeekend ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                    <h3 className={`font-bold ${isWeekend ? 'text-orange-700' : 'text-gray-900'}`}>
                                        {m}/{d} <span className="text-sm font-normal">({dayName})</span>
                                    </h3>
                                </div>

                                {hasAssignments ? (
                                    <div className="space-y-2">
                                        {staff.map(person => {
                                            const slot = assignments[person.id]?.[date]
                                            if (!slot) return null
                                            const isEditing = editingCell?.staffId === person.id && editingCell.date === date
                                            return (
                                                <div
                                                    key={person.id}
                                                    className={`flex justify-between items-center text-sm ${editable && !isEditing ? 'cursor-pointer active:bg-gray-50 p-1 rounded' : ''}`}
                                                    onClick={() => {
                                                        if (editable && !isEditing) {
                                                            beginEdit(person.id, date, slot.name)
                                                        }
                                                    }}
                                                >
                                                    <span className="font-medium text-gray-700">{person.name}</span>
                                                    {isEditing ? (
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            {renderEditableControls(false)}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${slot.isEmergency
                                                                ? 'bg-red-50 text-red-700 ring-red-600/10'
                                                                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                                }`}>
                                                                {slot.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">シフトなし</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Desktop View (Table) */}
            <div className={`${forceDesktop ? 'block' : 'hidden md:block'} overflow-x-auto`}>
                <table className="min-w-full divide-y divide-gray-200" style={useSafeColors ? { borderCollapse: 'collapse' } : {}}>
                    <thead className={useSafeColors ? '' : "bg-gray-50"} style={useSafeColors ? getSafeStyle('header') : {}}>
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 sticky left-0 z-10 border-r border-gray-200" style={useSafeColors ? { ...getSafeStyle('header'), ...getSafeStyle('border'), borderRightWidth: '1px', borderRightStyle: 'solid' } : {}}>
                                従業員名
                            </th>
                            {dates.map(date => {
                                // Parse YYYY-MM-DD safely as local date
                                const [y, m, d] = date.split('-').map(Number)
                                const dateObj = new Date(y, m - 1, d)
                                const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
                                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

                                const headerStyle = useSafeColors ? (isWeekend ? getSafeStyle('orange') : getSafeStyle('header')) : {}
                                const borderStyle = useSafeColors ? { ...getSafeStyle('border'), borderLeftWidth: '1px', borderLeftStyle: 'solid' } : {}

                                return (
                                    <th key={date} scope="col" className={`px-2 py-3.5 text-center text-sm font-semibold min-w-[60px] border-l border-gray-200 ${isWeekend ? 'text-orange-600 bg-orange-50' : 'text-gray-900'}`} style={{ ...headerStyle, ...borderStyle }}>
                                        {m}/{d} <br />
                                        <span className="text-xs font-normal">({dayName})</span>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white" style={useSafeColors ? { backgroundColor: '#ffffff' } : {}}>
                        {staff.map(person => (
                            <tr key={person.id} style={useSafeColors ? { borderBottom: '1px solid #E5E7EB' } : {}}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 sticky left-0 bg-white z-10 border-r border-gray-200" style={useSafeColors ? { backgroundColor: '#ffffff', ...getSafeStyle('border'), borderRightWidth: '1px', borderRightStyle: 'solid' } : {}}>
                                    {person.name}
                                </td>
                                {dates.map(date => {
                                    const slot = assignments[person.id]?.[date]
                                    const borderStyle = useSafeColors ? { ...getSafeStyle('border'), borderLeftWidth: '1px', borderLeftStyle: 'solid' } : {}
                                    const isEditing = editingCell?.staffId === person.id && editingCell.date === date

                                    return (
                                        <td
                                            key={date}
                                            className={`whitespace-nowrap px-2 py-4 text-sm text-gray-500 text-center border-l border-gray-200 ${editable && slot && !isEditing ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                            style={borderStyle}
                                            onClick={() => {
                                                if (editable && slot && !isEditing) {
                                                    beginEdit(person.id, date, slot.name)
                                                }
                                            }}
                                        >
                                            {slot ? (
                                                isEditing ? (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        {renderEditableControls(true)}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${slot.isEmergency
                                                                ? 'bg-red-50 text-red-700 ring-red-600/10'
                                                                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                                }`}
                                                            style={useSafeColors ? (slot.isEmergency ? getSafeStyle('red') : getSafeStyle('blue')) : {}}
                                                        >
                                                            {slot.name}
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-gray-200" style={useSafeColors ? { color: '#E5E7EB' } : {}}>-</span>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
