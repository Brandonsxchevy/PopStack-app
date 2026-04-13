<div key={q.id} className="card hover:shadow-md transition-shadow block">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <Link href={`/question/${q.id}`}
        className="font-medium text-gray-900 truncate block hover:text-brand transition-colors">
        {q.title}
      </Link>
      {q.url && (
        <div className="text-xs text-gray-400 truncate mt-0.5">{q.url}</div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {q.fingerprint?.platform && q.fingerprint.platform !== 'UNKNOWN' && (
          <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
            {q.fingerprint.platform}
          </span>
        )}
        <Link href={`/question/${q.id}`}
          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[q.status] || STATUS_STYLES.OPEN}`}>
          {q.status.replace(/_/g, ' ').toLowerCase()}
        </Link>
        {q.thread?.id && (
          <Link href={`/threads/${q.thread.id}`}
            className="text-xs text-brand font-medium hover:underline">
            💬 Chat
          </Link>
        )}
        {q.responses?.length > 0 && (
          <span className="text-xs text-green-600 font-medium">
            {q.responses.length} response{q.responses.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
    <div className="text-xs text-gray-400 shrink-0">
      {new Date(q.createdAt).toLocaleDateString()}
    </div>
  </div>
</div>
