'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar({ user, role, userName }: { user: any, role: string | null, userName?: string | null }) {
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    if (!user) return null

    const isActive = (path: string) => pathname === path

    const navLinks = [
        { href: '/', label: 'ホーム', show: true },
        { href: '/shifts', label: 'シフト提出', show: role !== 'admin' },
        { href: '/admin/submissions', label: '提出状況', show: role === 'admin' },
        { href: '/admin/shifts', label: 'シフト作成', show: role === 'admin' },
        { href: '/admin/staff', label: 'スタッフ管理', show: role === 'admin' },
        { href: '/admin/time-slots', label: '時間枠管理', show: role === 'admin' },
        { href: '/settings/password', label: 'パスワード変更', show: true },
    ]

    return (
        <nav className="bg-indigo-600 border-b border-indigo-500 shadow-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex flex-shrink-0 items-center">
                            <Link href="/" className="font-bold text-xl text-white flex items-center gap-2">
                                <span className="bg-white/20 p-1.5 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                </span>
                                Shifuto
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navLinks.filter(link => link.show).map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive(link.href)
                                        ? 'border-white text-white'
                                        : 'border-transparent text-indigo-100 hover:border-indigo-300 hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="hidden sm:flex sm:items-center">
                            <span className="text-sm font-medium text-indigo-100 mr-4">
                                {userName} <span className="text-indigo-300 text-xs">({role === 'admin' ? '管理者' : 'スタッフ'})</span>
                            </span>
                            <form action="/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="relative inline-flex items-center rounded-md border border-transparent bg-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                                >
                                    ログアウト
                                </button>
                            </form>
                        </div>
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-indigo-200 hover:bg-indigo-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="sm:hidden bg-indigo-700">
                    <div className="space-y-1 pt-2 pb-3">
                        {navLinks.filter(link => link.show).map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium transition-colors active:bg-indigo-800 ${isActive(link.href)
                                    ? 'border-white bg-indigo-800 text-white'
                                    : 'border-transparent text-indigo-100 hover:border-indigo-300 hover:bg-indigo-600 hover:text-white'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="border-t border-indigo-500 pt-4 pb-4">
                        <div className="flex items-center px-4">
                            <div className="ml-3">
                                <div className="text-base font-medium text-white">{userName}</div>
                                <div className="text-sm font-medium text-indigo-200">{role === 'admin' ? '管理者' : 'スタッフ'}</div>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 px-2">
                            <form action="/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-indigo-100 hover:bg-indigo-600 hover:text-white"
                                >
                                    ログアウト
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
