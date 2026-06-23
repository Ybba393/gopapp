'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`
}

function getDayStatus(d: string): 'past' | 'today' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0]
  if (d < today) return 'past'
  if (d === today) return 'today'
  return 'upcoming'
}

function isOpenNow(t: string | null) {
  return !!t && new Date(t) <= new Date()
}

export default function RoadmapPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [cohortId, setCohortId] = useState<string | null>(null)
  const [days, setDays] = useState<any[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({})
  const [exitDoneSet, setExitDoneSet] = useState<Set<string>>(new Set())
  const [forms, setForms] = useState<any[]>([])
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  async function loadData(uid: string, cid: string) {
    const supabase = createClient()
    const [{ data: d }, { data: att }, { data: exits }, { data: f }, { data: fr }] = await Promise.all([
      supabase.from('program_days').select('*').eq('cohort_id', cid).order('sort_order'),
      supabase.from('attendance').select('program_day_id').eq('student_id', uid).eq('status', 'present'),
      supabase.from('exit_ticket_responses').select('program_day_id').eq('student_id', uid),
      supabase.from('standalone_forms').select('id,title,opens_at').eq('is_active', true).order('sort_order'),
      supabase.from('form_responses').select('form_id').eq('respondent_id', uid),
    ])
    setDays(d ?? [])
    const aMap: Record<string, boolean> = {}
    for (const a of att ?? []) aMap[a.program_day_id] = true
    setAttendanceMap(aMap)
    setExitDoneSet(new Set((exits ?? []).map((e: any) => e.program_day_id)))
    setForms(f ?? [])
    setSubmittedFormIds(new Set((fr ?? []).map((r: any) => r.form_id)))
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('cohort_id').eq('id', user.id).single()
      if (prof?.cohort_id) {
        setCohortId(prof.cohort_id)
        await loadData(user.id, prof.cohort_id)
      }
      setLoading(false)
    })
  }, [])

  async function handleCheckIn(day: any) {
    if (!userId || attendanceMap[day.id]) return
    if (!isOpenNow(day.checkin_opens_at)) {
      alert(day.checkin_opens_at ? `Check-in opens ${new Date(day.checkin_opens_at).toLocaleString()}.` : 'Check-in is not open yet.')
      return
    }
    setCheckingIn(day.id)
    const supabase = createClient()
    await supabase.from('attendance').insert({ student_id: userId, program_day_id: day.id, status: 'present' })
    await loadData(userId, cohortId!)
    setCheckingIn(null)
    alert(`✓ Checked in to ${day.title}!`)
  }

  const STATUS = {
    past: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
    today: { label: 'Today', color: '#D4A853', bg: '#FEF3C7' },
    upcoming: { label: 'Upcoming', color: '#475569', bg: '#f1f5f9' },
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: '#0D2137' }}>
        <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D4A853' }}>GENERATION OF PROMISE</p>
        <h1 className="text-2xl font-black text-white">Program Roadmap</h1>
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {days.map((day, i) => {
              const status = getDayStatus(day.date)
              const cfg = STATUS[status]
              const checkedIn = !!attendanceMap[day.id]
              const checkInOpen = isOpenNow(day.checkin_opens_at)
              const exitOpen = isOpenNow(day.exit_ticket_opens_at)
              const exitDone = exitDoneSet.has(day.id)
              const isLast = i === days.length - 1

              return (
                <div key={day.id} className="flex gap-3 mb-2">
                  {/* Timeline */}
                  <div className="flex flex-col items-center pt-4 w-6 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: status === 'past' ? '#16a34a' : status === 'today' ? '#D4A853' : '#CBD5E1' }} />
                    {!isLast && <div className="w-0.5 flex-1 mt-1" style={{ background: '#E2E8F0' }} />}
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-2xl p-4 mb-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-gray-400 font-semibold">{formatDate(day.date)}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                    <h3 className="text-base font-black mb-1" style={{ color: '#0D2137' }}>{day.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">{day.description}</p>

                    <div className="flex gap-2 flex-wrap">
                      {/* Check In */}
                      {checkedIn ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                          ✓ Checked In
                        </span>
                      ) : checkInOpen ? (
                        <button onClick={() => handleCheckIn(day)}
                          disabled={checkingIn === day.id}
                          className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl"
                          style={{ background: '#D4A853', color: '#0D2137' }}>
                          {checkingIn === day.id ? '...' : '→ Check In'}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                          🔒 Check In
                        </span>
                      )}

                      {/* Exit Ticket */}
                      {exitDone ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                          ✓ Exit Ticket Done
                        </span>
                      ) : exitOpen ? (
                        <button onClick={() => router.push(`/exit-ticket/${day.id}`)}
                          className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl"
                          style={{ background: '#EEF3FA', color: '#0D2137', border: '1px solid #BFDBFE' }}>
                          📋 Exit Ticket
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                          🔒 Exit Ticket
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Standalone Forms */}
            {forms.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 tracking-widest">FORMS</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {forms.map((form) => {
                  const isOpen = isOpenNow(form.opens_at)
                  const isDone = submittedFormIds.has(form.id)
                  return (
                    <div key={form.id}
                      onClick={() => { if (isOpen && !isDone) router.push(`/forms/${form.id}`) }}
                      className={`bg-white rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3 ${isOpen && !isDone ? 'cursor-pointer active:opacity-70' : 'opacity-60'}`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#EEF3FA' }}>
                        <span className="text-lg">{isDone ? '✅' : isOpen ? '📄' : '🔒'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm" style={{ color: '#0D2137' }}>{form.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: isDone ? '#16a34a' : isOpen ? '#D4A853' : '#94a3b8' }}>
                          {isDone ? 'Submitted ✓' : isOpen ? 'Tap to fill out' : 'Coming soon'}
                        </p>
                      </div>
                      {isOpen && !isDone && <span className="text-gray-300 text-lg">›</span>}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
