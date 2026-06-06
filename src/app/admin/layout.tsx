import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">アクセス権限がありません</h1>
                    <p className="mt-2">このページを表示するには管理者権限が必要です。</p>
                    <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                        トップページに戻る
                    </a>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
