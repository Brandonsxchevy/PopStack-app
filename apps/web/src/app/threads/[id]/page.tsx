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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
]

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

function QuestionPanel({ thread, session }: { thread: any; session: any }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const question = thread?.question
  const fingerprint = question?.fingerprint

  const getSummary = async () => {
    if (summary) return
    setLoadingSummary(true)
    try {
      const prompt = `You are helping a web developer quickly understand a client's website problem.

Question title: ${question?.title}
Description: ${question?.description || 'None provided'}
URL: ${question?.url || 'None provided'}
Platform: ${fingerprint?.platform || 'Unknown'}
DNS Provider: ${fingerprint?.signals?.find((s: any) => s.signal?.startsWith('dns_provider:'))?.signal?.replace('dns_provider: ', '') || 'Unknown'}
Session tier: ${TIER_LABELS[session?.tier] || 'Unknown'}

In 3-4 sentences: summarize the likely problem, what access the developer will need, and the fastest path to a fix. Be direct and practical.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      setSummary(data.content?.[0]?.text || 'Could not generate summary')
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setLoadingSummary(false)
    }
  }

  if (!question) return null

  return (
    <div className="border-b border-gray-200 bg-white">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="font-medium">Question details</span>
          {fingerprint?.platform && fingerprint.platform !== 'UNKNOWN' && (
            <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">{fingerprint.platform}</span>
          )}
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 max-w-2xl mx-auto">
          <div className="space-y-2 mb-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Problem</p>
              <p className="text-sm text-gray-800">{question.title}</p>
              {question.description && <p className="text-xs text-gray-500 mt-1">{question.description}</p>}
            </div>
            {question.url && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Website</p>
                <a href={question.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline">{question.url}</a>
              </div>
            )}
            {fingerprint && (
              <div className="flex flex-wrap gap-2">
                {fingerprint.platform && fingerprint.platform !== 'UNKNOWN' && (
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
                    <span className="text-gray-500">Platform:</span> <span className="text-gray-800 font-medium">{fingerprint.platform}</span>
                  </div>
                )}
                {fingerprint.signals?.filter((s: any) => s.signal?.startsWith('dns_provider:')).map((s: any) => (
                  <div key={s.signal} className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
                    <span className="text-gray-500">DNS:</span> <span className="text-gray-800 font-medium">{s.signal.replace('dns_provider: ', '')}</span>
                  </div>
                ))}
              </div>
            )}
            {session && (
              <div className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg inline-block">{TIER_LABELS[session.tier]}</div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3">
            {summary ? (
              <div className="bg-brand-light rounded-xl p-3">
                <span className="text-xs font-semibold text-brand block mb-2">✨ AI Summary</span>
                <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
              </div>
            ) : (
              <button onClick={getSummary} disabled={loadingSummary}
                className="w-full py-2 rounded-xl border border-brand/30 text-brand text-xs font-medium hover:bg-brand-light transition-colors disabled:opacity-50">
                {loadingSummary ? '✨ Generating summary...' : '✨ Get AI summary'}
              </button>
            )}
          </div>
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
  const [translateMode, setTranslateMode] = useState(false)
  const [devLang, setDevLang] = useState('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [detectedUserLang, setDetectedUserLang] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showDevRatingModal, setShowDevRatingModal] = useState(false)
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

  useEffect(() => {
    if (!translateMode || !messages.length) return
    translateAllMessages()
  }, [translateMode, messages.length])

  const getMessageText = (msg: any): string => {
    if (!Array.isArray(msg.blocks)) return ''
    return msg.blocks
      .filter((b: any) => b.type === 'text')
      .map((b: any) => typeof b.content === 'string' ? b.content : b.content?.content?.[0]?.content?.[0]?.text || '')
      .join(' ')
  }

  const translateAllMessages = async () => {
    setTranslating(true)
    const newTranslations: Record<string, string> = {}
    let detectedLang: string | null = null

    for (const msg of messages) {
      if (msg.type === 'SYSTEM_EVENT') continue
      const isFromOther = msg.senderId !== user?.id
      const msgText = getMessageText(msg)
      if (!msgText) continue
      if (isFromOther) {
        const result = await googleTranslate(msgText, devLang)
        newTranslations[msg.id] = result.translated
        if (!detectedLang) detectedLang = result.detectedLang
      }
    }

    if (detectedLang) setDetectedUserLang(detectedLang)
    setTranslations(newTranslations)
    setTranslating(false)
  }

  const enableTranslation = async (lang: string) => {
    setDevLang(lang)
    setTranslateMode(true)
    setShowLangPicker(false)
  }

  const disableTranslation = () => {
    setTranslateMode(false)
    setTranslations({})
    setDetectedUserLang(null)
  }

  const handleSend = async () => {
    const blocks: any[] = []
    if (text.trim()) blocks.push({ type: 'text', content: text.trim() })
    if (showCode && code.trim()) blocks.push({ type: 'code', content: code.trim() })
    if (!blocks.length) return
    send.mutate()
  }

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
  setShowRatingModal(true)
},
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve'),
  })

  const send = useMutation({
    mutationFn: () => {
      const blocks: any[] = []
      if (text.trim()) blocks.push({ type: 'text', content: text.trim() })
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

  const otherPerson = user?.role === 'DEVELOPER' ? thread.user : thread.developer
  const questionTitle = thread.question?.title || 'Conversation'
  const isDev = user?.role === 'DEVELOPER'
  const isPendingAccept = session?.status === 'PENDING_ACCEPT'
  const isActive = session?.status === 'ACTIVE'
  const isEnded = session?.status === 'ENDED'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">←</button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{questionTitle}</div>
          <div className="text-xs text-gray-500">with {otherPerson?.name || '...'}</div>
        </div>

        {/* Translate toggle — dev only */}
        {isDev && (
          <div className="relative">
            {translateMode ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-brand font-medium">
                  🌐 {LANGUAGES.find(l => l.code === devLang)?.label}
                  {detectedUserLang && (
                    <span className="text-gray-400 ml-1">↔ {LANGUAGES.find(l => l.code === detectedUserLang)?.label || detectedUserLang}</span>
                  )}
                </span>
                <button onClick={disableTranslation}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-0.5 rounded-lg">
                  Off
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLangPicker(!showLangPicker)}
                className="text-xs text-gray-500 hover:text-brand border border-gray-200 px-2 py-1 rounded-lg transition-colors">
                🌐 Translate
              </button>
            )}
            {showLangPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
                  <p className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-100">Translate chat to</p>
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => enableTranslation(lang.code)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-brand-light hover:text-brand transition-colors">
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Link href={isDev ? '/inbox' : '/dashboard'} className="text-brand font-bold text-lg shrink-0">PS</Link>
      </nav>

      {/* Question context panel — dev only */}
      {isDev && <QuestionPanel thread={thread} session={session} />}

      {/* Translation status bar */}
      {isDev && translateMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-1.5 text-center">
          <span className="text-xs text-blue-700">
            {translating
              ? '🌐 Translating messages...'
              : `🌐 Showing translations in ${LANGUAGES.find(l => l.code === devLang)?.label}${detectedUserLang ? ` · User writes in ${LANGUAGES.find(l => l.code === detectedUserLang)?.label || detectedUserLang}` : ''}`}
          </span>
        </div>
      )}

      {/* Session banners */}
      {isDev && isPendingAccept && session && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 mb-0.5">New session request</p>
              <p className="text-xs text-amber-700">{TIER_LABELS[session.tier]} · from {thread.user?.name}</p>
              {session.question?.url && (
                <a href={session.question.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand underline mt-1 block truncate">{session.question.url}</a>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => decline.mutate()} disabled={decline.isPending}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Decline</button>
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
              <span className="text-xs text-green-600">· {TIER_LABELS[session?.tier]}</span>
            </div>
            {isDev && (
              <button onClick={() => complete.mutate()} disabled={complete.isPending}
                className="text-xs text-green-700 font-medium border border-green-300 px-2 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50">
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
              ✅ Session complete — {isDev ? 'waiting for client approval' : 'approve the work to release payment'}
            </span>
            {!isDev && (
              <button onClick={() => approve.mutate()} disabled={approve.isPending}
                className="text-sm bg-brand text-white font-medium px-3 py-1.5 rounded-lg hover:bg-brand-dark disabled:opacity-50 shrink-0">
                {approve.isPending ? '...' : 'Approve & pay ✓'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4 max-w-2xl mx-auto w-full">
        {messagesLoading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              {isDev
                ? isPendingAccept ? 'Accept the session to start chatting.' : 'Start the conversation with your client.'
                : 'Your developer will reach out shortly.'}
            </p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.senderId === user?.id
            const isSystem = msg.type === 'SYSTEM_EVENT'

            if (isSystem) return (
              <div key={msg.id} className="text-center">
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                  {msg.systemEventType?.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
            )

            const translatedText = translations[msg.id]
            const showTranslation = translateMode && !isMe && translatedText

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-gray-400 px-1">{otherPerson?.name}</span>}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isMe ? 'bg-brand text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                  }`}>
                    {Array.isArray(msg.blocks) && msg.blocks.map((block: any, i: number) => (
                      <div key={i}>
                        {block.type === 'text' && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{
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
                    {showTranslation && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-brand font-medium mb-0.5">🌐 Translation</p>
                        <p className="text-sm leading-relaxed text-gray-700">{translatedText}</p>
                      </div>
                    )}
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
      <div className="bg-white border-t border-gray-200 p-3 max-w-2xl mx-auto w-full">
        {isDev && isPendingAccept ? (
          <p className="text-sm text-gray-400 text-center py-2">Accept the session to start messaging</p>
        ) : (
          <>
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
                  placeholder={isDev && translateMode && detectedUserLang ? `Type in ${LANGUAGES.find(l => l.code === devLang)?.label} — sends in both languages` : 'Type a message... (Enter to send)'}
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
                  className={`p-2 rounded-xl text-sm transition-colors ${showCode ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  title="Add code snippet">
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
          </>
        )}
      </div>
      {showRatingModal && session && (
        <RatingModal
    sessionId={thread.sessionId}
    rateeType="developer"
    rateeName={thread.developer?.name || 'your developer'}
    onClose={() => setShowRatingModal(false)}
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
