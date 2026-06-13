'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

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

interface StandaloneForm {
  id: string
  title: string
  description: string | null
  questions: Question[]
  sort_order: number
  is_active: boolean
}

interface FormResponse {
  id: string
  submitted_at: string
  responses: Record<string, any>
  respondent_id: string
  profiles: { name: string; email: string } | null
}

const TYPE_LABELS: Record<QuestionType, string> = {
  rating: '⭐ Star Rating (1–5)',
  text: '✏️ Short Answer',
  textarea: '📝 Long Answer',
  single: '🔘 Single Choice',
  multi: '☑️ Multiple Choice',
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
    const opts = (q.options ?? []).filter((_, idx) => idx !== i)
    onChange({ ...q, options: opts })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <select
          value={q.type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0D2137]"
        >
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={q.required !== false}
              onChange={(e) => onChange({ ...q, required: e.target.checked })}
              className="rounded"
            />
            Required
          </label>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            ✕ Remove
          </button>
        </div>
      </div>

      <textarea
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
        placeholder="Question text..."
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D2137] bg-gray-50"
      />

      {(q.type === 'single' || q.type === 'multi') && (
        <div className="mt-3 space-y-2">
          {q.type === 'multi' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Max selections (0 = unlimited):</span>
              <input
                type="number"
                min={0}
                value={q.maxSelect ?? 0}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  onChange({ ...q, maxSelect: v > 0 ? v : undefined })
                }}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
          )}
          {(q.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-400 text-sm w-5">{i + 1}.</span>
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D2137]"
              />
              <button
                onClick={() => removeOption(i)}
                className="text-gray-300 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="text-sm text-[#0D2137] hover:text-[#D4A853] font-medium"
          >
            + Add option
          </button>
        </div>
      )}
    </div>
  )
}

// ── Response detail modal ────────────────────────────────────────────────────

function ResponseDetail({ response, questions, onClose }: {
  response: FormResponse
  questions: Question[]
  onClose: () => void
}) {
  const answers = response.responses?.answers ?? response.responses ?? {}

  function renderAnswer(q: Question) {
    const val = answers[q.id]
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      return <span className="text-gray-400 italic">No answer</span>
    }
    if (q.type === 'rating') {
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Number(val) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
          ))}
          <span className="text-sm text-gray-500 ml-1">{val}/5</span>
        </div>
      )
    }
    if (q.type === 'multi') {
      const arr: string[] = Array.isArray(val) ? val : [val]
      return (
        <div className="flex flex-wrap gap-1.5">
          {arr.map((v, i) => (
            <span key={i} className="bg-[#EEF3FA] text-[#0D2137] text-xs px-2 py-1 rounded-full font-medium">{v}</span>
          ))}
        </div>
      )
    }
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(val)}</p>
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <p className="font-bold text-[#0D2137] text-lg">{response.profiles?.name ?? 'Unknown'}</p>
            <p className="text-sm text-gray-500">{response.profiles?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Submitted {new Date(response.submitted_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6">
          {questions.map((q, i) => (
            <div key={q.id}>
              <p className="text-xs font-bold text-[#D4A853] uppercase tracking-wide mb-1">Q{i + 1}</p>
              <p className="text-sm font-semibold text-[#0D2137] mb-2">{q.text}</p>
              {renderAnswer(q)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const supabase = createClient()

  const [forms, setForms] = useState<StandaloneForm[]>([])
  const [activeFormId, setActiveFormId] = useState<string | null>(null)
  const [tab, setTab] = useState<'responses' | 'edit'>('responses')
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null)
  const [editQuestions, setEditQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const activeForm = forms.find((f) => f.id === activeFormId) ?? null

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('standalone_forms')
        .select('*')
        .order('sort_order', { ascending: true })
      if (data) {
        setForms(data)
        if (data.length > 0) setActiveFormId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeFormId) return
    setResponses([])
    loadResponses(activeFormId)
    const form = forms.find((f) => f.id === activeFormId)
    if (form) setEditQuestions(JSON.parse(JSON.stringify(form.questions)))
  }, [activeFormId])

  async function loadResponses(formId: string) {
    const { data } = await supabase
      .from('form_responses')
      .select('*, profiles(name, email)')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })
    setResponses(data ?? [])
  }

  async function saveQuestions() {
    if (!activeFormId) return
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase
      .from('standalone_forms')
      .update({ questions: editQuestions })
      .eq('id', activeFormId)
    setSaving(false)
    if (error) {
      setSaveMsg('❌ Error: ' + error.message)
    } else {
      setSaveMsg('✅ Saved!')
      setForms((prev) =>
        prev.map((f) => f.id === activeFormId ? { ...f, questions: editQuestions } : f)
      )
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  function addQuestion() {
    setEditQuestions((prev) => [...prev, newQuestion()])
  }

  function updateQuestion(idx: number, updated: Question) {
    setEditQuestions((prev) => prev.map((q, i) => i === idx ? updated : q))
  }

  function deleteQuestion(idx: number) {
    setEditQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const arr = [...editQuestions]
    const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setEditQuestions(arr)
  }

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Standalone Forms</h2>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-400">Loading…</div>
          ) : forms.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No forms found. Run <code className="bg-gray-100 px-1 rounded">standalone_forms_schema.sql</code> in Supabase.</div>
          ) : (
            <ul>
              {forms.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => { setActiveFormId(f.id); setTab('responses') }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeFormId === f.id ? 'bg-[#EEF3FA] border-l-4 border-l-[#0D2137]' : ''}`}
                  >
                    <p className={`text-sm font-semibold leading-tight ${activeFormId === f.id ? 'text-[#0D2137]' : 'text-gray-800'}`}>
                      {f.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.questions?.length ?? 0} questions
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {!activeForm ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a form
            </div>
          ) : (
            <>
              {/* Form header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-[#0D2137]">{activeForm.title}</h1>
                {activeForm.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{activeForm.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setTab('responses')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'responses' ? 'bg-[#0D2137] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Responses ({responses.length})
                  </button>
                  <button
                    onClick={() => setTab('edit')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'edit' ? 'bg-[#0D2137] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Edit Questions
                  </button>
                </div>
              </div>

              {/* Responses tab */}
              {tab === 'responses' && (
                <div className="p-6">
                  {responses.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="font-semibold">No responses yet</p>
                      <p className="text-sm mt-1">Responses will appear here once students submit.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {responses.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-[#0D2137]">{r.profiles?.name ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-500">{r.profiles?.email ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-500">
                                {new Date(r.submitted_at).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setSelectedResponse(r)}
                                  className="text-[#0D2137] font-semibold hover:text-[#D4A853] transition-colors text-sm"
                                >
                                  View →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Questions tab */}
              {tab === 'edit' && (
                <div className="p-6 space-y-4 max-w-3xl">
                  {editQuestions.map((q, idx) => (
                    <div key={q.id} className="flex gap-2">
                      <div className="flex flex-col gap-1 pt-3">
                        <button
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={idx === 0}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                          title="Move up"
                        >▲</button>
                        <span className="text-xs text-gray-400 text-center">{idx + 1}</span>
                        <button
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={idx === editQuestions.length - 1}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                          title="Move down"
                        >▼</button>
                      </div>
                      <div className="flex-1">
                        <QuestionEditor
                          q={q}
                          onChange={(updated) => updateQuestion(idx, updated)}
                          onDelete={() => deleteQuestion(idx)}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addQuestion}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-[#D4A853] hover:text-[#D4A853] transition-colors font-semibold"
                  >
                    + Add Question
                  </button>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      onClick={saveQuestions}
                      disabled={saving}
                      className="bg-[#0D2137] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a3a5c] transition-colors disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Save Questions'}
                    </button>
                    {saveMsg && (
                      <span className={`text-sm font-medium ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedResponse && activeForm && (
        <ResponseDetail
          response={selectedResponse}
          questions={activeForm.questions}
          onClose={() => setSelectedResponse(null)}
        />
      )}
    </AdminLayout>
  )
}
