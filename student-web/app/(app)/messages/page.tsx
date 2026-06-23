'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Message {
  id: string
  content: string
  reply: string | null
  replied_at: string | null
  created_at: string
}

interface Announcement {
  id: string
  content: string
  created_at: string
}

function formatDateTime(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesPage() {
  const [tab, setTab] = useState<'messages' | 'announcements'>('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: msgs }, { data: ann }] = await Promise.all([
      supabase.from('messages').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    ])
    setMessages(msgs ?? [])
    setAnnouncements(ann ?? [])
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSendError('')
    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    const { error } = await supabase.from('messages').insert({
      student_id: user.id,
      content: newMessage.trim(),
    })
    setSending(false)
    if (error) { setSendError('Failed to send. Please try again.'); return }
    setNewMessage('')
    await loadData()
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex-shrink-0" style={{ background: '#0D2137' }}>
        <h1 className="text-2xl font-black text-white mb-4">Messages</h1>
        {/* Tabs */}
        <div className="flex gap-2">
          {(['messages', 'announcements'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={tab === t
                ? { background: '#D4A853', borderColor: '#D4A853', color: '#0D2137' }
                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)' }}>
              {t === 'messages' ? 'My Messages' : (
                <span className="flex items-center gap-1.5">
                  Announcements
                  {announcements.length > 0 && (
                    <span className="bg-white/20 text-white rounded-full px-1.5 py-0.5 text-xs">{announcements.length}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : tab === 'messages' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Compose box */}
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm flex-shrink-0">
            <form onSubmit={handleSend}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask Mrs. Sykes a question..."
                rows={3}
                maxLength={500}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none mb-3"
                style={{ color: '#0D2137' }}
              />
              {sendError && <p className="text-red-500 text-xs mb-2">{sendError}</p>}
              <button type="submit" disabled={!newMessage.trim() || sending}
                className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-50"
                style={{ background: '#D4A853', color: '#0D2137' }}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Message history */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-bold text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Send a question above and Mrs. Sykes will reply here.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* Student bubble */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-br-sm px-4 py-3 max-w-xs" style={{ background: '#0D2137' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#D4A853' }}>You</p>
                      <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                      <p className="text-white/40 text-xs mt-1 text-right">{formatDateTime(msg.created_at)}</p>
                    </div>
                  </div>
                  {/* Reply bubble */}
                  {msg.reply ? (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs shadow-sm border border-gray-100">
                        <p className="text-xs font-bold mb-1" style={{ color: '#D4A853' }}>Mrs. Sykes</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#0D2137' }}>{msg.reply}</p>
                        {msg.replied_at && <p className="text-gray-400 text-xs mt-1">{formatDateTime(msg.replied_at)}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700">⏳ Awaiting reply</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Announcements tab */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📣</p>
              <p className="font-bold text-gray-500">No announcements yet</p>
              <p className="text-sm text-gray-400 mt-1">Mrs. Sykes will post announcements here for your cohort.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: '#D4A853' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold" style={{ color: '#D4A853' }}>📣 Mrs. Sykes</span>
                  <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#0D2137' }}>{ann.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
