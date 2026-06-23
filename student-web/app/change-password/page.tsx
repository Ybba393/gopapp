'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || !confirmPassword) { setError('Please fill in both fields.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword === 'GOPStudent') { setError('Please choose a different password from the default.'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ default_password_changed: true }).eq('id', user.id)
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0D2137' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-5xl mb-4">🔐</p>
          <h1 className="text-3xl font-black text-white mb-3">Secure Your Account</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Create a personal password to protect your GOP account. You only need to do this once.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-white/60 text-xs font-bold mb-2 tracking-wide">NEW PASSWORD</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-white rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs font-bold mb-2 tracking-wide">CONFIRM PASSWORD</label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="w-full bg-white rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide"
            style={{ backgroundColor: '#D4A853', color: '#0D2137' }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
