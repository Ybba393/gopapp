'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const MISSION = 'To build a community of young leaders who celebrate diversity and are dedicated to the elimination of discrimination in metropolitan Detroit. Our efforts are guided by the belief that building relationships among youth of many cultures and ethnicities results in stronger relationships, an appreciation of individual differences, and creates a valuable corps of future leaders.'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [volunteerHours, setVolunteerHours] = useState(0)
  const [daysAttended, setDaysAttended] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const [group, setGroup] = useState<any>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, cohort:cohorts(name)')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const [{ data: logs }, { data: att }, { count: total }] = await Promise.all([
        supabase.from('volunteer_logs').select('hours').eq('student_id', user.id),
        supabase.from('attendance').select('id').eq('student_id', user.id).eq('status', 'present'),
        supabase.from('program_days').select('id', { count: 'exact', head: true }).eq('cohort_id', prof?.cohort_id),
      ])

      setVolunteerHours((logs ?? []).reduce((s: number, l: any) => s + Number(l.hours), 0))
      setDaysAttended((att ?? []).length)
      setTotalDays(total ?? 0)

      const { data: memberRow } = await supabase
        .from('group_members')
        .select('group_id, group:capstone_groups(*)')
        .eq('student_id', user.id)
        .single()

      if (memberRow?.group) {
        setGroup(memberRow.group)
        const { data: members } = await supabase
          .from('group_members')
          .select('profile:profiles(id, name)')
          .eq('group_id', (memberRow.group as any).id)
        setGroupMembers((members ?? []).map((m: any) => m.profile).filter(Boolean))
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Student'
  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: '#0D2137' }}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D4A853' }}>
              {profile?.cohort?.name ?? 'GENERATION OF PROMISE'}
            </p>
            <h1 className="text-2xl font-black text-white">Welcome back, {firstName} 👋</h1>
          </div>
          <button onClick={handleSignOut}
            className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm"
            style={{ background: '#D4A853', color: '#0D2137' }}>
            {initials}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Reminder */}
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
          <span className="text-yellow-600 text-lg">⚠️</span>
          <p className="text-sm text-yellow-800 font-medium">
            You may only miss <strong>1 program day</strong>.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg" style={{ background: '#FEF3C7' }}>⏱️</div>
            <p className="text-3xl font-black" style={{ color: '#0D2137' }}>{loading ? '—' : volunteerHours}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Volunteer Hours</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg" style={{ background: '#EEF3FA' }}>📅</div>
            <p className="text-3xl font-black" style={{ color: '#0D2137' }}>{loading ? '—' : `${daysAttended}/${totalDays}`}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Days Attended</p>
          </div>
        </div>

        {/* Capstone Group */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">👥</span>
            <h2 className="font-black text-base" style={{ color: '#0D2137' }}>Capstone Group</h2>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : group ? (
            <>
              <p className="text-xl font-black mb-3" style={{ color: '#0D2137' }}>{group.name}</p>
              <div className="space-y-2">
                {groupMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: '#EEF3FA', color: '#0D2137' }}>
                      {m.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{m.name}{m.id === userId ? '  (you)' : ''}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">You haven't been assigned to a group yet.</p>
          )}
        </div>

        {/* Mission */}
        <div className="rounded-2xl p-5" style={{ background: '#0D2137' }}>
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#D4A853' }}>OUR MISSION</p>
          <p className="text-white/80 text-sm leading-relaxed italic">{MISSION}</p>
          <p className="text-right text-xs font-semibold mt-3" style={{ color: '#D4A853' }}>— Generation of Promise</p>
        </div>
      </div>
    </div>
  )
}
