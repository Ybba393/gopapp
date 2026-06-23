'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`
}

export default function HoursPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [hoursStr, setHoursStr] = useState('')
  const [description, setDescription] = useState('')
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  async function loadLogs(uid: string) {
    const supabase = createClient()
    const { data } = await supabase.from('volunteer_logs').select('*').eq('student_id', uid).order('date', { ascending: false })
    const all = data ?? []
    setLogs(all)
    setTotalHours(all.reduce((s: number, l: any) => s + Number(l.hours), 0))
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      await loadLogs(user.id)
      setLoading(false)
    })
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this log entry?')) return
    const supabase = createClient()
    await supabase.from('volunteer_logs').delete().eq('id', id)
    await loadLogs(userId!)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const hours = parseFloat(hoursStr)
    if (!projectName.trim()) { setError('Enter a project name.'); return }
    if (isNaN(hours) || hours <= 0) { setError('Enter valid hours (e.g. 2.5).'); return }
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('Date must be YYYY-MM-DD format.'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('volunteer_logs').insert({
      student_id: userId,
      project_name: projectName.trim(),
      hours,
      description: description.trim() || null,
      date: dateStr,
    })
    setSubmitting(false)
    if (err) { setError('Could not save. Try again.'); return }
    setShowModal(false)
    setProjectName(''); setHoursStr(''); setDescription('')
    setDateStr(new Date().toISOString().split('T')[0])
    await loadLogs(userId!)
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-8" style={{ background: '#0D2137' }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D4A853' }}>COMMUNITY SERVICE</p>
            <h1 className="text-2xl font-black text-white">Volunteer Hours</h1>
            <div className="flex items-end gap-2 mt-3">
              <span className="text-5xl font-black text-white">{loading ? '—' : totalHours}</span>
              <span className="text-lg text-white/50 mb-1">hours</span>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0 mt-1"
            style={{ background: '#D4A853', color: '#0D2137' }}>
            +
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⏱️</p>
            <p className="font-bold text-gray-500">No hours logged yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap + to log your first entry</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-3 items-start">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                style={{ background: '#FEF3C7', border: '1.5px solid #D4A853' }}>
                <span className="text-xl font-black" style={{ color: '#D4A853', lineHeight: 1 }}>{Number(log.hours)}</span>
                <span className="text-xs font-bold" style={{ color: '#D4A853' }}>hrs</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm" style={{ color: '#0D2137' }}>{log.project_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.date)}</p>
                {log.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{log.description}</p>}
              </div>
              <button onClick={() => handleDelete(log.id)} className="text-gray-300 active:text-red-400 p-1 flex-shrink-0">🗑️</button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black" style={{ color: '#0D2137' }}>Log Hours</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">PROJECT / ORGANIZATION</label>
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Detroit Food Bank"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">TOTAL HOURS</label>
                <input value={hoursStr} onChange={(e) => setHoursStr(e.target.value)}
                  placeholder="e.g. 2.5" type="decimal"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">DATE (YYYY-MM-DD)</label>
                <input value={dateStr} onChange={(e) => setDateStr(e.target.value)}
                  placeholder="2026-11-14"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">DESCRIPTION</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you do? Who did you help?"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-2xl font-black text-sm"
                style={{ background: '#0D2137', color: 'white' }}>
                {submitting ? 'Saving...' : 'Submit Log'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
