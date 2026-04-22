import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { InsightChat } from './components/InsightChat'
import { InsightsGrid } from './components/InsightsGrid'
import { PostCard } from './components/PostCard'
import { PostPreview } from './components/PostPreview'
import { SavedPosts } from './components/SavedPosts'
import type { ChatMessage, ContentType, Example, GeneratedPost, Insight, LifiData, Tone } from './lib/types'
import { useSavedPosts } from './lib/useSavedPosts'

type AppView = 'insights' | 'chat' | 'create' | 'saved'

const CATEGORY_COLORS: Record<string, string> = {
  growth: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  volume: 'bg-blue-100 text-blue-700 border-blue-200',
  revenue: 'bg-amber-100 text-amber-700 border-amber-200',
  adoption: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  technical: 'bg-purple-100 text-purple-700 border-purple-200',
  ecosystem: 'bg-teal-100 text-teal-700 border-teal-200',
}

const ALL_CATEGORIES = ['growth', 'volume', 'revenue', 'adoption', 'technical', 'ecosystem'] as const

const TONES: Tone[] = ['professional', 'casual', 'technical']
const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professional',
  casual: 'Casual',
  technical: 'Technical',
}

export default function App() {
  const [lifiData, setLifiData] = useState<LifiData | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [staticInsights, setStaticInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({})
  const [chatStreaming, setChatStreaming] = useState(false)
  const [includeChatIds, setIncludeChatIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<AppView>('insights')
  const [contentType, setContentType] = useState<ContentType>('post')
  const [selectedTone, setSelectedTone] = useState<Tone>('professional')
  const [posts, setPosts] = useState<Record<string, GeneratedPost>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [previewPost, setPreviewPost] = useState<GeneratedPost | null>(null)
  const [examples, setExamples] = useState<Example[]>([])
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const { savedPosts, savePost, updatePost, deletePost } = useSavedPosts()
  const [editingSavedPostId, setEditingSavedPostId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set(ALL_CATEGORIES))

  const streamInsights = useCallback(async (data: LifiData, append = false, existingInsights: Insight[] = [], signal?: AbortSignal, categories?: string[]) => {
    if (!append) setInsights([])
    setInsightsLoading(true)
    setInsightsError(null)

    const existingTitles = existingInsights.map((i) => i.title)

    const response = await fetch('/api/generate-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, existingTitles, categories }),
      signal,
    })

    const body = response.body
    if (!body) throw new Error('No response body')
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        return
      }
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') {
          setInsightsLoading(false)
          return
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.insight) {
            setInsights((prev) => [...prev, parsed.insight])
          }
          if (parsed.error) {
            setInsightsError(parsed.error)
            setInsightsLoading(false)
            return
          }
        } catch {
          // skip malformed SSE
        }
      }
    }
    setInsightsLoading(false)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (lifiData && !insightsLoading) {
      insightsAbortRef.current?.abort()
      const controller = new AbortController()
      insightsAbortRef.current = controller
      const cats = categoryFilter.size > 0 ? [...categoryFilter] : undefined
      streamInsights(lifiData, true, insights, controller.signal, cats).catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights')
      })
    }
  }, [lifiData, insightsLoading, streamInsights, insights, categoryFilter])

  const insightsAbortRef = useRef<AbortController | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        const [dataResponse, staticInsightsResponse, examplesResponse] = await Promise.all([
          fetch('/api/lifi-data'),
          fetch('/api/insights'),
          fetch('/api/examples'),
        ])

        const data: LifiData = await dataResponse.json()
        setLifiData(data)

        if (staticInsightsResponse.ok) {
          const { insights: prebuilt } = await staticInsightsResponse.json()
          setStaticInsights(prebuilt)
        }

        if (examplesResponse.ok) {
          const examplesData: Example[] = await examplesResponse.json()
          setExamples(examplesData)
        }

        insightsAbortRef.current = new AbortController()
        await streamInsights(data, false, [], insightsAbortRef.current.signal)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('Failed to initialize:', error)
        setInsightsError(error instanceof Error ? error.message : 'Failed to load insights')
        setInsightsLoading(false)
      }
    }

    init()
  }, [streamInsights])

  const handleExampleChange = useCallback(
    (exampleId: string | null) => {
      insightsAbortRef.current?.abort()
      insightsAbortRef.current = null
      setSelectedExampleId(exampleId)
      setSelectedIds(new Set())
      setChatMessages({})
      setIncludeChatIds(new Set())
      setPosts({})
      setInsightsLoading(false)
      if (exampleId) {
        const ex = examples.find((e) => e.id === exampleId)
        if (ex) {
          setInsights(staticInsights)
          setSelectedIds(new Set(ex.insights_used))
          setCategoryFilter(new Set(ALL_CATEGORIES))
        }
      } else {
        if (lifiData) {
          const controller = new AbortController()
          insightsAbortRef.current = controller
          streamInsights(lifiData, false, [], controller.signal).catch((err) => {
            if (err instanceof DOMException && err.name === 'AbortError') return
            setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights')
          })
        }
      }
    },
    [examples, staticInsights, lifiData, streamInsights],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleOpenChat = useCallback((id: string) => {
    setActiveInsightId(id)
    setView('chat')
    window.scrollTo(0, 0)
  }, [])

  const toggleIncludeChat = useCallback((id: string) => {
    setIncludeChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const activeInsight = insights.find((i) => i.id === activeInsightId) || null

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!activeInsight || !lifiData) return

      const insightId = activeInsight.id
      const currentMessages = chatMessages[insightId] || []

      if (currentMessages.length === 0) {
        setIncludeChatIds((prev) => new Set(prev).add(insightId))
      }

      setChatMessages((prev) => ({
        ...prev,
        [insightId]: [
          ...(prev[insightId] || []),
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: '' },
        ],
      }))
      setChatStreaming(true)

      try {
        const response = await fetch('/api/chat-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insight: activeInsight,
            messages: [...currentMessages, { role: 'user', content: message }],
            data: lifiData,
          }),
        })

        const body = response.body
        if (!body) throw new Error('No response body')
        const reader = body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            if (payload === '[DONE]') {
              setChatStreaming(false)
              return
            }

            try {
              const parsed = JSON.parse(payload)
              if (parsed.text) {
                setChatMessages((prev) => {
                  const msgs = [...(prev[insightId] || [])]
                  const lastMsg = msgs[msgs.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') {
                    msgs[msgs.length - 1] = {
                      ...lastMsg,
                      content: lastMsg.content + parsed.text,
                    }
                  }
                  return { ...prev, [insightId]: msgs }
                })
              }
            } catch {
              // skip malformed SSE
            }
          }
        }

        setChatStreaming(false)
      } catch (error) {
        console.error('Chat error:', error)
        setChatStreaming(false)
      }
    },
    [activeInsight, lifiData, chatMessages],
  )

  const buildInsightContexts = useCallback(() => {
    return insights
      .filter((i) => selectedIds.has(i.id))
      .map((i) => {
        let context = `${i.title}: ${i.description}\nKey metric: ${i.metric} (${i.trendValue})\nSupporting data: ${i.dataPoints.join('; ')}`

        if (includeChatIds.has(i.id)) {
          const msgs = chatMessages[i.id]
          if (msgs && msgs.length > 0) {
            const chatSummary = msgs
              .filter((m) => m.content.trim())
              .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`)
              .join('\n')
            context += `\n\nDiscussion notes:\n${chatSummary}`
          }
        }

        return context
      })
  }, [insights, selectedIds, chatMessages, includeChatIds])

  const streamPost = useCallback(
    async (
      contextTexts: string[],
      data: Record<string, unknown>,
      tone: Tone,
      type: ContentType,
      feedback?: string,
    ) => {
      setPosts((prev) => ({
        ...prev,
        [tone]: { tone, content: '', isStreaming: true },
      }))

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contexts: contextTexts, data, tone, contentType: type, feedback }),
        })

        const body = response.body
        if (!body) throw new Error('No response body')
        const reader = body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)

            if (payload === '[DONE]') {
              setPosts((prev) => ({
                ...prev,
                [tone]: { ...prev[tone], isStreaming: false },
              }))
              return
            }

            try {
              const parsed = JSON.parse(payload)
              if (parsed.text) {
                setPosts((prev) => ({
                  ...prev,
                  [tone]: { ...prev[tone], content: prev[tone].content + parsed.text },
                }))
              }
              if (parsed.error) {
                setPosts((prev) => ({
                  ...prev,
                  [tone]: {
                    ...prev[tone],
                    content: `Error: ${parsed.error}`,
                    isStreaming: false,
                  },
                }))
                return
              }
            } catch {
              // skip malformed SSE
            }
          }
        }

        setPosts((prev) => ({
          ...prev,
          [tone]: { ...prev[tone], isStreaming: false },
        }))
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setPosts((prev) => ({
          ...prev,
          [tone]: { ...prev[tone], content: `Error: ${message}`, isStreaming: false },
        }))
      }
    },
    [],
  )

  const simulateTyping = useCallback((content: string, tone: Tone) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
    setIsGenerating(true)
    setPosts({ [tone]: { tone, content: '', isStreaming: true } })
    let i = 0
    typingIntervalRef.current = setInterval(() => {
      const chunk = Math.min(i + 10, content.length)
      setPosts({ [tone]: { tone, content: content.slice(0, chunk), isStreaming: chunk < content.length } })
      i = chunk
      if (i >= content.length) {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
        setIsGenerating(false)
      }
    }, 32)
  }, [])

  const handleGenerate = useCallback(
    async (type: ContentType, tone: Tone) => {
      const contexts = buildInsightContexts()
      if (contexts.length === 0) return

      setContentType(type)
      setSelectedTone(tone)
      setView('create')
      window.scrollTo(0, 0)

      if (selectedExampleId) {
        const ex = examples.find((e) => e.id === selectedExampleId)
        if (ex) {
          const match = ex.posts.find((p) => p.contentType === type && p.tone === tone)
          if (match) {
            simulateTyping(match.content, tone)
            return
          }
        }
      }

      setIsGenerating(true)
      setPosts({})

      const data = lifiData
        ? Object.fromEntries(Object.entries(lifiData).filter(([key]) => key !== '_meta'))
        : {}

      await streamPost(contexts, data, tone, type)
      setIsGenerating(false)
    },
    [buildInsightContexts, lifiData, streamPost, selectedExampleId, examples, simulateTyping],
  )

  const handleRegenerate = useCallback(
    async (tone: Tone, feedback?: string) => {
      const contexts = buildInsightContexts()
      const data = lifiData
        ? Object.fromEntries(Object.entries(lifiData).filter(([key]) => key !== '_meta'))
        : {}
      setSelectedTone(tone)
      await streamPost(contexts, data, tone, contentType, feedback)
    },
    [buildInsightContexts, lifiData, contentType, streamPost],
  )

  const handleEdit = useCallback(
    (content: string) => {
      setPosts((prev) => ({
        ...prev,
        [selectedTone]: { ...prev[selectedTone], tone: selectedTone, content, isStreaming: false },
      }))
      if (selectedExampleId) setSelectedExampleId(null)
      if (editingSavedPostId) updatePost(editingSavedPostId, content)
    },
    [selectedTone, selectedExampleId, editingSavedPostId, updatePost],
  )

  const handleOpenSavedPost = useCallback(
    (post: import('./lib/types').SavedPost) => {
      setEditingSavedPostId(post.id)
      setContentType(post.contentType)
      setSelectedTone(post.tone)
      setPosts({ [post.tone]: { tone: post.tone, content: post.content, isStreaming: false } })
      setSelectedExampleId(null)
      setView('create')
      window.scrollTo(0, 0)
    },
    [],
  )

  const handleAccept = useCallback((post: GeneratedPost) => {
    setPreviewPost(post)
    setJustSaved(false)
  }, [])

  const handleSavePost = useCallback(() => {
    if (previewPost) {
      savePost(previewPost.content, previewPost.tone, contentType)
      setJustSaved(true)
    }
  }, [previewPost, savePost, contentType])

  const handleBackToInsights = useCallback(() => {
    setView('insights')
    setActiveInsightId(null)
    setPosts({})
    setEditingSavedPostId(null)
    window.scrollTo(0, 0)
  }, [])

  const toggleCategory = useCallback((cat: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size <= 1) return prev
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  const selectedInsights = insights.filter((i) => selectedIds.has(i.id))

  const presentCategories = useMemo(
    () => new Set(insights.map((i) => i.category)),
    [insights],
  )

  const allSelected = categoryFilter.size === ALL_CATEGORIES.length
  const filteredInsights = allSelected
    ? insights
    : insights.filter((i) => categoryFilter.has(i.category))


  return (
    <div className="min-h-screen bg-gray-50 lifi-bg">
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4 z-50">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] lifi-gradient" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="132" height="48" fill="none" viewBox="0 0 132 48" className="h-8 w-auto" role="img" aria-label="LI.FI">
              <title>LI.FI</title>
              <path fill="#5C67FF" d="m19.314 0 9.878 9.879a3 3 0 0 1 0 4.242L23.314 20l-4-4c-4.419-4.418-4.419-11.582 0-16Z"/>
              <path fill="#5C67FF" fillRule="evenodd" d="m19.314 48-16-16c-4.419-4.418-4.419-11.582 0-16l13.878 13.879a3 3 0 0 0 4.243 0L35.314 16c4.418 4.418 4.418 11.582 0 16l-16 16Z" clipRule="evenodd"/>
              <path fill="#1a1a2e" d="M123.319 36s.034-21 0-22 .985-2 1.966-2h4.034v22c.035 1-.965 2-1.965 2h-4.035ZM99.32 14v22h6v-8h10c1 0 2-1 2-2v-4h-12v-4h12c1 0 2-1 2-2v-4h-18c-1 0-2 1-2 2Zm-9.998 18c0-1 1-2 2-2h2c1 0 2 1 2 2v2c0 1-1 2-2 2h-2c-1 0-2-1-2-2v-2Zm-10.001 4s.034-21 0-22 .985-2 1.966-2h4.034v22c.035 1-.965 2-1.965 2h-4.035ZM55.32 30V14c0-1 .87-2 2-2h4v18h14v4c0 1-1 2-2 2h-18v-6Z"/>
            </svg>
            <span className="text-sm font-medium text-gray-600">Content Generator</span>
          </div>
          <div className="flex items-center gap-3">
            {view !== 'saved' && (
              <button
                type="button"
                onClick={() => { setView('saved'); window.scrollTo(0, 0) }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 relative"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                Saved
                {savedPosts.length > 0 && (
                  <span className="bg-lifi-100 text-lifi-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {savedPosts.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {view === 'insights' && (
        <div className="flex flex-col h-screen pt-[65px]">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div
              className={selectedIds.size > 0 ? 'pb-40 sm:pb-24' : ''}
            >
              <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Data Insights</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Select insights to generate content.
                  </p>
                </div>
                {examples.length > 0 && (
                  <div className="relative flex-shrink-0">
                    <select
                      value={selectedExampleId || ''}
                      onChange={(e) => handleExampleChange(e.target.value || null)}
                      className={`appearance-none text-sm font-medium pl-3 pr-8 py-1.5 rounded-lg border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-lifi-500/20 focus:border-lifi-500 ${
                        selectedExampleId
                          ? 'bg-lifi-50 border-lifi-200 text-lifi-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <option value="">Examples: Off</option>
                      {examples.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.label}</option>
                      ))}
                    </select>
                    <svg className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${selectedExampleId ? 'text-lifi-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>

              {insightsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-600">{insightsError}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {ALL_CATEGORIES.map((cat) => {
                  const active = categoryFilter.has(cat)
                  const present = presentCategories.has(cat)
                  const disabled = insightsLoading || !present || !!selectedExampleId
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      } ${
                        active && present
                          ? CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  )
                })}
              </div>

              <InsightsGrid
                insights={filteredInsights}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onOpenChat={handleOpenChat}
                loading={insightsLoading}
                locked={!!selectedExampleId}
                onLoadMore={handleLoadMore}
              />
            </div>
          </main>

        </div>
      )}

      {view === 'insights' && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-lg z-40">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                {selectedIds.size} insight{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex gap-1 overflow-hidden">
                {selectedInsights.slice(0, 2).map((i) => (
                  <span
                    key={i.id}
                    className="text-xs bg-lifi-100 text-lifi-700 px-2 py-0.5 rounded-full truncate max-w-[120px]"
                  >
                    {i.title}
                  </span>
                ))}
                {selectedInsights.length > 2 && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    +{selectedInsights.length - 2} more
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setContentType('post')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    contentType === 'post'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Short
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('article')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    contentType === 'article'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Long
                </button>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setSelectedTone(tone)}
                    className={`px-2 sm:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      selectedTone === tone
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {TONE_LABELS[tone]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleGenerate(contentType, selectedTone)}
                className="px-4 sm:px-5 py-2.5 lifi-gradient-btn text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-lifi-500/25 flex-shrink-0"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'chat' && activeInsight && (
        <main className="pt-[65px] h-screen flex flex-col">
          <div className="max-w-2xl mx-auto w-full px-6 pt-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackToInsights}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Back to Insights"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Discuss Insight</h2>
            </div>
          </div>
          <div className="max-w-2xl mx-auto w-full flex-1 min-h-0">
            <InsightChat
              insight={activeInsight}
              messages={chatMessages[activeInsight.id] || []}
              isStreaming={chatStreaming}
              isSelected={selectedIds.has(activeInsight.id)}
              includeChatContext={includeChatIds.has(activeInsight.id)}
              onSendMessage={sendChatMessage}
              onToggleSelect={() => toggleSelect(activeInsight.id)}
              onToggleIncludeChat={() => toggleIncludeChat(activeInsight.id)}
            />
          </div>
        </main>
      )}

      {view === 'create' && (
        <main className="overflow-y-auto p-6 pt-[calc(65px+1.5rem)]">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleBackToInsights}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Back to Insights"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Create Content</h2>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => !isGenerating && handleGenerate('post', selectedTone)}
                  disabled={isGenerating}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    contentType === 'post'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Short
                </button>
                <button
                  type="button"
                  onClick={() => !isGenerating && handleGenerate('article', selectedTone)}
                  disabled={isGenerating}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    contentType === 'article'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Long
                </button>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => !isGenerating && handleGenerate(contentType, tone)}
                    disabled={isGenerating}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedTone === tone
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {TONE_LABELS[tone]}
                  </button>
                ))}
              </div>
            </div>

            {editingSavedPostId ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Editing saved post
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Creating from {selectedInsights.length} insight
                  {selectedInsights.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedInsights.map((i) => (
                    <span
                      key={i.id}
                      className="text-sm bg-lifi-50 text-lifi-700 px-3 py-1 rounded-full border border-lifi-200"
                    >
                      {i.title} &mdash; {i.metric}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {posts[selectedTone] && (
              <PostCard
                post={posts[selectedTone]}
                contentType={contentType}
                onRegenerate={handleRegenerate}
                onAccept={handleAccept}
                onEdit={handleEdit}
              />
            )}

            {!posts[selectedTone] && !isGenerating && (
              <div className="text-center text-gray-400 mt-20">
                <p className="text-lg">Content will appear here</p>
              </div>
            )}
          </div>
        </main>
      )}

      {view === 'saved' && (
        <main className="overflow-y-auto p-6 pt-[calc(65px+1.5rem)]">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={handleBackToInsights}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Back to Insights"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Saved Posts</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">{savedPosts.length} saved post{savedPosts.length !== 1 ? 's' : ''}</p>
            <SavedPosts posts={savedPosts} onDelete={deletePost} onOpen={handleOpenSavedPost} />
          </div>
        </main>
      )}

      {previewPost && (
        <PostPreview
          post={previewPost}
          contentType={contentType}
          onClose={() => setPreviewPost(null)}
          onSave={handleSavePost}
          isSaved={justSaved}
        />
      )}
    </div>
  )
}
