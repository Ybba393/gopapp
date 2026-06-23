'use client'

export default function MessagesPage() {
  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      <div className="px-5 pt-14 pb-6" style={{ background: '#0D2137' }}>
        <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D4A853' }}>GENERATION OF PROMISE</p>
        <h1 className="text-2xl font-black text-white">Messages</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <p className="text-5xl mb-4">💬</p>
        <p className="font-black text-lg" style={{ color: '#0D2137' }}>Coming Soon</p>
        <p className="text-sm text-gray-400 mt-2">Messaging with Mrs. Sykes will be available here.</p>
      </div>
    </div>
  )
}
