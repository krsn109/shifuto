'use client'

import { useState } from 'react'
import { updatePassword } from './actions'

export default function PasswordForm() {
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setMessage(null)
        setError(null)

        const result = await updatePassword(formData)

        if (result?.error) {
            setError(result.error)
        } else {
            setMessage('パスワードを変更しました')
            // フォームをリセット
            const form = document.getElementById('password-form') as HTMLFormElement
            form?.reset()
        }
        setIsLoading(false)
    }

    return (
        <form id="password-form" action={handleSubmit} className="space-y-4 max-w-md mx-auto p-4 bg-white rounded shadow">
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">新しいパスワード</label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    required
                    minLength={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">パスワード（確認）</label>
                <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    minLength={6}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            {error && (
                <div className="text-red-600 text-sm">{error}</div>
            )}

            {message && (
                <div className="text-green-600 text-sm">{message}</div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {isLoading ? '変更中...' : 'パスワードを変更'}
            </button>
        </form>
    )
}