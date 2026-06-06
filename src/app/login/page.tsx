'use client'

import { login } from './actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        const result = await login(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else {
            // Login successful
            router.push('/')
            router.refresh()
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                    <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 font-sans">
                        Shifuto
                    </h1>
                </div>
                <p className="text-base text-gray-600 font-medium">
                    &quot;Shift&quot; を &quot;Auto&quot; で
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white/80 backdrop-blur-xl px-4 py-8 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10">
                    <form action={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                                従業員番号
                            </label>
                            <div className="mt-1">
                                <input
                                    id="employeeId"
                                    name="employeeId"
                                    type="text"
                                    pattern="\d{8}"
                                    title="8桁の数字を入力してください"
                                    placeholder="00000000"
                                    required
                                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                パスワード
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-3">
                                <div className="text-sm text-red-700 text-center font-medium">
                                    {error}
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        ログイン中...
                                    </span>
                                ) : (
                                    'ログイン'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    &copy; 2025 Shifuto. All rights reserved.
                </p>
            </div>
        </div>
    )
}
