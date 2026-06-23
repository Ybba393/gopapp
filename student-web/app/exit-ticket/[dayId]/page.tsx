'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type QuestionType = 'rating' | 'text' | 'textarea' | 'single' | 'multi'
interface Question { id: string; type: QuestionType; text: string; options?: string[]; maxSelect?: number; required?: boolean }

export default function ExitTicketPage() {
  const { dayId } = useParams<{ dayId: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [day, setDay] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      setUserId(user.id)
      const [{ data: d }, { data: existing }] = await Promise.all([
        supabase.from('program_days').select('*').eq('id', dayId).single(),
        supabase.from('exit_ticket_responses').select('id').eq('student_id', user.id).eq('program_day_id', dayId).single(),
      ])
      if (d) {
        setDay(d)
        const qs = (d.questions ?? []).map((q: any, i: number) =>
          typeof q === 'string' ? { id: String(i), type: 'text', text: q, required: true } : { id: q.id ?? String(i), ...q }
        )
        setQuestions(qs)
      }
      if (existing) setAlreadyDone(true)
      setLoading(false)
    })
  }, [dayId])

  function setAnswer(qId: string, val: any) {
    setAnswers((prev) => ({ ...prev, [qId]: val }))
  }

  function toggleMulti(qId: string, opt: string, maxSelect?: number) {
    const cur: string[] = answers[qId] ?? []
    const next = cur.includes(opt) ? cur.filter((v) => v !== opt) : maxSelect && cur.length >= maxSelect ? cur : [...cur, opt]
    setAnswer(qId, next)
  }

  async function handleSubmit() {
    for (const q of questions) {
      if (q.required !== false) {
        const a = answers[q.id]
        if (a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0)) {
          alert(`Please answer: "${q.text}"`)
          return
        }
      }
    }
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('exit_ticket_responses').insert({
      student_id: userId,
      program_day_id: dayId,
      responses: { answers },
    })
    setSubmitting(false)
    setSubmitted(true)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D2137' }}>
      <div className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  )

  if (alreadyDone || submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0D2137' }}>
      <p className="text-6xl mb-4">✅</p>
      <h1 className="text-2xl font-black text-white mb-2">Already Submitted!</h1>
      <p className="text-white/60 text-sm mb-8">You've already completed the exit ticket for this program day.</p>
      <button onClick={() => router.push('/roadmap')}
        className="px-6 py-3 rounded-2xl font-black text-sm"
        style={{ background: '#D4A853', color: '#0D2137' }}>
        Back to Roadmap
      </button>
    </div>
  )

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      <div className="px-5 pt-14 pb-6" style={{ background: '#0D2137' }}>
        <button onClick={() => router.push('/roadmap')} className="text-white/60 text-sm mb-3 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D4A853' }}>EXIT TICKET</p>
        <h1 className="text-xl font-black text-white">{day?.title}</h1>
      </div>

      <div className="px-4 py-5 space-y-5">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide mb-1" style={{ color: '#D4A853' }}>Q{i + 1}{q.required !== false ? ' *' : ''}</p>
            <p className="font-black text-sm mb-4" style={{ color: '#0D2137' }}>{q.text}</p>

            {q.type === 'rating' && (
              <div className="flex gap-2">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} onClick={() => setAnswer(q.id, s)}
                    className="w-11 h-11 rounded-xl text-xl font-black transition-all"
                    style={{ background: (answers[q.id] ?? 0) >= s ? '#D4A853' : '#f1f5f9', color: (answers[q.id] ?? 0) >= s ? '#0D2137' : '#CBD5E1' }}>
                    ★
                  </button>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <input value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Your answer..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400" />
            )}

            {q.type === 'textarea' && (
              <textarea value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Your answer..." rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none" />
            )}

            {q.type === 'single' && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <button key={opt} onClick={() => setAnswer(q.id, opt)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border transition-all"
                    style={answers[q.id] === opt
                      ? { background: '#EEF3FA', borderColor: '#0D2137', color: '#0D2137' }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'multi' && (
              <div className="space-y-2">
                {q.maxSelect && <p className="text-xs text-gray-400 mb-2">Select up to {q.maxSelect}</p>}
                {(q.options ?? []).map((opt) => {
                  const selected = (answers[q.id] ?? []).includes(opt)
                  return (
                    <button key={opt} onClick={() => toggleMulti(q.id, opt, q.maxSelect)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border transition-all"
                      style={selected
                        ? { background: '#EEF3FA', borderColor: '#0D2137', color: '#0D2137' }
                        : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                      {selected ? '☑ ' : '☐ '}{opt}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 rounded-2xl font-black text-sm"
          style={{ background: '#0D2137', color: 'white' }}>
          {submitting ? 'Submitting...' : 'Submit Exit Ticket'}
        </button>
      </div>
    </div>
  )
}
