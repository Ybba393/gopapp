'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError || !data?.user) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      await supabase.auth.signOut()
      setError('Use the admin dashboard instead.')
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0D2137' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 text-xs font-bold tracking-widest mb-5">
            GENERATION OF PROMISE
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Welcome</h1>
          <p className="text-white/50 text-sm">Sign in to your student account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/60 text-xs font-bold mb-2 tracking-wide">EMAIL</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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

          {error && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide mt-2"
            style={{ backgroundColor: '#D4A853', color: '#0D2137' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
