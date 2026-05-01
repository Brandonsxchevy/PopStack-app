'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const STEPS = ['Posted', 'Response', 'Booked', 'In session', 'Approve']

const STATUS_STEP: Record<string, number> = {
  OPEN: 0,
  LOCKED: 1,
  AWAITING_ACCEPT: 2,
  ACTIVE: 3,
  ENDED: 4,
  CLOSED: 5,
  EXPIRED: 0,
}

const STATUS_CONFIG: Record<string, { label: string; stage: string; color: string; badgeStyle: string }> = {
  OPEN:            { label: 'Waiting for response',  stage: 'in-progress', color: '#378ADD', badgeStyle: 'background:#E6F1FB;color:#0C447C' },
  LOCKED:          { label: 'Response received',     stage: 'in-progress', color: '#BA7517', badgeStyle: 'background:#FAEEDA;color:#633806' },
  AWAITING_ACCEPT: { label: 'Awaiting developer',    stage: 'in-progress', color: '#7F77DD', badgeStyle: 'background:#EEEDFE;color:#3C3489' },
  ACTIVE:          { label: 'Session in progress',   stage: 'active',      color: '#639922', badgeStyle: 'background:#EAF3DE;color:#27500A' },
  ENDED:           { label: 'Review & approve',      stage: 'ended',       color: '#D85A30', badgeStyle: 'background:#FAECE7;color:#712B13' },
  CLOSED:          { label: 'Completed',             stage: 'completed',   color: '#888780', badgeStyle: 'background:#F1EFE8;color:#444441' },
  EXPIRED:         { label: 'Expired',               stage: 'completed',   color: '#E24B4A', badgeStyle: 'background:#FCEBEB;color:#791F1F' },
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? '#6C2FFF' : i === step ? '#AFA9EC' : 'var(--color-border-tertiary)',
        }} />
      ))}
    </div>
  )
}

function QuestionCard({ q, ghost = 0 }: { q: any; ghost?: number }) {
  const router = useRouter()
  const config = STATUS_CONFIG[q.status] || STATUS_CONFIG.OPEN
  const step = STATUS_STEP[q.status] ?? 0
  const isActive = q.status === 'ACTIVE'
  const isEnded = q.status === 'ENDED'
  const isCompleted = ['CLOSED', 'EXPIRED'].includes(q.status)

  const borderColor = isActive ? '#97C459' : isEnded ? '#F0997B' : 'var(--color-border-tertiary)'
  const borderWidth = isActive || isEnded ? '1.5px' : '0.5px'

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
        onClick={() => router.push(`/question/${q.id}`)}
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
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#639922', display: 'inline-block', flexShrink: 0,
                  animation: 'pulse 1.5s infinite',
                }} />
              )}
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
              }}>
                {q.title}
              </span>
            </div>
            {q.url && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.url}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 500, ...Object.fromEntries(config.badgeStyle.split(';').map(s => { const [k,v] = s.split(':'); return [k?.trim().replace(/-([a-z])/g, (_,c) => c.toUpperCase()), v?.trim()] }).filter(([k]) => k)) }}>
                {config.label}
              </span>
              {isEnded && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 12, background: '#D85A30', color: 'white', padding: '5px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 500 }}>
                  Approve & pay →
                </Link>
              )}
              {isActive && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 12, background: '#6C2FFF', color: 'white', padding: '5px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 500 }}>
                  Open chat →
                </Link>
              )}
              {!isActive && !isEnded && (
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StageSection({ label, dot, questions }: { label: string; dot: string; questions: any[] }) {
  if (questions.length === 0) return null
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          {label}
        </span>
      </div>
      {questions.map((q, i) => (
        <QuestionCard key={q.id} q={q} ghost={Math.max(0, questions.length - 1 - i) > 1 ? 2 : Math.max(0, questions.length - 1 - i)} />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['my-questions'],
    queryFn: () => api.get('/questions/my').then(r => r.data),
    refetchInterval: 15000,
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-tertiary)' }}>
      Loading your requests...
    </div>
  )

  if (questions.length === 0) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🧩</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>No requests yet</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>Got a tech problem? Pop it and a Stacker will help.</p>
      <Link href="/ask" className="btn-primary" style={{ padding: '10px 32px' }}>Submit your first request</Link>
    </div>
  )

  const active = questions.filter((q: any) => q.status === 'ACTIVE')
  const ended = questions.filter((q: any) => q.status === 'ENDED')
  const inProgress = questions.filter((q: any) => ['OPEN', 'LOCKED', 'AWAITING_ACCEPT'].includes(q.status))
  const completed = questions.filter((q: any) => ['CLOSED', 'EXPIRED'].includes(q.status))

  return (
    <div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>My requests</h1>
        <Link href="/ask" className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>+ New request</Link>
      </div>

      <StageSection label="Session active" dot="#639922" questions={active} />
      <StageSection label="Awaiting your approval" dot="#D85A30" questions={ended} />
      <StageSection label="In progress" dot="#888780" questions={inProgress} />

      {completed.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '0.5px solid var(--color-border-tertiary)', margin: '1.5rem 0' }} />
          <StageSection label="Completed" dot="#B4B2A9" questions={completed} />
        </>
      )}
    </div>
  )
}
