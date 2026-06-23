'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function goAfterAuth(userId: string) {
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, default_password_changed')
      .eq('id', userId)
      .single()

    if (!profile) {
      await supabase.auth.signOut()
      setError('Your email is not on the approved roster. Contact Mrs. Sykes.')
      setLoading(false)
      return
    }
    if (profile.role === 'admin') {
      await supabase.auth.signOut()
      setError('Use the admin dashboard instead.')
      setLoading(false)
      return
    }
    if (!profile.default_password_changed) {
      window.location.href = '/change-password'
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const cleanEmail = email.trim().toLowerCase()

    // Try signing in first
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (!signInError && data?.user) {
      await goAfterAuth(data.user.id)
      return
    }

    // First-time student: check roster and auto-create account
    if (signInError?.message?.includes('Invalid login credentials')) {
      const { data: onRoster } = await supabase.rpc('is_email_on_roster', { user_email: cleanEmail })

      if (!onRoster) {
        setError('Your email is not on the approved list. Contact Mrs. Sykes.')
        setLoading(false)
        return
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      })

      if (signUpError?.message?.toLowerCase().includes('already')) {
        setError('Incorrect password. First time? Use "GOPStudent". Otherwise contact Mrs. Sykes.')
        setLoading(false)
        return
      }

      if (signUpError || !signUpData?.user) {
        setError(signUpError?.message ?? 'Could not create account. Try again.')
        setLoading(false)
        return
      }

      await new Promise((r) => setTimeout(r, 1500))
      await goAfterAuth(signUpData.user.id)
      return
    }

    setError(signInError?.message ?? 'Something went wrong. Please try again.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0D2137' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 text-xs font-bold tracking-widest mb-5">
            GENERATION OF PROMISE
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-white/50 text-sm">Sign in to your GOP account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/60 text-xs font-bold mb-2 tracking-wide">EMAIL</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-white rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs font-bold mb-2 tracking-wide">PASSWORD</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full bg-white rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
              required
            />
          </div>

          {/* First-time hint */}
          <div className="rounded-xl px-4 py-3 border" style={{ background: 'rgba(212,168,83,0.12)', borderColor: 'rgba(212,168,83,0.25)' }}>
            <p className="text-white/60 text-xs leading-relaxed">
              First time signing in? Use the password{' '}
              <span className="font-bold" style={{ color: '#D4A853' }}>GOPStudent</span>
              {' '}— you'll be prompted to set a new one.
            </p>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
