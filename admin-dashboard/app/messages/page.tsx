'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { createClient } from '@/lib/supabase-client'

interface Message {
  id: string
  content: string
  reply: string | null
  replied_at: string | null
  created_at: string
  profiles: { name: string; email: string } | null
}

interface Announcement {
  id: string
  content: string
  created_at: string
  cohort_id: string | null
  cohorts: { name: string } | null
}

interface Cohort { id: string; name: string }

export default function MessagesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'messages' | 'announcements'>('messages')

  // Student messages
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [announcementText, setAnnouncementText] = useState('')
  const [selectedCohort, setSelectedCohort] = useState<string>('all')
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })
    setMessages((data ?? []) as any)
    setLoadingMessages(false)
  }

  async function loadAnnouncements() {
    const [{ data: ann }, { data: coh }] = await Promise.all([
      supabase.from('announcements').select('*, cohorts(name)').order('created_at', { ascending: false }),
      supabase.from('cohorts').select('id, name').order('year', { ascending: false }),
    ])
    setAnnouncements((ann ?? []) as any)
    setCohorts(coh ?? [])
    setLoadingAnnouncements(false)
  }

  useEffect(() => {
    loadMessages()
    loadAnnouncements()
  }, [])

  async function handleReply(messageId: string) {
    if (!replyText.trim()) return
    setSending(true)
    await supabase
      .from('messages')
      .update({ reply: replyText.trim(), replied_at: new Date().toISOString() })
      .eq('id', messageId)
    setSending(false)
    setReplyingId(null)
    setReplyText('')
    await loadMessages()
  }

  async function handleSendAnnouncement() {
    if (!announcementText.trim()) return
    setSendingAnnouncement(true)
    await supabase.from('announcements').insert({
      content: announcementText.trim(),
      cohort_id: selectedCohort === 'all' ? null : selectedCohort,
    })
    setAnnouncementText('')
    setSendingAnnouncement(false)
    await loadAnnouncements()
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    await loadAnnouncements()
  }

  const unread = messages.filter((m) => !m.reply)
  const replied = messages.filter((m) => m.reply)

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black" style={{ color: '#0D2137' }}>Messages</h1>
          <p className="text-gray-500 mt-1 text-sm">Reply to student questions or send announcements to cohorts.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-7 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('messages')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'messages' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            Student Messages {unread.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unread.length}</span>}
          </button>
          <button onClick={() => setTab('announcements')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'announcements' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            📣 Announcements
          </button>
        </div>

        {/* Student Messages Tab */}
        {tab === 'messages' && (
          loadingMessages ? (
            <div className="text-center py-16 text-gray-400">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <div className="text-5xl mb-4">💬</div>
              <p className="font-semibold text-gray-400">No messages yet</p>
              <p className="text-sm mt-1">Students can send you questions from the app</p>
            </div>
          ) : (
            <div className="space-y-8">
              {unread.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-3">
                    Needs Reply ({unread.length})
                  </h2>
                  <div className="space-y-3">
                    {unread.map((msg) => (
                      <MessageCard
                        key={msg.id} msg={msg}
                        replyingId={replyingId} replyText={replyText} sending={sending}
                        onStartReply={() => { setReplyingId(msg.id); setReplyText('') }}
                        onCancelReply={() => setReplyingId(null)}
                        onChangeReply={setReplyText}
                        onSendReply={() => handleReply(msg.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {replied.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Replied ({replied.length})
                  </h2>
                  <div className="space-y-3">
                    {replied.map((msg) => (
                      <MessageCard
                        key={msg.id} msg={msg}
                        replyingId={replyingId} replyText={replyText} sending={sending}
                        onStartReply={() => { setReplyingId(msg.id); setReplyText(msg.reply ?? '') }}
                        onCancelReply={() => setReplyingId(null)}
                        onChangeReply={setReplyText}
                        onSendReply={() => handleReply(msg.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Announcements Tab */}
        {tab === 'announcements' && (
          <div>
            {/* Compose */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h2 className="font-black text-base mb-4" style={{ color: '#0D2137' }}>Send Announcement</h2>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Send to</label>
                <select value={selectedCohort} onChange={(e) => setSelectedCohort(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 min-w-52">
                  <option value="all">All Cohorts</option>
                  {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none mb-3"
              />
              <button onClick={handleSendAnnouncement} disabled={sendingAnnouncement || !announcementText.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#0D2137' }}>
                {sendingAnnouncement ? 'Sending...' : '📣 Send Announcement'}
              </button>
            </div>

            {/* Past announcements */}
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Sent Announcements</h2>
            {loadingAnnouncements ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                No announcements sent yet.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EEF3FA', color: '#0D2137' }}>
                            {ann.cohort_id ? ((ann.cohorts as any)?.name ?? 'Cohort') : '📣 All Cohorts'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(ann.created_at).toLocaleDateString()} {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{ann.content}</p>
                      </div>
                      <button onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="text-xs text-gray-300 hover:text-red-400 font-semibold flex-shrink-0">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function MessageCard({
  msg, replyingId, replyText, sending,
  onStartReply, onCancelReply, onChangeReply, onSendReply,
}: {
  msg: Message
  replyingId: string | null
  replyText: string
  sending: boolean
  onStartReply: () => void
  onCancelReply: () => void
  onChangeReply: (v: string) => void
  onSendReply: () => void
}) {
  const isReplying = replyingId === msg.id

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-bold text-gray-800">{msg.profiles?.name ?? 'Unknown'}</span>
          <span className="text-gray-400 text-xs ml-2">{msg.profiles?.email}</span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 mb-3">{msg.content}</div>
      {msg.reply && !isReplying && (
        <div className="border-l-4 pl-3 mb-3" style={{ borderColor: '#D4A853' }}>
          <p className="text-xs font-bold text-yellow-700 mb-1">Your reply</p>
          <p className="text-sm text-gray-600">{msg.reply}</p>
        </div>
      )}
      {isReplying ? (
        <div className="space-y-2">
          <textarea value={replyText} onChange={(e) => onChangeReply(e.target.value)}
            placeholder="Type your reply..." rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={onCancelReply}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={onSendReply} disabled={sending}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ backgroundColor: '#D4A853', color: '#0D2137' }}>
              {sending ? 'Sending...' : msg.reply ? 'Update Reply' : 'Send Reply'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={onStartReply} className="text-xs font-semibold text-yellow-700 hover:text-yellow-900">
          {msg.reply ? '✏️ Edit reply' : '↩ Reply'}
        </button>
      )}
    </div>
  )
}
