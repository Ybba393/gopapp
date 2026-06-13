'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'rating' | 'text' | 'textarea' | 'single' | 'multi'

interface Question {
  id: string
  type: QuestionType
  text: string
  options?: string[]
  maxSelect?: number
  required?: boolean
}

interface TicketResponse {
  id: string
  submitted_at: string
  responses: Record<string, any>
  student_id: string
  program_day_id: string
  profiles: { name: string; email: string } | null
}

interface ProgramDay {
  id: string
  title: string
  date: string
  questions: Question[]
  checkin_opens_at: string | null
  exit_ticket_opens_at: string | null
}



const TYPE_LABELS: Record<QuestionType, string> = {
  rating: '⭐ Star Rating (1–5)',
  text: '✏️ Short Answer',
  textarea: '📝 Long Answer',
  single: '🔘 Single Choice',
  multi: '☑️ Multiple Choice',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function newQuestion(): Question {
  return { id: crypto.randomUUID(), type: 'text', text: '', required: true }
}

// ── Question Editor ──────────────────────────────────────────────────────────

function QuestionEditor({ q, onChange, onDelete }: {
  q: Question
  onChange: (updated: Question) => void
  onDelete: () => void
}) {
  function setType(type: QuestionType) {
    const updated: Question = { ...q, type }
    if (type === 'single' || type === 'multi') {
      if (!updated.options || updated.options.length === 0) updated.options = ['']
    } else {
      delete updated.options
      delete updated.maxSelect
    }
    onChange(updated)
  }

  function setOption(i: number, val: string) {
    const opts = [...(q.options ?? [])]
    opts[i] = val
    onChange({ ...q, options: opts })
  }

  function addOption() {
    onChange({ ...q, options: [...(q.options ?? []), ''] })
  }

  function removeOption(i: number) {
    onChange({ ...q, options: (q.options ?? []).filter((_, idx) => idx !== i) })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
      {/* Question type + delete */}
      <div className="flex items-center gap-3">
        <select value={q.type} onChange={(e) => setType(e.target.value as QuestionType)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-400 bg-gray-50">
          {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 ml-auto cursor-pointer">
          <input type="checkbox" checked={q.required !== false}
            onChange={(e) => onChange({ ...q, required: e.target.checked })} />
          Required
        </label>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg px-1">✕</button>
      </div>

      {/* Question text */}
      <input type="text" value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
        placeholder="Question text..."
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />

      {/* Options for single/multi */}
      {(q.type === 'single' || q.type === 'multi') && (
        <div className="pl-2 space-y-2">
          {q.type === 'multi' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-semibold">Max selections:</label>
              <input type="number" min={1} max={20}
                value={q.maxSelect ?? ''}
                onChange={(e) => onChange({ ...q, maxSelect: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Any"
                className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
            </div>
          )}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Options</p>
          {(q.options ?? []).map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-gray-300">·</span>
              <input type="text" value={opt} onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              <button onClick={() => removeOption(i)}
                className="text-gray-300 hover:text-red-400 text-base">✕</button>
            </div>
          ))}
          <button onClick={addOption} className="text-xs font-bold text-blue-500 hover:text-blue-700">
            + Add option
          </button>
        </div>
      )}
    </div>
  )
}

// ── Response Detail ──────────────────────────────────────────────────────────

function ResponseDetail({ r, questions, onClose }: {
  r: TicketResponse; questions: Question[]; onClose: () => void
}) {
  function renderAnswer(q: Question) {
    const val = r.responses?.answers?.[q.id]
    if (val === undefined || val === null || val === '' || val === 0) {
      return <span className="text-gray-300 italic text-sm">No answer</span>
    }
    if (q.type === 'rating') {
      return (
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <span key={s} style={{ color: s <= val ? '#D4A853' : '#E5E7EB', fontSize: 20 }}>★</span>
          ))}
          <span className="text-sm text-gray-500 ml-1">{val}/5</span>
        </div>
      )
    }
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-2">
          {val.map((v: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">{v}</span>
          ))}
        </div>
      )
    }
    return <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{String(val)}</p>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto pt-12">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl mb-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black" style={{ color: '#0D2137' }}>{r.profiles?.name}</h2>
            <p className="text-sm text-gray-400">{r.profiles?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {questions.length > 0 ? questions.map((q) => (
            <div key={q.id}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{q.text}</p>
              {renderAnswer(q)}
            </div>
          )) : (
            <pre className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 overflow-auto">
              {JSON.stringify(r.responses, null, 2)}
            </pre>
          )}
          <p className="text-xs text-gray-400 pt-2">
            Submitted {new Date(r.submitted_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ExitTicketsPage() {
  const supabase = createClient()
  const [programDays, setProgramDays] = useState<ProgramDay[]>([])
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<TicketResponse | null>(null)
  const [view, setView] = useState<'responses' | 'questions'>('responses')

  const [editQuestions, setEditQuestions] = useState<Question[]>([])
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [savingDate, setSavingDate] = useState(false)

  async function load() {
    const [{ data: days }, { data: resp }] = await Promise.all([
      supabase.from('program_days').select('id, title, date, questions, checkin_opens_at, exit_ticket_opens_at').order('sort_order'),
      supabase.from('exit_ticket_responses').select('*, profiles(name, email)').order('submitted_at', { ascending: false }),
    ])
    const dayList = (days ?? []).map((d: any) => ({
      ...d,
      questions: (d.questions ?? []).map((q: any, i: number) =>
        typeof q === 'string'
          ? { id: String(i), type: 'text', text: q, required: true }
          : { id: q.id ?? String(i), ...q }
      ),
    }))
    setProgramDays(dayList)
    setResponses((resp ?? []) as any)
    if (dayList.length > 0 && !selectedDay) {
      setSelectedDay(dayList[0].id)
      setEditQuestions(dayList[0].questions)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function selectDay(id: string) {
    setSelectedDay(id)
    setSelectedResponse(null)
    setSavedMsg('')
    const day = programDays.find((d) => d.id === id)
    setEditQuestions(day?.questions ?? [])
    setEditingDate(null)
  }

  async function handleSaveDate(dayId: string, newDate: string) {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) return
    setSavingDate(true)
    await supabase.from('program_days').update({ date: newDate }).eq('id', dayId)
    setProgramDays((prev) => prev.map((d) => d.id === dayId ? { ...d, date: newDate } : d))
    setSavingDate(false)
    setEditingDate(null)
  }

  async function handleSaveOpensAt(dayId: string, field: 'checkin_opens_at' | 'exit_ticket_opens_at', iso: string | null) {
    await supabase.from('program_days').update({ [field]: iso }).eq('id', dayId)
    setProgramDays((prev) => prev.map((d) => d.id === dayId ? { ...d, [field]: iso } : d))
  }

  async function handleSaveQuestions() {
    if (!selectedDay) return
    setSavingQuestions(true)
    const cleaned = editQuestions.filter((q) => q.text.trim()).map((q) => ({
      ...q,
      options: q.options?.filter((o) => o.trim()),
    }))
    await supabase.from('program_days').update({ questions: cleaned }).eq('id', selectedDay)
    setProgramDays((prev) => prev.map((d) => d.id === selectedDay ? { ...d, questions: cleaned } : d))
    setSavingQuestions(false)
    setSavedMsg('Saved!')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const activeDay = programDays.find((d) => d.id === selectedDay)
  const dayResponses = responses.filter((r) => r.program_day_id === selectedDay)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Exit Tickets</h1>
          <p className="text-gray-500 mt-1 text-sm">View student responses and edit questions per program day.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : programDays.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <div className="text-5xl mb-4">📋</div>
            <p className="font-semibold text-gray-400">No program days yet</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-52 flex-shrink-0 space-y-2">
              {programDays.map((day) => {
                const count = responses.filter((r) => r.program_day_id === day.id).length
                const isActive = selectedDay === day.id
                return (
                  <button key={day.id} onClick={() => selectDay(day.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
                    style={isActive ? { backgroundColor: '#0D2137' } : {}}>
                    <div>{day.title}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                      {formatDate(day.date)} · {count} response{count !== 1 ? 's' : ''}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Main panel */}
            {activeDay && (
              <div className="flex-1 min-w-0">
                {/* Toggle */}
                <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
                  <button onClick={() => setView('responses')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'responses' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    Responses ({dayResponses.length})
                  </button>
                  <button onClick={() => setView('questions')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'questions' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                    ✏️ Edit Questions ({activeDay.questions.length})
                  </button>
                </div>

                <div className="mb-5 bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <h2 className="text-lg font-black" style={{ color: '#0D2137' }}>{activeDay.title}</h2>

                  {/* Program day date */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Program Date</span>
                    {editingDate !== null ? (
                      <div className="flex items-center gap-2">
                        <input type="date" value={editingDate}
                          onChange={(e) => setEditingDate(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2137]" />
                        <button onClick={() => handleSaveDate(activeDay.id, editingDate)} disabled={savingDate}
                          className="text-xs font-bold text-white bg-[#0D2137] px-3 py-1.5 rounded-lg disabled:opacity-50">
                          {savingDate ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingDate(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 font-medium">{formatDate(activeDay.date)}</span>
                        <button onClick={() => setEditingDate(activeDay.date)}
                          className="text-xs text-[#D4A853] font-semibold hover:underline">Edit</button>
                      </div>
                    )}
                  </div>

                  {/* Check-in */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Check-in</span>
                    <div className="flex items-center gap-2">
                      {activeDay.checkin_opens_at && new Date(activeDay.checkin_opens_at) <= new Date() ? (
                        <>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">🟢 Open for students</span>
                          <button
                            onClick={() => handleSaveOpensAt(activeDay.id, 'checkin_opens_at', null)}
                            className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50">
                            Close
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSaveOpensAt(activeDay.id, 'checkin_opens_at', new Date().toISOString())}
                          className="text-xs font-bold text-white px-4 py-1.5 rounded-lg hover:opacity-90"
                          style={{ backgroundColor: '#0D2137' }}>
                          Open Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exit Ticket */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Exit Ticket</span>
                    <div className="flex items-center gap-2">
                      {activeDay.exit_ticket_opens_at && new Date(activeDay.exit_ticket_opens_at) <= new Date() ? (
                        <>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">🟢 Open for students</span>
                          <button
                            onClick={() => handleSaveOpensAt(activeDay.id, 'exit_ticket_opens_at', null)}
                            className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50">
                            Close
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSaveOpensAt(activeDay.id, 'exit_ticket_opens_at', new Date().toISOString())}
                          className="text-xs font-bold text-white px-4 py-1.5 rounded-lg hover:opacity-90"
                          style={{ backgroundColor: '#0D2137' }}>
                          Open Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Responses view */}
                {view === 'responses' && (
                  dayResponses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                      No submissions yet for this program day.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayResponses.map((r) => (
                        <div key={r.id}
                          className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-blue-200 transition-colors"
                          onClick={() => setSelectedResponse(r)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-gray-800">{r.profiles?.name ?? '—'}</span>
                              <span className="text-xs text-gray-400 ml-2">{r.profiles?.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-xs font-semibold text-blue-500">View →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Questions editor */}
                {view === 'questions' && (
                  <div className="space-y-3">
                    {editQuestions.map((q, i) => (
                      <QuestionEditor key={q.id} q={q}
                        onChange={(updated) => setEditQuestions(editQuestions.map((x, idx) => idx === i ? updated : x))}
                        onDelete={() => setEditQuestions(editQuestions.filter((_, idx) => idx !== i))}
                      />
                    ))}

                    <button
                      onClick={() => setEditQuestions([...editQuestions, newQuestion()])}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                      + Add Question
                    </button>

                    <div className="flex items-center gap-4 pt-2">
                      <button onClick={handleSaveQuestions} disabled={savingQuestions}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#0D2137' }}>
                        {savingQuestions ? 'Saving...' : 'Save Questions'}
                      </button>
                      {savedMsg && <span className="text-sm text-green-600 font-semibold">{savedMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Response detail modal */}
        {selectedResponse && activeDay && (
          <ResponseDetail r={selectedResponse} questions={activeDay.questions}
            onClose={() => setSelectedResponse(null)} />
        )}
      </div>
    </AdminLayout>
  )
}
