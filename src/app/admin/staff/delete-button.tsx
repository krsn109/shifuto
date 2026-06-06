'use client'

import { deleteStaff } from './actions'

export function DeleteStaffButton({ staffId }: { staffId: string }) {
    return (
        <form action={async () => {
            await deleteStaff(staffId)
        }}>
            <button
                type="submit"
                className="text-red-600 hover:text-red-900 text-sm font-medium"
                onClick={(e) => {
                    if (!confirm('本当に削除しますか？')) {
                        e.preventDefault()
                    }
                }}
            >
                削除
            </button>
        </form>
    )
}
