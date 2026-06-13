'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface RosterEntry {
  id: string
  email: string
  name: string
  cohort_id: string | null
  is_admin: boolean
  created_at: string
  cohort?: { name: string } | null
}

interface Cohort {
  id: string
  name: string
  year: string
}

export default function StudentsPage() {
  const supabase = createClient()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [admins, setAdmins] = useState<RosterEntry[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)

  // Add student form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCohortId, setNewCohortId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Add admin form
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')

  async function loadData() {
    const [{ data: studentData }, { data: adminData }, { data: cohortData }] = await Promise.all([
      supabase.from('roster').select('*, cohort:cohorts(name)').eq('is_admin', false).order('name'),
      supabase.from('roster').select('*, cohort:cohorts(name)').eq('is_admin', true).order('name'),
      supabase.from('cohorts').select('*').order('year', { ascending: false }),
    ])
    setRoster(studentData ?? [])
    setAdmins(adminData ?? [])
    setCohorts(cohortData ?? [])
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function handleAddStudent() {
    if (!newName.trim() || !newEmail.trim() || !newCohortId) {
      setAddError('Please fill in all fields.')
      return
    }
    setAdding(true)
    setAddError('')
    const { error } = await supabase.from('roster').insert({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      cohort_id: newCohortId,
      is_admin: false,
    })
    setAdding(false)
    if (error) {
      setAddError(error.message.includes('unique') ? 'This email is already on the roster.' : error.message)
      return
    }
    setShowAddModal(false)
    setNewName(''); setNewEmail(''); setNewCohortId('')
    await loadData()
  }

  async function handleAddAdmin() {
    if (!adminName.trim() || !adminEmail.trim()) {
      setAddAdminError('Please fill in all fields.')
      return
    }
    setAddingAdmin(true)
    setAddAdminError('')
    const { error } = await supabase.from('roster').insert({
      name: adminName.trim(),
      email: adminEmail.trim().toLowerCase(),
      is_admin: true,
    })
    setAddingAdmin(false)
    if (error) {
      setAddAdminError(error.message.includes('unique') ? 'This email is already on the roster.' : error.message)
      return
    }
    setShowAddAdminModal(false)
    setAdminName(''); setAdminEmail('')
    await loadData()
  }

  async function handleRemoveAdmin(entry: RosterEntry) {
    if (!confirm(`Delete admin account for ${entry.name}? This cannot be undone.`)) return
    await supabase.from('roster').delete().eq('id', entry.id)
    await supabase.from('profiles').update({ role: 'student' }).eq('email', entry.email)
    await loadData()
  }

  async function handleRemoveStudent(id: string) {
    if (!confirm('Remove this student from the roster? They will not be able to sign up.')) return
    await supabase.from('roster').delete().eq('id', id)
    await loadData()
  }

  const filtered = roster.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="p-8">

        {/* ── Admins section ── */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-black" style={{ color: '#0D2137' }}>Admins</h2>
              <p className="text-gray-400 text-xs mt-0.5">Can access this dashboard</p>
            </div>
            <button
              onClick={() => { setAddAdminError(''); setShowAddAdminModal(true) }}
              className="px-4 py-2 rounded-xl font-bold text-sm border-2 text-yellow-700 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 transition-colors"
            >
              + Add Admin
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : admins.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No admins yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">NAME</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">EMAIL</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {admins.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3 font-semibold text-gray-800">
                        {entry.name}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-bold">Admin</span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{entry.email}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleRemoveAdmin(entry)}
                          className="text-xs text-gray-400 hover:text-red-500 font-semibold"
                        >
                          Remove Admin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Students section ── */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Student Roster</h1>
            <p className="text-gray-500 mt-1 text-sm">Only students on this roster can sign up.</p>
          </div>
          <button
            onClick={() => { setAddError(''); setShowAddModal(true) }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: '#0D2137' }}
          >
            + Add Student
          </button>
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
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">NAME</th>
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">EMAIL</th>
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">COHORT</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      {search ? 'No students match your search.' : 'No students on the roster yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-800">{entry.name}</td>
                      <td className="px-6 py-4 text-gray-500">{entry.email}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {(entry.cohort as any)?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveStudent(entry.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>Add Student to Roster</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">FULL NAME</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Student's full name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">EMAIL</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="student@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT</label>
                  <select value={newCohortId} onChange={(e) => setNewCohortId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400">
                    <option value="">Select a cohort...</option>
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {addError && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{addError}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={handleAddStudent} disabled={adding}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#0D2137' }}>
                  {adding ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Admin Modal */}
        {showAddAdminModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl">
              <h2 className="text-xl font-black mb-2" style={{ color: '#0D2137' }}>Add Admin</h2>
              <p className="text-gray-500 text-sm mb-6">This person will be able to log into the admin dashboard.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">FULL NAME</label>
                  <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Mrs. Sykes"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">EMAIL</label>
                  <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                {addAdminError && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{addAdminError}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button onClick={handleAddAdmin} disabled={addingAdmin}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-yellow-800"
                  style={{ backgroundColor: '#D4A853' }}>
                  {addingAdmin ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
