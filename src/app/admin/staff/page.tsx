import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createStaff } from './actions'
import { DeleteStaffButton } from './delete-button'
import { SkillForm } from './skill-form'
import { EditStaffNameForm } from './edit-name-form'
import { EditEmployeeIdForm } from './edit-employee-id-form'

export default async function StaffManagementPage() {
    const supabase = await createClient()

    // Use admin client to fetch emails for sorting
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch all staff profiles
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select(`
      id, 
      full_name,
      role,
      created_at,
      employee_id,
      user_skills (
        skills (
          name
        )
      )
    `)
        .eq('role', 'staff')

    // Fetch auth users to get emails (fallback for employeeId)
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()

    // Combine and sort
    const staffList = profiles?.map(p => {
        const authUser = authUsers.find(u => u.id === p.id)
        // Use stored employee_id or fallback to email parsing
        const employeeId = p.employee_id || authUser?.email?.split('@')[0]?.replace('shift-app-', '') || '99999999'
        return {
            ...p,
            employeeId
        }
    }).sort((a, b) => a.employeeId.localeCompare(b.employeeId)) || []

    // Fetch all available skills
    const { data: allSkills } = await supabase
        .from('skills')
        .select('name')
        .order('id')

    const skillOptions = allSkills?.map(s => s.name) || []

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                    スタッフ管理
                </h2>
                <p className="mt-2 text-gray-600">
                    アルバイトスタッフの登録、削除、スキル管理を行います。
                </p>
            </div>

            {/* 新規登録フォーム */}
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">新規スタッフ登録</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>新しいスタッフのアカウントを作成します。</p>
                    </div>
                    <form action={async (formData) => {
                        'use server'
                        await createStaff(formData)
                    }} className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">氏名</label>
                                <input type="text" name="fullName" id="fullName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                            </div>
                            <div>
                                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">従業員番号 (8桁)</label>
                                <input type="text" name="employeeId" id="employeeId" pattern="\d{8}" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">初期パスワード</label>
                                <input type="text" name="password" id="password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">スキル</label>
                            <div className="flex flex-wrap gap-4">
                                {skillOptions.map(skill => (
                                    <label key={skill} className="inline-flex items-center">
                                        <input type="checkbox" name="skills" value={skill} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                        <span className="ml-2 text-sm text-gray-700">{skill}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            登録する
                        </button>
                    </form>
                </div>
            </div>

            {/* スタッフ一覧 */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">スタッフ一覧</h3>
                </div>
                <ul role="list" className="divide-y divide-gray-200">
                    {staffList?.map((staff) => {
                        const currentSkills = staff.user_skills.map((us: any) => us.skills.name)
                        return (
                            <li key={staff.id} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4 mb-2">
                                            <EditEmployeeIdForm staffId={staff.id} initialEmployeeId={staff.employeeId} />
                                            <span className="text-gray-300">|</span>
                                            <EditStaffNameForm staffId={staff.id} initialName={staff.full_name || 'Unknown'} />
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500">
                                            <span className="truncate">スキル: {currentSkills.join(', ') || 'なし'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <DeleteStaffButton staffId={staff.id} />
                                    </div>
                                </div>
                                {/* スキル更新用UI */}
                                <div className="mt-4 border-t pt-4">
                                    <SkillForm
                                        staffId={staff.id}
                                        initialSkills={currentSkills}
                                        allSkills={skillOptions}
                                    />
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
