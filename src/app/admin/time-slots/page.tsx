import { createClient } from '@/utils/supabase/server'
import { createTimeSlot, deleteTimeSlot } from './actions'
import { Trash2 } from 'lucide-react'

export default async function TimeSlotsPage() {
    const supabase = await createClient()
    const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('*')
        .order('start_time')

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                    時間枠管理
                </h2>
                <p className="mt-2 text-gray-600">
                    シフト希望提出時に選択肢として表示される時間枠を設定します。
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* 新規作成フォーム */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                        新しい時間枠を追加
                    </h3>
                    <form action={async (formData) => {
                        'use server'
                        await createTimeSlot(formData)
                    }} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                表示名 (例: 早番, A枠)
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="早番"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                                    開始時間
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    id="startTime"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                            <div>
                                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                                    終了時間
                                </label>
                                <input
                                    type="time"
                                    name="endTime"
                                    id="endTime"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            追加する
                        </button>
                    </form>
                </div>

                {/* 一覧リスト */}
                <div className="rounded-lg bg-white shadow overflow-hidden">
                    <ul role="list" className="divide-y divide-gray-200">
                        {timeSlots?.length === 0 && (
                            <li className="p-6 text-center text-gray-500">
                                登録された時間枠はありません
                            </li>
                        )}
                        {timeSlots?.map((slot) => (
                            <li key={slot.id} className="flex items-center justify-between p-6 hover:bg-gray-50">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">{slot.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                    </p>
                                </div>
                                <form action={async () => {
                                    'use server'
                                    await deleteTimeSlot(slot.id)
                                }}>
                                    <button
                                        type="submit"
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="削除"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </form>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
