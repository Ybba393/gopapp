'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Group {
  id: string
  name: string
  cohort_id: string
  cohort?: { name: string }
  members?: Array<{ student_id: string; profile: { name: string; email: string } | null }>
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

  // Create group form
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCohort, setNewGroupCohort] = useState('')
  const [creating, setCreating] = useState(false)

  // Assign student form
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Edit name
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function loadData() {
    const [{ data: cohortData }, { data: profileData }] = await Promise.all([
      supabase.from('cohorts').select('*').order('year', { ascending: false }),
      supabase.from('profiles').select('id, name, email, cohort_id').eq('role', 'student').order('name'),
    ])
    setCohorts(cohortData ?? [])
    setProfiles(profileData ?? [])
    const active = (cohortData ?? []).find((c: Cohort) => c.is_active)
    if (active) { setActiveCohortId(active.id); setNewGroupCohort(active.id) }

    const { data: groupData } = await supabase
      .from('capstone_groups')
      .select('*, cohort:cohorts(name), members:group_members(student_id, profile:profiles(name, email))')
      .order('name')
    setGroups(groupData ?? [])
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

  // Students not yet in a group (for this active cohort)
  const assignedStudentIds = new Set(groups.flatMap((g) => (g.members ?? []).map((m) => m.student_id)))
  const unassignedStudents = profiles.filter(
    (p) => !assignedStudentIds.has(p.id) && p.cohort_id === activeCohortId
  )

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Capstone Groups</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Create groups and assign students. Students can edit their group name in the app.
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

        {/* Assign student panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-base mb-4" style={{ color: '#0D2137' }}>Assign a Student to a Group</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-40 focus:outline-none focus:border-blue-400"
            >
              <option value="">Select student...</option>
              {unassignedStudents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={assignGroupId}
              onChange={(e) => setAssignGroupId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-40 focus:outline-none focus:border-blue-400"
            >
              <option value="">Select group...</option>
              {groups.filter((g) => g.cohort_id === activeCohortId).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={assigning}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: '#1565C0' }}
            >
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
          {assignError && <p className="text-red-500 text-sm mt-2">{assignError}</p>}
          {unassignedStudents.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">{unassignedStudents.length} student(s) not yet assigned</p>
          )}
        </div>

        {/* Groups grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                {/* Group name */}
                {editingId === group.id ? (
                  <div className="flex gap-2 mb-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <button onClick={() => handleSaveEdit(group.id)} className="text-xs font-bold text-blue-600">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: '#0D2137' }}>{group.name}</h3>
                    <button
                      onClick={() => { setEditingId(group.id); setEditName(group.name) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✏️ Rename
                    </button>
                  </div>
                )}

                <div className="text-xs text-gray-400 mb-3">
                  {(group.cohort as any)?.name} · {(group.members ?? []).length} member(s)
                </div>

                {/* Members */}
                <div className="space-y-1.5">
                  {(group.members ?? []).length === 0 ? (
                    <p className="text-xs text-gray-300 italic">No members yet</p>
                  ) : (
                    (group.members ?? []).map((m) => (
                      <div key={m.student_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">
                            {(m.profile as any)?.name ?? 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {(m.profile as any)?.email}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.student_id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="mt-4 text-xs text-red-300 hover:text-red-500 font-semibold"
                >
                  Delete Group
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create group modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>New Capstone Group</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">GROUP NAME</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. The Changemakers"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT</label>
                  <select
                    value={newGroupCohort}
                    onChange={(e) => setNewGroupCohort(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  >
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#0D2137' }}
                >
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
