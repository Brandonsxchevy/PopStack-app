'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import RatingModal from '@/components/RatingModal'

const TIER_LABELS: Record<string, string> = {
  QUICK_FOLLOWUP: '$7.50 — Quick follow-up',
  FIFTEEN_MIN: '$30.00 — 15 min session',
  FULL_SOLUTION: '$75+ — Full solution',
  FIVE: '$7.50 — Quick follow-up',
  TWENTY: '$30.00 — 15 min session',
  FIFTY_PLUS: '$75+ — Full solution',
}

async function googleTranslate(text: string, targetLang: string): Promise<{ translated: string; detectedLang: string }> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const data = await res.json()
    const translated = data[0]?.map((s: any) => s[0]).join('') || text
    const detectedLang = data[2] || 'en'
    return { translated, detectedLang }
  } catch {
    return { translated: text, detectedLang: 'en' }
  }
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No ratings yet</span>
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 12, color: i <= Math.round(rating) ? '#BA7517' : '#D3D1C7' }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 2 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function ContextPanel({ thread, session, isDev }: { thread: any; session: any; isDev: boolean }) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const question = thread?.question
  const fingerprint = question?.fingerprint
  const otherPerson = isDev ? thread?.user : thread?.developer

  const getSummary = async () => {
    if (summary) { setSummaryOpen(true); return }
    setLoadingSummary(true)
    setSummaryOpen(true)
    try {
      const res = await api.post(`/questions/${question.id}/summary`)
      setSummary(res.data.summary || 'Could not generate summary')
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setLoadingSummary(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: isDev ? '#E6F1FB' : '#EEEDFE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 500,
          color: isDev ? '#0C447C' : '#3C3489',
          flexShrink: 0,
        }}>
          {otherPerson?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {otherPerson?.name || 'Unknown'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <StarRating rating={otherPerson?.avgRating} />
            {!isDev && otherPerson?.ratingCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {otherPerson.ratingCount} session{otherPerson.ratingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {session && (
          <div style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '3px 8px', borderRadius: 999, flexShrink: 0 }}>
            {TIER_LABELS[session.tier]?.split(' — ')[0]}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          {question?.title}
        </div>
        {question?.url && (
          <a href={question.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#6C2FFF', textDecoration: 'none', display: 'block', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {question.url}
          </a>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {fingerprint?.platform && fingerprint.platform !== 'UNKNOWN' && (
            <span style={{ fontSize: 11, background: '#EEEDFE', color: '#3C3489', padding: '2px 8px', borderRadius: 999 }}>
              {fingerprint.platform}
            </span>
          )}
          {session && (
            <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', padding: '2px 8px', borderRadius: 999 }}>
              {TIER_LABELS[session.tier]}
            </span>
          )}
        </div>
        {isDev && (
          <button onClick={getSummary} disabled={loadingSummary}
            style={{
              width: '100%', padding: '6px 0', borderRadius: 8,
              border: '0.5px solid #AFA9EC', background: summaryOpen ? '#EEEDFE' : 'none',
              color: '#6C2FFF', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              marginBottom: summary && summaryOpen ? 8 : 0,
            }}>
            {loadingSummary ? '✨ Generating...' : summaryOpen ? '✨ Hide summary' : '✨ Get AI summary'}
          </button>
        )}
        {summaryOpen && summary && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, background: '#EEEDFE', borderRadius: 8, padding: '8px 10px' }}>
            {summary}
          </div>
        )}
      </div>
    </div>
  )
}

function DevTimeTracker({ threadId, isActive }: { threadId: string; isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [chatSeconds, setChatSeconds] = useState(0)
  const [saved, setSaved] = useState(false)
  const totalRef = useRef(0)
  const chatRef = useRef(0)

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      totalRef.current += 1
      chatRef.current += 1
      setTotalSeconds(totalRef.current)
      setChatSeconds(chatRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const save = async () => {
    if (totalRef.current === 0) return
    try {
      await api.patch(`/threads/${threadId}/time`, {
        totalSeconds: totalRef.current,
        chatSeconds: chatRef.current,
      })
      setSaved(true)
      totalRef.current = 0
      chatRef.current = 0
      setTotalSeconds(0)
      setChatSeconds(0)
    } catch {
      toast.error('Failed to save time log')
    }
  }

  useEffect(() => {
    const handleUnload = () => {
      if (totalRef.current > 0) {
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_API_URL}/threads/${threadId}/time`,
          JSON.stringify({ totalSeconds: totalRef.current, chatSeconds: chatRef.current })
        )
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [threadId])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  if (!isActive) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 16, zIndex: 50,
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-secondary)',
      borderRadius: 12, overflow: 'hidden', minWidth: 160,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '7px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#639922', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          {fmt(totalSeconds)}
        </span>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>{open ? '▼' : '▲'}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 12px 10px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Total</span>
            <span style={{ fontWeight: 500 }}>{fmt(totalSeconds)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>In chat</span>
            <span style={{ fontWeight: 500 }}>{fmt(chatSeconds)}</span>
          </div>
          <button onClick={save} style={{
            width: '100%', padding: '5px 0', borderRadius: 8,
            background: saved ? '#EAF3DE' : '#6C2FFF',
            color: saved ? '#27500A' : 'white',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
            {saved ? 'Saved ✓' : 'Save log'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ThreadPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [text, setText] = useState('')
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [detectedLang, setDetectedLang] = useState<string | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showDevRatingModal, setShowDevRatingModal] = useState(false)

  const myLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'

  const { data: thread, isLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: () => api.get(`/threads/${id}`).then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/threads/${id}/messages`).then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: session } = useQuery({
    queryKey: ['session', thread?.sessionId],
    queryFn: () => api.get(`/sessions/${thread.sessionId}`).then(r => r.data),
    enabled: !!thread?.sessionId,
    refetchInterval: 5000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getMessageText = (msg: any): string => {
    if (!Array.isArray(msg.blocks)) return ''
    return msg.blocks
      .filter((b: any) => b.type === 'text')
      .map((b: any) => typeof b.content === 'string' ? b.content : b.content?.content?.[0]?.content?.[0]?.text || '')
      .join(' ')
  }

  // Auto-translate incoming messages
  useEffect(() => {
    if (!messages.length || !user) return
    const otherMessages = (messages as any[]).filter(m => m.senderId !== user.id && m.type !== 'SYSTEM_EVENT')
    if (!otherMessages.length) return
    const firstText = getMessageText(otherMessages[0])
    if (!firstText) return
    googleTranslate(firstText, myLang).then(({ detectedLang: detected }) => {
      if (detected === myLang) return
      setDetectedLang(detected)
      otherMessages.forEach((msg: any) => {
        const text = getMessageText(msg)
        if (!text) return
        googleTranslate(text, myLang).then(({ translated }) => {
          setTranslations(prev => ({ ...prev, [msg.id]: translated }))
        })
      })
    })
  }, [messages.length, user?.id])

  const accept = useMutation({
    mutationFn: () => api.post(`/sessions/${thread.sessionId}/accept`),
    onSuccess: () => {
      toast.success('Session accepted! Get to work 🚀')
      qc.invalidateQueries({ queryKey: ['session', thread?.sessionId] })
      qc.invalidateQueries({ queryKey: ['thread', id] })
      qc.invalidateQueries({ queryKey: ['dev-inbox'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to accept'),
  })

  const decline = useMutation({
    mutationFn: () => api.post(`/sessions/${thread.sessionId}/decline`),
    onSuccess: () => {
      toast.success('Session declined')
      qc.invalidateQueries({ queryKey: ['dev-inbox'] })
      router.push('/inbox')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to decline'),
  })

  const complete = useMutation({
    mutationFn: () => api.post(`/sessions/${thread.sessionId}/complete`),
    onSuccess: () => {
      toast.success('Session marked complete — 24h review window started')
      qc.invalidateQueries({ queryKey: ['session', thread?.sessionId] })
      setShowDevRatingModal(true)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to complete'),
  })

  const approve = useMutation({
    mutationFn: () => api.post(`/sessions/${thread.sessionId}/approve`),
    onSuccess: () => {
      toast.success('Work approved — payment released! 🎉')
      qc.invalidateQueries({ queryKey: ['session', thread?.sessionId] })
      qc.invalidateQueries({ queryKey: ['thread', id] })
      setShowRatingModal(true)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve'),
  })

  const send = useMutation({
    mutationFn: async () => {
      let outgoingText = text.trim()
      if (outgoingText && detectedLang && detectedLang !== myLang) {
        const { translated } = await googleTranslate(outgoingText, detectedLang)
        outgoingText = translated
      }
      const blocks: any[] = []
      if (outgoingText) blocks.push({ type: 'text', content: outgoingText })
      if (showCode && code.trim()) blocks.push({ type: 'code', content: code.trim() })
      if (!blocks.length) return Promise.reject(new Error('Empty message'))
      return api.post(`/threads/${id}/messages`, { blocks, type: 'PAID_MESSAGE' })
    },
    onSuccess: () => {
      setText('')
      setCode('')
      setShowCode(false)
      qc.invalidateQueries({ queryKey: ['messages', id] })
    },
    onError: (err: any) => {
      if (err.message === 'Empty message') return
      toast.error('Failed to send message')
    },
  })

  const handleSend = () => send.mutate()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (!thread) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Thread not found</div>
    </div>
  )

  const isDev = user?.role === 'DEVELOPER'
  const isPendingAccept = session?.status === 'PENDING_ACCEPT'
  const isActive = session?.status === 'ACTIVE'
  const isEnded = session?.status === 'ENDED'
  const canChat = isActive || isEnded

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate text-sm">{thread.question?.title || 'Conversation'}</div>
          <div className="text-xs text-gray-400">
            {isActive ? '🟢 Active' : isEnded ? '✅ Awaiting approval' : isPendingAccept ? '⏳ Pending' : 'Thread'}
          </div>
        </div>
        <Link href={isDev ? '/inbox' : '/dashboard'} className="text-brand font-bold text-lg">PS</Link>
      </nav>

      {/* Context panel */}
      <ContextPanel thread={thread} session={session} isDev={isDev} />

      {/* Auto-translation indicator — TODO: add per-user toggle in admin settings */}
      {detectedLang && detectedLang !== myLang && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 text-center">
          <span className="text-xs text-blue-500">
            Auto-translating · {detectedLang.toUpperCase()} ↔ {myLang.toUpperCase()}
          </span>
        </div>
      )}

      {/* Session action banners */}
      {isDev && isPendingAccept && session && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">New session request</p>
              <p className="text-xs text-amber-700">{TIER_LABELS[session.tier]} · from {thread.user?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decline.mutate()} disabled={decline.isPending}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                Decline
              </button>
              <button onClick={() => accept.mutate()} disabled={accept.isPending}
                className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                {accept.isPending ? 'Accepting...' : 'Accept ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isActive && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700 font-medium">Session active</span>
            </div>
            {isDev && (
              <button onClick={() => complete.mutate()} disabled={complete.isPending}
                className="text-xs text-green-700 font-medium border border-green-300 px-3 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50">
                {complete.isPending ? '...' : 'Mark complete'}
              </button>
            )}
          </div>
        </div>
      )}

      {isEnded && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span className="text-sm text-gray-600">
              ✅ {isDev ? 'Waiting for client approval' : 'Approve the work to release payment'}
            </span>
            {!isDev && (
              <button onClick={() => approve.mutate()} disabled={approve.isPending}
                className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-50 animate-pop shadow-lg shadow-brand/40">
                {approve.isPending ? '...' : 'Approve & pay ✓'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {messagesLoading ? (
          <div className="text-center text-gray-400 py-8 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              {isDev
                ? isPendingAccept ? 'Accept the session to start chatting.' : 'Start the conversation with your client.'
                : isActive ? 'Your developer is working on it.' : 'Your developer will reach out shortly.'}
            </p>
          </div>
        ) : (
          (messages as any[]).map((msg: any) => {
            const isMe = msg.senderId === user?.id
            const isSystem = msg.type === 'SYSTEM_EVENT'
            const otherName = isDev ? thread.user?.name : thread.developer?.name

            if (isSystem) return (
              <div key={msg.id} className="text-center">
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                  {msg.systemEventType?.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
            )

            const translatedText = translations[msg.id]
            const showTranslation = !isMe && !!translatedText

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-gray-400 px-1">{otherName}</span>}
                  <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-brand text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'}`}>
                    {Array.isArray(msg.blocks) && msg.blocks.map((block: any, i: number) => (
                      <div key={i}>
                        {block.type === 'text' && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{
                            showTranslation && i === 0 ? translatedText :
                            typeof block.content === 'string' ? block.content :
                            block.content?.content?.[0]?.content?.[0]?.text || ''
                          }</p>
                        )}
                        {block.type === 'code' && (
                          <pre className={`text-xs p-2 rounded-lg mt-1 overflow-x-auto font-mono ${isMe ? 'bg-white/10' : 'bg-gray-900 text-green-400'}`}>
                            {block.content}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!session && !isDev ? (
        <div className="bg-white border-t border-gray-200 p-4 text-center max-w-2xl mx-auto w-full">
          <p className="text-sm text-gray-500 mb-3">Payment required to start this session</p>
          <button onClick={() => router.push(`/question/${thread.question?.id}`)}
            className="btn-primary px-6 py-2 text-sm">
            Go to question →
          </button>
        </div>
      ) : canChat ? (
        <div className="bg-white border-t border-gray-200 p-3 max-w-2xl mx-auto w-full">
          {showCode && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Code snippet</span>
                <button onClick={() => { setShowCode(false); setCode('') }} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <textarea value={code} onChange={e => setCode(e.target.value)}
                className="w-full bg-gray-900 text-green-400 text-xs font-mono p-2 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-brand min-h-[80px] resize-none"
                placeholder="// paste code here" />
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea value={text} onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none max-h-32"
                placeholder="Type a message... (Enter to send)"
                rows={1}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px'
                }}
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setShowCode(!showCode)}
                className={`p-2 rounded-xl text-sm transition-colors ${showCode ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {'</>'}
              </button>
              <button onClick={handleSend}
                disabled={send.isPending || (!text.trim() && !code.trim())}
                className="bg-brand text-white p-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
        </div>
      ) : null}

      <DevTimeTracker threadId={id as string} isActive={isActive && isDev} />

      {showRatingModal && session && (
        <RatingModal
          sessionId={thread.sessionId}
          rateeType="developer"
          rateeName={thread.developer?.name || 'your developer'}
          onClose={() => { setShowRatingModal(false); router.push('/dashboard') }}
        />
      )}
      {showDevRatingModal && session && (
        <RatingModal
          sessionId={thread.sessionId}
          rateeType="user"
          rateeName={thread.user?.name || 'your client'}
          onClose={() => setShowDevRatingModal(false)}
        />
      )}
    </div>
  )
}
