'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Group {
  id: string
  name: string
  cohort_id: string
  cohortName?: string
  members: Array<{ student_id: string; name: string; email: string }>
}

interface Profile {
  id: string
  name: string
  email: string
  cohort_id: string | null
}

interface Cohort {
  id: string
  name: string
  year: string
  is_active: boolean
}

export default function GroupsPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [activeCohortId, setActiveCohortId] = useState('')
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCohort, setNewGroupCohort] = useState('')
  const [creating, setCreating] = useState(false)

  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function loadData() {
    // Load cohorts and profiles separately for reliability
    const [{ data: cohortData }, { data: profileData }, { data: groupData }, { data: memberData }] =
      await Promise.all([
        supabase.from('cohorts').select('*').order('year', { ascending: false }),
        supabase.from('profiles').select('id, name, email, cohort_id').eq('role', 'student').order('name'),
        supabase.from('capstone_groups').select('id, name, cohort_id').order('name'),
        supabase
          .from('group_members')
          .select('group_id, student_id, profiles(name, email)'),
      ])

    setCohorts(cohortData ?? [])
    setProfiles(profileData ?? [])

    const active = (cohortData ?? []).find((c: Cohort) => c.is_active)
    if (active) {
      setActiveCohortId(active.id)
      setNewGroupCohort(active.id)
    }

    // Build groups with members merged in
    const cohortMap = Object.fromEntries((cohortData ?? []).map((c: Cohort) => [c.id, c.name]))
    const merged: Group[] = (groupData ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      cohort_id: g.cohort_id,
      cohortName: cohortMap[g.cohort_id] ?? '',
      members: (memberData ?? [])
        .filter((m: any) => m.group_id === g.id)
        .map((m: any) => ({
          student_id: m.student_id,
          name: (m.profiles as any)?.name ?? 'Unknown',
          email: (m.profiles as any)?.email ?? '',
        })),
    }))
    setGroups(merged)
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function handleCreateGroup() {
    if (!newGroupName.trim() || !newGroupCohort) return
    setCreating(true)
    await supabase.from('capstone_groups').insert({ name: newGroupName.trim(), cohort_id: newGroupCohort })
    setCreating(false)
    setNewGroupName('')
    setShowCreate(false)
    await loadData()
  }

  async function handleAssign() {
    if (!assignGroupId || !assignStudentId) { setAssignError('Select both a group and a student.'); return }
    setAssigning(true)
    setAssignError('')
    const { error } = await supabase.from('group_members').upsert(
      { student_id: assignStudentId, group_id: assignGroupId },
      { onConflict: 'student_id' }
    )
    setAssigning(false)
    if (error) { setAssignError(error.message); return }
    setAssignGroupId('')
    setAssignStudentId('')
    await loadData()
  }

  async function handleRemoveMember(studentId: string) {
    await supabase.from('group_members').delete().eq('student_id', studentId)
    await loadData()
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Delete this group? Members will be unassigned.')) return
    await supabase.from('capstone_groups').delete().eq('id', groupId)
    await loadData()
  }

  async function handleSaveEdit(groupId: string) {
    if (!editName.trim()) return
    await supabase.from('capstone_groups').update({ name: editName.trim() }).eq('id', groupId)
    setEditingId(null)
    await loadData()
  }

  const assignedStudentIds = new Set(groups.flatMap((g) => g.members.map((m) => m.student_id)))
  const unassignedStudents = profiles.filter(
    (p) => !assignedStudentIds.has(p.id) && p.cohort_id === activeCohortId
  )
  const activeGroups = groups.filter((g) => g.cohort_id === activeCohortId)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Capstone Groups</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {activeGroups.length} group{activeGroups.length !== 1 ? 's' : ''} · {unassignedStudents.length} student{unassignedStudents.length !== 1 ? 's' : ''} unassigned
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: '#0D2137' }}
          >
            + New Group
          </button>
        </div>

        {/* Assign panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-base mb-4" style={{ color: '#0D2137' }}>Assign Student to Group</h2>
          <div className="flex gap-3 flex-wrap">
            <select value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-40 focus:outline-none focus:border-blue-400">
              <option value="">Select student...</option>
              {unassignedStudents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-40 focus:outline-none focus:border-blue-400">
              <option value="">Select group...</option>
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button onClick={handleAssign} disabled={assigning}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: '#1565C0' }}>
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
          {assignError && <p className="text-red-500 text-sm mt-2">{assignError}</p>}
        </div>

        {/* Groups grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : activeGroups.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <div className="text-5xl mb-4">🎯</div>
            <p className="font-semibold text-gray-400">No groups yet</p>
            <p className="text-sm mt-1">Click "+ New Group" to create the first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                {editingId === group.id ? (
                  <div className="flex gap-2 mb-3">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                    <button onClick={() => handleSaveEdit(group.id)} className="text-xs font-bold text-blue-600">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-base" style={{ color: '#0D2137' }}>{group.name}</h3>
                    <button onClick={() => { setEditingId(group.id); setEditName(group.name) }}
                      className="text-xs text-gray-400 hover:text-gray-600">✏️</button>
                  </div>
                )}

                <p className="text-xs text-gray-400 mb-3">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </p>

                <div className="space-y-1.5 mb-4">
                  {group.members.length === 0 ? (
                    <p className="text-xs text-gray-300 italic py-2">No members assigned yet</p>
                  ) : (
                    group.members.map((m) => (
                      <div key={m.student_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">{m.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                        </div>
                        <button onClick={() => handleRemoveMember(m.student_id)}
                          className="text-xs text-red-400 hover:text-red-600 ml-2">✕</button>
                      </div>
                    ))
                  )}
                </div>

                <button onClick={() => handleDeleteGroup(group.id)}
                  className="text-xs text-red-300 hover:text-red-500 font-semibold">
                  Delete Group
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>New Capstone Group</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">GROUP NAME</label>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. The Changemakers"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT</label>
                  <select value={newGroupCohort} onChange={(e) => setNewGroupCohort(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400">
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={handleCreateGroup} disabled={creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#0D2137' }}>
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
