'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

export default function ThreadPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [text, setText] = useState('')
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)

  const { data: thread, isLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: () => api.get(`/threads/${id}`).then(r => r.data),
    refetchInterval: 5000, // poll every 5s for new messages
  })

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/threads/${id}/messages`).then(r => r.data),
    refetchInterval: 5000,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useMutation({
    mutationFn: () => {
      const blocks: any[] = []
      if (text.trim()) blocks.push({ type: 'text', content: text.trim() })
      if (showCode && code.trim()) blocks.push({ type: 'code', content: code.trim() })
      if (!blocks.length) return Promise.reject(new Error('Empty message'))
      return api.post(`/threads/${id}/messages`, {
        blocks,
        type: 'PAID_MESSAGE',
      })
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
      send.mutate()
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{questionTitle}</div>
          <div className="text-xs text-gray-500">
            with {otherPerson?.name || '...'}
          </div>
        </div>
        <Link href="/" className="text-brand font-bold text-lg shrink-0">PS</Link>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {messagesLoading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              {user?.role === 'USER'
                ? 'Your developer will reach out shortly.'
                : 'Start the conversation with your client.'}
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

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-xs text-gray-400 px-1">{otherPerson?.name}</span>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-brand text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
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
                          <pre className={`text-xs p-2 rounded-lg mt-1 overflow-x-auto font-mono ${
                            isMe ? 'bg-brand-dark/30' : 'bg-gray-900 text-green-400'
                          }`}>
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
      <div className="bg-white border-t border-gray-200 p-3">
        {showCode && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Code snippet</span>
              <button onClick={() => { setShowCode(false); setCode('') }}
                className="text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-gray-900 text-green-400 text-xs font-mono p-2 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-brand min-h-[80px] resize-none"
              placeholder="// paste code here"
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none max-h-32"
              placeholder="Type a message... (Enter to send)"
              rows={1}
              style={{ height: 'auto' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowCode(!showCode)}
              className={`p-2 rounded-xl text-sm transition-colors ${
                showCode ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="Add code snippet">
              {'</>'}
            </button>
            <button
              onClick={() => send.mutate()}
              disabled={send.isPending || (!text.trim() && !code.trim())}
              className="bg-brand text-white p-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">
                 Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
