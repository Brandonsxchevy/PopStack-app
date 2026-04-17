'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const DEV_STEPS = ['New request', 'Accepted', 'Active', 'Complete', 'Paid']

const DEV_SECTION_STEP: Record<string, number> = {
  NEW_REQUESTS:     0,
  AWAITING_PAYMENT: 1,
  ACTIVE_WORK:      2,
  BLOCKED:          2,
  COMPLETED:        5,
}

const DEV_SECTION_CONFIG: Record<string, { label: string; dot: string; badgeStyle: string }> = {
  NEW_REQUESTS:     { label: 'New requests',      dot: '#378ADD', badgeStyle: 'background:#E6F1FB;color:#0C447C' },
  AWAITING_PAYMENT: { label: 'Pending acceptance', dot: '#BA7517', badgeStyle: 'background:#FAEEDA;color:#633806' },
  ACTIVE_WORK:      { label: 'Active work',        dot: '#639922', badgeStyle: 'background:#EAF3DE;color:#27500A' },
  BLOCKED:          { label: 'Blocked',            dot: '#D85A30', badgeStyle: 'background:#FAECE7;color:#712B13' },
  COMPLETED:        { label: 'Completed',          dot: '#888780', badgeStyle: 'background:#F1EFE8;color:#444441' },
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
      {DEV_STEPS.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? '#6C2FFF' : i === step ? '#AFA9EC' : 'var(--color-border-tertiary)',
        }} />
      ))}
    </div>
  )
}

function ThreadCard({ thread, ghost = 0 }: { thread: any; ghost?: number }) {
  const router = useRouter()
  const section = thread.devSection as string
  const config = DEV_SECTION_CONFIG[section] || DEV_SECTION_CONFIG.NEW_REQUESTS
  const step = DEV_SECTION_STEP[section] ?? 0
  const isActive = section === 'ACTIVE_WORK'
  const isNew = section === 'NEW_REQUESTS'
  const isCompleted = section === 'COMPLETED'

  const borderColor = isActive ? '#97C459' : isNew ? '#85B7EB' : 'var(--color-border-tertiary)'
  const borderWidth = isActive || isNew ? '1.5px' : '0.5px'

  return (
    <div style={{ position: 'relative', paddingBottom: ghost > 0 ? 10 : 0, marginBottom: 12 }}>
      {ghost >= 2 && (
        <div style={{
          position: 'absolute', left: 10, right: -10, top: 8, bottom: 2,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 12, zIndex: 0,
        }} />
      )}
      {ghost >= 1 && (
        <div style={{
          position: 'absolute', left: 6, right: -6, top: 4, bottom: 2,
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 12, zIndex: 1,
        }} />
      )}
      <div
        onClick={() => router.push(`/threads/${thread.id}`)}
        style={{
          position: 'relative', zIndex: 2,
          background: 'var(--color-background-primary)',
          border: `${borderWidth} solid ${borderColor}`,
          borderRadius: 12, padding: '14px 16px',
          cursor: 'pointer', opacity: isCompleted ? 0.7 : 1,
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <ProgressBar step={step} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {isActive && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#639922',
                  display: 'inline-block', flexShrink: 0, animation: 'pulse 1.5s infinite',
                }} />
              )}
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
              }}>
                {thread.question?.title || 'Untitled request'}
              </span>
            </div>
            {thread.lastMessagePreview && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {thread.lastMessagePreview}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {thread.question?.fingerprint?.platform && thread.question.fingerprint.platform !== 'UNKNOWN' && (
                  <span style={{ fontSize: 11, background: '#EDE8FF', color: '#6C2FFF', padding: '2px 8px', borderRadius: 999 }}>
                    {thread.question.fingerprint.platform}
                  </span>
                )}
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 500, ...parseBadgeStyle(config.badgeStyle) }}>
                  {config.label}
                </span>
                {thread.user?.name && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {thread.user.name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {thread.devUnreadCount > 0 && (
                  <span style={{
                    background: '#6C2FFF', color: 'white', fontSize: 11,
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {thread.devUnreadCount}
                  </span>
                )}
                {thread.lastMessageAt && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {new Date(thread.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseBadgeStyle(s: string): Record<string, string> {
  return Object.fromEntries(
    s.split(';').map(p => {
      const [k, v] = p.split(':')
      return [k?.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v?.trim()]
    }).filter(([k]) => k)
  )
}

function StageSection({ sectionKey, threads }: { sectionKey: string; threads: any[] }) {
  if (threads.length === 0) return null
  const config = DEV_SECTION_CONFIG[sectionKey]
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: config.dot, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          {config.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>· {threads.length}</span>
      </div>
      {threads.map((t, i) => (
        <ThreadCard
          key={t.id}
          thread={t}
          ghost={Math.min(2, Math.max(0, threads.length - 1 - i))}
        />
      ))}
    </div>
  )
}

export default function InboxPage() {
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dev-inbox'],
    queryFn: () => api.get('/inbox').then(r => r.data),
  })

  const { data: counts } = useQuery({
    queryKey: ['inbox-counts'],
    queryFn: () => api.get('/inbox/counts').then(r => r.data),
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-tertiary)' }}>
      Loading inbox...
    </div>
  )

  const inboxThreads = threads.filter((t: any) => t.devSection !== 'ACTIVE_WORK')

  if (inboxThreads.length === 0) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Inbox is empty</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>Accept questions from the feed to start helping.</p>
      <Link href="/swipe" className="btn-primary" style={{ padding: '10px 32px' }}>Browse feed</Link>
    </div>
  )

  const newRequests = inboxThreads.filter((t: any) => t.devSection === 'NEW_REQUESTS')
  const awaitingPayment = inboxThreads.filter((t: any) => t.devSection === 'AWAITING_PAYMENT')
  const blocked = inboxThreads.filter((t: any) => t.devSection === 'BLOCKED')
  const completed = inboxThreads.filter((t: any) => t.devSection === 'COMPLETED')

  return (
    <div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Inbox</h1>
          {counts?.pending > 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {counts.pending} awaiting acceptance
            </p>
          )}
        </div>
        <Link href="/swipe" className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>+ Find work</Link>
      </div>

      <StageSection sectionKey="NEW_REQUESTS" threads={newRequests} />
      <StageSection sectionKey="AWAITING_PAYMENT" threads={awaitingPayment} />
      <StageSection sectionKey="BLOCKED" threads={blocked} />

      {completed.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '0.5px solid var(--color-border-tertiary)', margin: '1.5rem 0' }} />
          <StageSection sectionKey="COMPLETED" threads={completed} />
        </>
      )}
    </div>
  )
}
