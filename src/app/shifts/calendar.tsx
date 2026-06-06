'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { submitShiftRequest } from './actions'
import { isDateInPeriod } from '@/utils/date'

type TimeSlot = {
    id: number
    name: string
    start_time: string
    end_time: string
}

type ShiftRequest = {
    date: string
    time_slot_id: number
}

export default function ShiftCalendar({
    timeSlots,
    existingRequests,
    targetPeriod,
}: {
    timeSlots: TimeSlot[]
    existingRequests: ShiftRequest[]
    targetPeriod: { start: string; end: string }
}) {
    // Initialize calendar to show the start month of the target period
    const [currentDate, setCurrentDate] = useState(new Date(targetPeriod.start))
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i))
    }

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const toggleRequest = async (dateStr: string, slotId: number) => {
        await submitShiftRequest(dateStr, slotId)
    }

    const isRequested = (dateStr: string, slotId: number) => {
        return existingRequests.some(
            (req) => req.date === dateStr && req.time_slot_id === slotId
        )
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                    {year}年 {month + 1}月
                </h2>
                <div className="flex space-x-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded-full hover:bg-gray-100"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded-full hover:bg-gray-100"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 border-b text-center text-xs font-semibold text-gray-700">
                {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                    <div key={day} className="bg-gray-50 py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="bg-white min-h-[120px]" />
                    }

                    const dateStr = formatDate(date)
                    const isToday = new Date().toDateString() === date.toDateString()
                    const isEditable = isDateInPeriod(date, targetPeriod.start, targetPeriod.end)

                    return (
                        <div
                            key={dateStr}
                            className={`min-h-[120px] p-2 ${isEditable ? 'bg-white' : 'bg-gray-100'
                                } ${isToday ? 'bg-blue-50' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {date.getDate()}
                                </span>
                                {!isEditable && (
                                    <Lock className="w-3 h-3 text-gray-400" />
                                )}
                            </div>

                            <div className="space-y-1">
                                {isEditable ? (
                                    timeSlots.map((slot) => {
                                        const active = isRequested(dateStr, slot.id)
                                        return (
                                            <button
                                                key={slot.id}
                                                onClick={() => toggleRequest(dateStr, slot.id)}
                                                className={`w-full text-xs text-left px-2 py-1 rounded border transition-all active:scale-95 ${active
                                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {slot.name}
                                            </button>
                                        )
                                    })
                                ) : (
                                    // Read-only view for non-editable days
                                    timeSlots.map((slot) => {
                                        const active = isRequested(dateStr, slot.id)
                                        if (!active) return null
                                        return (
                                            <div
                                                key={slot.id}
                                                className="w-full text-xs text-left px-2 py-1 rounded border bg-gray-200 border-gray-300 text-gray-600"
                                            >
                                                {slot.name}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
