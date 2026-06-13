'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Cohort {
  id: string
  name: string
  year: string
  is_active: boolean
  created_at: string
}

export default function CohortsPage() {
  const supabase = createClient()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newYear, setNewYear] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadData() {
    const { data } = await supabase.from('cohorts').select('*').order('year', { ascending: false })
    setCohorts(data ?? [])
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!newName.trim() || !newYear.trim()) return
    setCreating(true)
    await supabase.from('cohorts').insert({ name: newName.trim(), year: newYear.trim(), is_active: false })
    setCreating(false)
    setNewName('')
    setNewYear('')
    setShowCreate(false)
    await loadData()
  }

  async function handleSetActive(id: string) {
    // Deactivate all, then activate chosen
    await supabase.from('cohorts').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('cohorts').update({ is_active: true }).eq('id', id)
    await loadData()
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Cohorts</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Create a new cohort each year. Students are linked to a cohort when added to the roster.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: '#0D2137' }}
          >
            + New Cohort
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            cohorts.map((cohort) => (
              <div key={cohort.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-lg" style={{ color: '#0D2137' }}>{cohort.name}</h3>
                    {cohort.is_active && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">Year: {cohort.year}</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Created {new Date(cohort.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!cohort.is_active && (
                  <button
                    onClick={() => handleSetActive(cohort.id)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Set as Active
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-xl">
              <h2 className="text-xl font-black mb-6" style={{ color: '#0D2137' }}>New Cohort</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">COHORT NAME</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 2027–2028 Cohort"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">YEAR</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="e.g. 2027-2028"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#0D2137' }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
