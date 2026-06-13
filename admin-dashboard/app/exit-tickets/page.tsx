'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Response {
  id: string
  submitted_at: string
  responses: Record<string, any>
  profile: { name: string; email: string } | null
  program_day: { title: string; date: string } | null
}

const RATING_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' }

export default function ExitTicketsPage() {
  const supabase = createClient()
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Response | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('exit_ticket_responses')
      .select('*, profile:profiles(name, email), program_day:program_days(title, date)')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setResponses(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = responses.filter(
    (r) =>
      (r.profile?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.profile?.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Exit Tickets</h1>
          <p className="text-gray-500 mt-1 text-sm">View all student exit ticket submissions.</p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">STUDENT</th>
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">PROGRAM DAY</th>
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">OVERALL RATING</th>
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">SUBMITTED</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No exit tickets submitted yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{r.profile?.name ?? '—'}</div>
                        <div className="text-xs text-gray-400">{r.profile?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{r.program_day?.title ?? '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-400">{'★'.repeat(r.responses.overall_rating ?? 0)}</span>
                          <span className="text-gray-300">{'★'.repeat(5 - (r.responses.overall_rating ?? 0))}</span>
                          <span className="text-xs text-gray-400 ml-1">
                            {RATING_LABELS[r.responses.overall_rating] ?? ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelected(r)}
                          className="text-xs font-semibold text-blue-500 hover:text-blue-700"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto pt-12">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl mb-8">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black" style={{ color: '#0D2137' }}>
                    {selected.profile?.name}
                  </h2>
                  <p className="text-sm text-gray-400">{selected.program_day?.title} · {selected.profile?.email}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="p-6 space-y-6 text-sm">
                {/* Ratings */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Breakfast', val: selected.responses.breakfast_rating },
                    { label: 'Lunch', val: selected.responses.lunch_rating },
                    { label: 'Overall', val: selected.responses.overall_rating },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-yellow-400">{item.val}/5</div>
                      <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Enjoyed aspects */}
                {selected.responses.enjoyed_aspects?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-2">Enjoyed Most</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.responses.enjoyed_aspects.map((a: string) => (
                        <span key={a} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Better understanding */}
                <div>
                  <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-1">Better Understanding of Identity/Culture/Power?</div>
                  <div className="text-gray-700 font-medium">
                    {{ yes: 'Yes, definitely', somewhat: 'Somewhat', not_yet: 'Not yet' }[selected.responses.better_understanding as string] ?? '—'}
                  </div>
                </div>

                {/* Takeaways */}
                <div>
                  <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-1">Major Takeaways</div>
                  <div className="text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{selected.responses.major_takeaways || '—'}</div>
                </div>

                {/* Comments */}
                {selected.responses.additional_comments && (
                  <div>
                    <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-1">Additional Comments</div>
                    <div className="text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{selected.responses.additional_comments}</div>
                  </div>
                )}

                {/* Critical issues */}
                {selected.responses.critical_issues?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-2">Top Critical Issues</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.responses.critical_issues.map((issue: string) => (
                        <span key={issue} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">{issue}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
