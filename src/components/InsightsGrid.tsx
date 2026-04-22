import { useEffect, useRef, useState } from 'react'

import type { Insight } from '../lib/types'

interface Props {
  insights: Insight[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onOpenChat: (id: string) => void
  loading: boolean
  locked?: boolean
  onLoadMore: () => void
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  growth: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  volume: { bg: 'bg-blue-100', text: 'text-blue-700' },
  revenue: { bg: 'bg-amber-100', text: 'text-amber-700' },
  adoption: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  technical: { bg: 'bg-purple-100', text: 'text-purple-700' },
  ecosystem: { bg: 'bg-teal-100', text: 'text-teal-700' },
}

const TREND_STYLES: Record<string, string> = {
  up: 'text-emerald-600',
  down: 'text-red-500',
  neutral: 'text-gray-500',
}

const TREND_ARROWS: Record<string, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
}

export function InsightsGrid({
  insights,
  selectedIds,
  onToggleSelect,
  onOpenChat,
  loading,
  locked = false,
  onLoadMore,
}: Props) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const knownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const newInsights = insights.filter((i) => !knownIdsRef.current.has(i.id))

    if (newInsights.length === 0 && insights.length === 0) {
      knownIdsRef.current = new Set()
      setRevealedIds(new Set())
      return
    }

    for (const i of newInsights) knownIdsRef.current.add(i.id)

    newInsights.forEach((insight, i) => {
      setTimeout(() => {
        setRevealedIds((prev) => new Set(prev).add(insight.id))
      }, i * 80)
    })
  }, [insights])

  if (loading && insights.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
              <div className="w-10 h-5 bg-gray-200 rounded" />
            </div>
            <div className="w-3/4 h-5 bg-gray-200 rounded mb-2" />
            <div className="w-1/2 h-8 bg-gray-200 rounded mb-3" />
            <div className="w-full h-4 bg-gray-100 rounded mb-1" />
            <div className="w-5/6 h-4 bg-gray-100 rounded mb-4" />
            <div className="flex gap-1">
              <div className="w-20 h-5 bg-gray-100 rounded" />
              <div className="w-24 h-5 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const skeletonCount = loading ? 6 - (insights.length % 6) : 0

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        {insights.map((insight) => {
          const selected = selectedIds.has(insight.id)
          const catStyle = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.growth
          const revealed = revealedIds.has(insight.id)
          const dimmed = locked && !selected

          return (
            <div
              key={insight.id}
              className={`flex flex-col rounded-xl border-2 p-5 transition-all duration-500 ${
                revealed
                  ? dimmed ? 'opacity-60 translate-y-0' : 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              } ${
                selected
                  ? 'border-lifi-600 bg-lifi-50/50 shadow-md shadow-lifi-600/10'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}
                  >
                    {insight.category}
                  </span>
                  <span className={`text-xs font-semibold ${TREND_STYLES[insight.trend]}`}>
                    {TREND_ARROWS[insight.trend]} {insight.trendValue}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={locked}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSelect(insight.id)
                  }}
                  className={`min-w-[20px] min-h-[20px] w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                    locked
                      ? selected
                        ? 'bg-lifi-600 border-lifi-600 text-white opacity-50 cursor-not-allowed'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                      : selected
                        ? 'bg-lifi-600 border-lifi-600 text-white'
                        : 'border-gray-300 hover:border-lifi-400'
                  }`}
                >
                  {selected && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      role="img"
                    aria-label="Selected"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-1">{insight.title}</h3>
              <p className="text-2xl font-bold text-lifi-600 mb-2">{insight.metric}</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">{insight.description}</p>

              <div className="flex flex-wrap gap-1">
                {insight.dataPoints.slice(0, 3).map((dp) => (
                  <span
                    key={dp}
                    className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                  >
                    {dp}
                  </span>
                ))}
              </div>

              <button
                type="button"
                disabled={dimmed}
                onClick={() => onOpenChat(insight.id)}
                className={`mt-auto pt-3 text-xs font-medium text-left ${
                  dimmed
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-lifi-600 hover:text-lifi-700'
                }`}
              >
                Discuss this insight &rarr;
              </button>
            </div>
          )
        })}
        {Array.from({ length: skeletonCount }, (_, i) => `skeleton-${insights.length + i}`).map((key) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
              <div className="w-10 h-5 bg-gray-200 rounded" />
            </div>
            <div className="w-3/4 h-5 bg-gray-200 rounded mb-2" />
            <div className="w-1/2 h-8 bg-gray-200 rounded mb-3" />
            <div className="w-full h-4 bg-gray-100 rounded mb-1" />
            <div className="w-5/6 h-4 bg-gray-100 rounded mb-4" />
            <div className="flex gap-1">
              <div className="w-20 h-5 bg-gray-100 rounded" />
              <div className="w-24 h-5 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {insights.length > 0 && !locked && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className={`px-5 py-2.5 text-sm font-medium border-2 rounded-lg transition-colors ${
              loading
                ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                : 'text-lifi-600 bg-white border-lifi-200 hover:bg-lifi-50 hover:border-lifi-400'
            }`}
          >
            More insights
          </button>
        </div>
      )}
    </div>
  )
}
