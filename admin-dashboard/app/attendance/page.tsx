'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface ProgramDay {
  id: string
  title: string
  date: string
  sort_order: number
}

interface CheckIn {
  id: string
  student_id: string
  checked_in_at: string
  status: string
  profiles: { name: string; email: string } | null
}

interface RosterStudent {
  id: string
  name: string
  email: string
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  }) + ' at ' + formatTime(ts)
}

export default function AttendancePage() {
  const supabase = createClient()
  const [programDays, setProgramDays] = useState<ProgramDay[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCheckIns, setLoadingCheckIns] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: days } = await supabase
        .from('program_days')
        .select('id, title, date, sort_order')
        .order('sort_order')

      const { data: roster } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'student')
        .order('name')

      setProgramDays(days ?? [])
      setRosterStudents(roster ?? [])

      if (days && days.length > 0) {
        setSelectedDay(days[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedDay) return
    setLoadingCheckIns(true)
    supabase
      .from('attendance')
      .select('*, profiles(name, email)')
      .eq('program_day_id', selectedDay)
      .order('checked_in_at')
      .then(({ data }) => {
        setCheckIns((data ?? []) as any)
        setLoadingCheckIns(false)
      })
  }, [selectedDay])

  const activeDay = programDays.find((d) => d.id === selectedDay)
  const checkedInIds = new Set(checkIns.map((c) => c.student_id))
  const notCheckedIn = rosterStudents.filter((s) => !checkedInIds.has(s.id))

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Attendance</h1>
          <p className="text-gray-500 mt-1 text-sm">See who checked in for each program day and when.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : programDays.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-semibold text-gray-400">No program days yet</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Day sidebar */}
            <div className="w-56 flex-shrink-0 space-y-2">
              {programDays.map((day) => {
                const isActive = selectedDay === day.id
                const dayDate = new Date(day.date + 'T12:00:00')
                return (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDay(day.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive ? 'text-white' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: '#0D2137' } : {}}
                  >
                    <div className="font-bold truncate">{day.title}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                      {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Main panel */}
            <div className="flex-1 min-w-0">
              {activeDay && (
                <>
                  <div className="mb-5">
                    <h2 className="text-lg font-black" style={{ color: '#0D2137' }}>{activeDay.title}</h2>
                    <p className="text-sm text-gray-400">{formatDate(activeDay.date)}</p>
                  </div>

                  {/* Summary bar */}
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 px-5 py-4 text-center">
                      <div className="text-3xl font-black" style={{ color: '#0D2137' }}>
                        {loadingCheckIns ? '—' : checkIns.length}
                      </div>
                      <div className="text-xs font-semibold text-gray-400 mt-1">Checked In</div>
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 px-5 py-4 text-center">
                      <div className="text-3xl font-black text-red-400">
                        {loadingCheckIns ? '—' : notCheckedIn.length}
                      </div>
                      <div className="text-xs font-semibold text-gray-400 mt-1">Absent</div>
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 px-5 py-4 text-center">
                      <div className="text-3xl font-black text-gray-300">
                        {rosterStudents.length}
                      </div>
                      <div className="text-xs font-semibold text-gray-400 mt-1">Total Students</div>
                    </div>
                  </div>

                  {loadingCheckIns ? (
                    <div className="text-center py-12 text-gray-400">Loading...</div>
                  ) : (
                    <div className="space-y-4">
                      {/* Present */}
                      {checkIns.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                          <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                              Present — {checkIns.length}
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-50">
                                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400">STUDENT</th>
                                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400">EMAIL</th>
                                <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400">CHECK-IN TIME</th>
                              </tr>
                            </thead>
                            <tbody>
                              {checkIns.map((c) => (
                                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                                  <td className="px-5 py-3 font-semibold text-gray-800">
                                    {c.profiles?.name ?? '—'}
                                  </td>
                                  <td className="px-5 py-3 text-gray-400 text-xs">
                                    {c.profiles?.email}
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                                      🕐 {formatTime(c.checked_in_at)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Absent */}
                      {notCheckedIn.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                          <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                              Not Checked In — {notCheckedIn.length}
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            <tbody>
                              {notCheckedIn.map((s) => (
                                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                                  <td className="px-5 py-3 font-semibold text-gray-500">{s.name}</td>
                                  <td className="px-5 py-3 text-gray-300 text-xs">{s.email}</td>
                                  <td className="px-5 py-3 text-right">
                                    <span className="text-xs text-gray-300 font-semibold">—</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {checkIns.length === 0 && notCheckedIn.length === 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                          No students on roster yet.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
