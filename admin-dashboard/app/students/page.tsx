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
  profile?: { id: string; default_password_changed: boolean } | null
}

interface Cohort {
  id: string
  name: string
  year: string
}

export default function StudentsPage() {
  const supabase = createClient()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Add form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCohortId, setNewCohortId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  async function loadData() {
    const [{ data: rosterData }, { data: cohortData }] = await Promise.all([
      supabase
        .from('roster')
        .select('*, cohort:cohorts(name)')
        .eq('is_admin', false)
        .order('name'),
      supabase.from('cohorts').select('*').order('year', { ascending: false }),
    ])
    setRoster(rosterData ?? [])
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
    setNewName('')
    setNewEmail('')
    setNewCohortId('')
    await loadData()
  }

  async function handleRemove(id: string) {
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Student Roster</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Only students on this roster can sign up for the app.
            </p>
          </div>
          <button
            onClick={() => { setAddError(''); setShowAddModal(true) }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: '#0D2137' }}
          >
            + Add Student
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Table */}
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
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs">STATUS</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
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
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          On Roster
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemove(entry.id)}
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

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>Add Student to Roster</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">FULL NAME</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Student's full name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">EMAIL</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="student@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT</label>
                  <select
                    value={newCohortId}
                    onChange={(e) => setNewCohortId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select a cohort...</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {addError && (
                  <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{addError}</p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={adding}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#0D2137' }}
                >
                  {adding ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
