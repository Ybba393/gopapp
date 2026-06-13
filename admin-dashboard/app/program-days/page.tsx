'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface ProgramDay {
  id: string
  cohort_id: string
  title: string
  description: string | null
  date: string
  has_exit_ticket: boolean
  sort_order: number
  questions: string[]
  cohort?: { name: string }
}

interface Cohort { id: string; name: string; year: string; is_active?: boolean }

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProgramDaysPage() {
  const supabase = createClient()
  const [days, setDays] = useState<ProgramDay[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [filterCohort, setFilterCohort] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState({
    cohort_id: '', title: '', description: '', date: '', has_exit_ticket: false, sort_order: 1,
  })
  const [creating, setCreating] = useState(false)

  // Edit questions modal
  const [editingDay, setEditingDay] = useState<ProgramDay | null>(null)
  const [editQuestions, setEditQuestions] = useState<string[]>([])
  const [savingQuestions, setSavingQuestions] = useState(false)

  async function loadData() {
    const [{ data: cohortData }, { data: dayData }] = await Promise.all([
      supabase.from('cohorts').select('*').order('year', { ascending: false }),
      supabase.from('program_days').select('*, cohort:cohorts(name)').order('sort_order'),
    ])
    setCohorts(cohortData ?? [])
    setDays((dayData ?? []).map((d: any) => ({ ...d, questions: d.questions ?? [] })))
    if (cohortData?.length && !filterCohort) {
      const active = cohortData.find((c: any) => c.is_active)
      const id = active?.id ?? cohortData[0].id
      setFilterCohort(id)
      setForm((f) => ({ ...f, cohort_id: id }))
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)) }, [])

  async function handleCreate() {
    if (!form.cohort_id || !form.title || !form.date) return
    setCreating(true)
    await supabase.from('program_days').insert({
      cohort_id: form.cohort_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      date: form.date,
      has_exit_ticket: form.has_exit_ticket,
      sort_order: form.sort_order,
      questions: [],
    })
    setCreating(false)
    setShowCreate(false)
    setForm({ cohort_id: filterCohort, title: '', description: '', date: '', has_exit_ticket: false, sort_order: 1 })
    await loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this program day?')) return
    await supabase.from('program_days').delete().eq('id', id)
    await loadData()
  }

  async function handleSaveQuestions() {
    if (!editingDay) return
    setSavingQuestions(true)
    const cleaned = editQuestions.filter((q) => q.trim())
    await supabase.from('program_days').update({ questions: cleaned }).eq('id', editingDay.id)
    setSavingQuestions(false)
    setEditingDay(null)
    await loadData()
  }

  function openEditQuestions(day: ProgramDay) {
    setEditingDay(day)
    setEditQuestions(day.questions.length > 0 ? [...day.questions] : [''])
  }

  const filtered = days.filter((d) => !filterCohort || d.cohort_id === filterCohort)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Program Days</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage program days and exit ticket questions.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: '#0D2137' }}>
            + Add Day
          </button>
        </div>

        <div className="mb-5">
          <select value={filterCohort} onChange={(e) => setFilterCohort(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="">All Cohorts</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              No program days yet for this cohort.
            </div>
          ) : (
            filtered.map((day) => (
              <div key={day.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-14">
                      <div className="text-xs font-bold text-gray-400 uppercase">
                        {new Date(day.date + 'T12:00:00').toLocaleString('en', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-black" style={{ color: '#0D2137' }}>
                        {new Date(day.date + 'T12:00:00').getDate()}
                      </div>
                      <div className="text-xs text-gray-300">{new Date(day.date + 'T12:00:00').getFullYear()}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base" style={{ color: '#0D2137' }}>{day.title}</span>
                        {day.has_exit_ticket && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                            Exit Ticket · {day.questions.length} question{day.questions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {day.description && <p className="text-sm text-gray-500 mt-0.5">{day.description}</p>}
                      <p className="text-xs text-gray-300 mt-1">{(day.cohort as any)?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {day.has_exit_ticket && (
                      <button onClick={() => openEditQuestions(day)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50">
                        ✏️ Edit Questions
                      </button>
                    )}
                    <button onClick={() => handleDelete(day.id)}
                      className="text-xs text-red-300 hover:text-red-500 font-semibold">Delete</button>
                  </div>
                </div>

                {/* Show questions preview */}
                {day.has_exit_ticket && day.questions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50 space-y-1">
                    {day.questions.map((q, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        <span className="font-bold text-gray-400">{i + 1}.</span> {q}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>New Program Day</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT</label>
                  <select value={form.cohort_id} onChange={(e) => setForm({ ...form, cohort_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400">
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">TITLE</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Race & Culture Day"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">DESCRIPTION</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">DATE</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">ORDER</label>
                    <input type="number" min={1} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.has_exit_ticket} onChange={(e) => setForm({ ...form, has_exit_ticket: e.target.checked })}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm font-semibold text-gray-600">Has Exit Ticket</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#0D2137' }}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit questions modal */}
        {editingDay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-xl my-8">
              <h2 className="text-xl font-black mb-1" style={{ color: '#0D2137' }}>Exit Ticket Questions</h2>
              <p className="text-sm text-gray-400 mb-6">{editingDay.title} · {formatDate(editingDay.date)}</p>

              <div className="space-y-3 mb-4">
                {editQuestions.map((q, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-sm font-bold text-gray-400 mt-3 min-w-6">{i + 1}.</span>
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
                    <button
                      onClick={() => setEditQuestions(editQuestions.filter((_, idx) => idx !== i))}
                      className="mt-2.5 text-gray-300 hover:text-red-400 text-lg"
                    >✕</button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setEditQuestions([...editQuestions, ''])}
                className="text-sm font-bold text-blue-500 hover:text-blue-700 mb-6"
              >
                + Add Question
              </button>

              <div className="flex gap-3">
                <button onClick={() => setEditingDay(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={handleSaveQuestions} disabled={savingQuestions}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#0D2137' }}>
                  {savingQuestions ? 'Saving...' : 'Save Questions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
