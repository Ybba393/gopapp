'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [showPwModal, setShowPwModal] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*, cohort:cohorts(name)')
        .eq('id', user.id)
        .single()
      setProfile(data)
    })
  }, [])

  async function handleSignOut() {
    if (!confirm('Are you sure you want to sign out?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (!newPw || !confirmPw) { setPwError('Please fill in both fields.'); return }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }

    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setPwError(error.message); setPwLoading(false); return }

    if (userId) {
      await supabase.from('profiles').update({ default_password_changed: true }).eq('id', userId)
    }

    setPwLoading(false)
    setPwSuccess(true)
    setNewPw(''); setConfirmPw('')
    setTimeout(() => { setShowPwModal(false); setPwSuccess(false) }, 1500)
  }

  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ background: '#0D2137' }}>
        <h1 className="text-2xl font-black text-white">Profile</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mb-1"
            style={{ background: '#0D2137', color: '#D4A853' }}>
            {initials}
          </div>
          <p className="text-xl font-black" style={{ color: '#0D2137' }}>{profile?.name ?? '—'}</p>
          <p className="text-sm text-gray-500">{profile?.email ?? '—'}</p>
          {profile?.cohort?.name && (
            <span className="px-3 py-1 rounded-full text-xs font-bold mt-1"
              style={{ background: '#EEF3FA', color: '#0D2137' }}>
              🎓 {profile.cohort.name}
            </span>
          )}
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => { setNewPw(''); setConfirmPw(''); setPwError(''); setPwSuccess(false); setShowPwModal(true) }}
            className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: '#EEF3FA' }}>🔒</div>
            <span className="flex-1 text-sm font-semibold text-left" style={{ color: '#0D2137' }}>Change Password</span>
            <span className="text-gray-300">›</span>
          </button>
          <button onClick={() => alert('Generation of Promise (GOP) is a youth leadership program at Focus: HOPE dedicated to building community among young leaders in metropolitan Detroit.')}
            className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: '#EEF3FA' }}>ℹ️</div>
            <span className="flex-1 text-sm font-semibold text-left" style={{ color: '#0D2137' }}>About Generation of Promise</span>
            <span className="text-gray-300">›</span>
          </button>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm"
          style={{ background: '#FFF0F0', color: '#C62828', border: '1px solid rgba(198,40,40,0.15)' }}>
          🚪 Sign Out
        </button>

        <p className="text-center text-xs text-gray-400">Generation of Promise · v1.0</p>
      </div>

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPwModal(false) }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black" style={{ color: '#0D2137' }}>Change Password</h2>
              <button onClick={() => setShowPwModal(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            {pwSuccess ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-bold" style={{ color: '#0D2137' }}>Password updated!</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">NEW PASSWORD</label>
                  <input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">CONFIRM PASSWORD</label>
                  <input type="text" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
                </div>
                {pwError && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 text-center">{pwError}</p>}
                <button type="submit" disabled={pwLoading}
                  className="w-full py-4 rounded-2xl font-black text-sm"
                  style={{ background: '#0D2137', color: 'white' }}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
