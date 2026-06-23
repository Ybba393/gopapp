'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError || !data?.user) {
        setError('Invalid email or password. Please try again.')
        return
      }

      // Verify admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        setError('Profile not found. Make sure your account was set up correctly.')
        return
      }

      if (profile.role !== 'admin') {
        await supabase.auth.signOut()
        setError('This dashboard is for program administrators only.')
        return
      }

      window.location.href = '/dashboard'
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D2137' }}>
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 text-xs font-bold tracking-widest mb-5">
            GENERATION OF PROMISE
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Admin Portal</h1>
          <p className="text-white/50 text-sm">Program Manager Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-white/70 text-xs font-semibold mb-2 tracking-wide">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full bg-white border border-white/15 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400/60 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold mb-2 tracking-wide">
                PASSWORD
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-white border border-white/15 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400/60 text-sm"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all"
              style={{ backgroundColor: '#D4A853', color: '#0D2137' }}
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-8">
          Student access? Use the mobile app.
        </p>
      </div>
    </div>
  )
}
