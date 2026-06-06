'use client'

import { useState } from 'react'
import { updateStaffName } from './actions'

export function EditStaffNameForm({ staffId, initialName }: { staffId: string, initialName: string }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(initialName)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData()
        formData.append('staffId', staffId)
        formData.append('fullName', name)

        await updateStaffName(formData)
        setLoading(false)
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    保存
                </button>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                    キャンセル
                </button>
            </form>
        )
    }

    return (
        <div className="flex items-center gap-2 group">
            <p className="text-lg font-bold text-indigo-600 truncate">{name}</p>
            <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
            </button>
        </div>
    )
}
