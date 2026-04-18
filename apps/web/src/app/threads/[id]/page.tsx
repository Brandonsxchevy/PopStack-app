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
