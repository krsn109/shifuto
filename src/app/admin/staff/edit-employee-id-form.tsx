'use client'

import { useState } from 'react'
import { updateEmployeeId } from './actions'

export function EditEmployeeIdForm({ staffId, initialEmployeeId }: { staffId: string, initialEmployeeId: string }) {
    const [isEditing, setIsEditing] = useState(false)
    const [employeeId, setEmployeeId] = useState(initialEmployeeId)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateEmployeeId(staffId, employeeId)
            setIsEditing(false)
        } catch (error) {
            console.error(error)
            alert('更新に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    if (isEditing) {
        return (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-2 py-1"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50"
                >
                    保存
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsEditing(false)
                        setEmployeeId(initialEmployeeId)
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                >
                    キャンセル
                </button>
            </form>
        )
    }

    return (
        <div className="flex items-center gap-2 group">
            <span className="text-sm text-gray-900">{employeeId}</span>
            <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-indigo-600 transition-opacity"
                title="従業員番号を編集"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
            </button>
        </div>
    )
}