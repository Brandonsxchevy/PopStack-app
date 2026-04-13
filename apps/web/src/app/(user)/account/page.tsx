'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

export default function AccountPage() {
  const { user, clearAuth } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/profiles/me', { name }),
    onSuccess: () => toast.success('Profile updated!'),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update'),
  })

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  })

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    changePassword.mutate()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Avatar must be under 2MB'); return }
    setUploadingAvatar(true)
    try {
      const { data } = await api.get('/uploads/avatar')
      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      setAvatarUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${data.key}`)
      await api.patch('/profiles/me', { avatarKey: data.key })
      toast.success('Avatar updated!')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Account settings</h1>

      {/* Profile info */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>

        <div className="flex items-center gap-4 mb-5">
          <label className="relative cursor-pointer group shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            {avatarUrl ? (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand text-2xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">{uploadingAvatar ? '⏳' : '📷'}</span>
            </div>
          </label>
          <div>
            <p className="font-medium text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
              {user?.role === 'USER' ? 'Popper' : 'Stacker'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Display name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
        </div>

        <button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending || name === user?.name}
          className="btn-primary w-full py-2.5 mt-4 disabled:opacity-50">
          {updateProfile.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Change password */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Change password</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Current password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="input" placeholder="Enter current password" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">New password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="input" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="input" placeholder="Repeat new password" />
          </div>
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
          className="btn-primary w-full py-2.5 mt-4 disabled:opacity-50">
          {changePassword.isPending ? 'Changing...' : 'Change password'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200">
        <h2 className="text-sm font-semibold text-red-700 mb-2">Danger zone</h2>
        <p className="text-xs text-gray-500 mb-3">Log out of your account on this device.</p>
        <button
          onClick={() => { clearAuth(); window.location.href = '/' }}
          className="w-full py-2.5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
          Log out
        </button>
      </div>
    </div>
  )
}
