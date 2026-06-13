'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

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
  has_exit_ticket: boolean
  questions: string[]
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExitTicketsPage() {
  const supabase = createClient()
  const [programDays, setProgramDays] = useState<ProgramDay[]>([])
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<TicketResponse | null>(null)
  const [view, setView] = useState<'responses' | 'questions'>('responses')

  // Question editing
  const [editQuestions, setEditQuestions] = useState<string[]>([])
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  async function load() {
    const [{ data: days }, { data: resp }] = await Promise.all([
      supabase.from('program_days').select('id, title, date, has_exit_ticket, questions').order('sort_order'),
      supabase.from('exit_ticket_responses').select('*, profiles(name, email)').order('submitted_at', { ascending: false }),
    ])
    const dayList = (days ?? []).map((d: any) => ({ ...d, questions: d.questions ?? [] }))
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
  }

  async function handleSaveQuestions() {
    if (!selectedDay) return
    setSavingQuestions(true)
    const cleaned = editQuestions.filter((q) => q.trim())
    await supabase.from('program_days').update({ questions: cleaned }).eq('id', selectedDay)
    // Update local state
    setProgramDays((prev) => prev.map((d) => d.id === selectedDay ? { ...d, questions: cleaned } : d))
    setSavingQuestions(false)
    setSavedMsg('Saved!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  const activeDay = programDays.find((d) => d.id === selectedDay)
  const dayResponses = responses.filter((r) => r.program_day_id === selectedDay)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Exit Tickets</h1>
          <p className="text-gray-500 mt-1 text-sm">View responses and edit questions per program day.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : programDays.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <div className="text-5xl mb-4">📋</div>
            <p className="font-semibold text-gray-400">No exit ticket days yet</p>
            <p className="text-sm mt-1">Add program days first to manage exit tickets</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Day sidebar */}
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
                    ✏️ Edit Questions
                  </button>
                </div>

                <div className="mb-4">
                  <h2 className="text-lg font-black" style={{ color: '#0D2137' }}>{activeDay.title}</h2>
                  <p className="text-sm text-gray-400">{formatDate(activeDay.date)}</p>
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
                            <span className="text-xs font-semibold text-blue-500">View →</span>
                          </div>
                          {activeDay.questions.length > 0 && r.responses?.answers?.[0] && (
                            <p className="text-sm text-gray-500 mt-2 truncate">
                              {activeDay.questions[0]}: <span className="text-gray-700">{r.responses.answers[0]}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Questions edit view */}
                {view === 'questions' && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <p className="text-sm text-gray-500 mb-4">
                      Edit the questions for this exit ticket. Students will see these questions at 3:00 PM on the day of the program.
                    </p>
                    <div className="space-y-3 mb-4">
                      {editQuestions.map((q, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-sm font-bold text-gray-400 min-w-6">{i + 1}.</span>
                          <input
                            type="text"
                            value={q}
                            onChange={(e) => {
                              const updated = [...editQuestions]
                              updated[i] = e.target.value
                              setEditQuestions(updated)
                            }}
                            placeholder={`Question ${i + 1}`}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                          />
                          <button onClick={() => setEditQuestions(editQuestions.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-400 text-lg px-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setEditQuestions([...editQuestions, ''])}
                        className="text-sm font-bold text-blue-500 hover:text-blue-700">
                        + Add Question
                      </button>
                      <button onClick={handleSaveQuestions} disabled={savingQuestions}
                        className="px-5 py-2 rounded-xl text-sm font-bold text-white"
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
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto pt-12">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl mb-8">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black" style={{ color: '#0D2137' }}>{selectedResponse.profiles?.name}</h2>
                  <p className="text-sm text-gray-400">{activeDay.title} · {selectedResponse.profiles?.email}</p>
                </div>
                <button onClick={() => setSelectedResponse(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-5">
                {activeDay.questions.length > 0 ? (
                  activeDay.questions.map((question, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{question}</p>
                      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700">
                        {selectedResponse.responses?.answers?.[i] ?? <span className="text-gray-300 italic">No answer</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 overflow-auto">
                    {JSON.stringify(selectedResponse.responses, null, 2)}
                  </pre>
                )}
                <p className="text-xs text-gray-400">Submitted {new Date(selectedResponse.submitted_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
