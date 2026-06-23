'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Stats {
  studentCount: number
  groupCount: number
  rosterCount: number
  attendanceCount: number
  activeCohort: { name: string } | null
  recentLogs: Array<{ project_name: string; hours: number; created_at: string; profiles: { name: string } | null }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
        if (profile?.name) setAdminName(profile.name.split(' ')[0])
      }

      const [
        { count: studentCount },
        { count: groupCount },
        { count: attendanceCount },
        { data: cohorts },
        { data: recentLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('capstone_groups').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present'),
        supabase.from('cohorts').select('*').eq('is_active', true).limit(1),
        supabase
          .from('volunteer_logs')
          .select('project_name, hours, created_at, profiles(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const activeCohortId = cohorts?.[0]?.id
      const { count: rosterCount } = activeCohortId
        ? await supabase
            .from('roster')
            .select('*', { count: 'exact', head: true })
            .eq('cohort_id', activeCohortId)
            .eq('is_admin', false)
        : { count: 0 }

      setStats({
        studentCount: studentCount ?? 0,
        groupCount: groupCount ?? 0,
        attendanceCount: attendanceCount ?? 0,
        rosterCount: rosterCount ?? 0,
        activeCohort: cohorts?.[0] ?? null,
        recentLogs: (recentLogs ?? []) as any,
      })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Roster Size', value: stats?.rosterCount ?? 0, sub: 'approved students', color: 'bg-blue-50 text-blue-700', icon: '👥' },
    { label: 'Active Students', value: stats?.studentCount ?? 0, sub: 'accounts created', color: 'bg-emerald-50 text-emerald-700', icon: '✅' },
    { label: 'Capstone Groups', value: stats?.groupCount ?? 0, sub: 'groups formed', color: 'bg-amber-50 text-amber-700', icon: '🎯' },
    { label: 'Check-Ins', value: stats?.attendanceCount ?? 0, sub: 'total across all days', color: 'bg-violet-50 text-violet-700', icon: '📍' },
  ]

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          {stats?.activeCohort && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest text-yellow-700 bg-yellow-100 mb-3">
              {stats.activeCohort.name}
            </span>
          )}
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>
            Program Overview
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Welcome back, {adminName || 'Admin'}.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg mb-4 ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-4xl font-black" style={{ color: '#0D2137' }}>
                {loading ? '—' : card.value}
              </div>
              <div className="font-semibold text-sm mt-1" style={{ color: '#0D2137' }}>{card.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent volunteer logs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#0D2137' }}>
            Recent Volunteer Hour Submissions
          </h2>
          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">Loading...</p>
          ) : !stats?.recentLogs.length ? (
            <p className="text-gray-400 text-sm py-6 text-center">No submissions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400 font-semibold text-xs">STUDENT</th>
                  <th className="text-left py-2 text-gray-400 font-semibold text-xs">PROJECT</th>
                  <th className="text-right py-2 text-gray-400 font-semibold text-xs">HOURS</th>
                  <th className="text-right py-2 text-gray-400 font-semibold text-xs">DATE</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((log, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-800">{log.profiles?.name ?? '—'}</td>
                    <td className="py-3 text-gray-600">{log.project_name}</td>
                    <td className="py-3 text-right font-bold" style={{ color: '#D4A853' }}>{log.hours}h</td>
                    <td className="py-3 text-right text-gray-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
