'use client'

import { updateStaffSkills } from './actions'
import { useState } from 'react'

export function SkillForm({
    staffId,
    initialSkills,
    allSkills
}: {
    staffId: string,
    initialSkills: string[],
    allSkills: string[]
}) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const skills = formData.getAll('skills') as string[]
        try {
            const result = await updateStaffSkills(staffId, skills)
            if (result?.error) {
                alert('エラーが発生しました: ' + result.error)
            } else {
                // Success feedback (optional, maybe toast)
                // alert('スキルを更新しました')
            }
        } catch (e) {
            alert('エラーが発生しました')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="flex items-center gap-4">
            <span className="text-xs text-gray-500">スキル更新:</span>
            <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => (
                    <label key={skill} className="inline-flex items-center">
                        <input
                            type="checkbox"
                            name="skills"
                            value={skill}
                            defaultChecked={initialSkills.includes(skill)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="ml-1 text-xs text-gray-700">{skill}</span>
                    </label>
                ))}
            </div>
            <button
                type="submit"
                disabled={loading}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 disabled:opacity-50"
            >
                {loading ? '...' : '更新'}
            </button>
        </form>
    )
}
