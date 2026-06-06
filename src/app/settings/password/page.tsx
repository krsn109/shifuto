import PasswordForm from './password-form'

export default function PasswordSettingsPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6 text-center">パスワード変更</h1>
            <PasswordForm />
        </div>
    )
}