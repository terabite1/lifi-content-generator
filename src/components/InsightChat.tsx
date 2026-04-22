import { useEffect, useRef, useState } from 'react'

import type { ChatMessage, Insight } from '../lib/types'
import { FormattedContent } from './FormattedContent'

interface Props {
  insight: Insight
  messages: ChatMessage[]
  isStreaming: boolean
  isSelected: boolean
  includeChatContext: boolean
  onSendMessage: (message: string) => void
  onToggleSelect: () => void
  onToggleIncludeChat: () => void
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

export function InsightChat({
  insight,
  messages,
  isStreaming,
  isSelected,
  includeChatContext,
  onSendMessage,
  onToggleSelect,
  onToggleIncludeChat,
}: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const catStyle = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.growth

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    onSendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${catStyle.bg} ${catStyle.text}`}
                >
                  {insight.category}
                </span>
                <p className="text-2xl font-bold text-lifi-600 flex-shrink-0">{insight.metric}</p>
                <span className={`text-sm font-medium flex-shrink-0 ${TREND_STYLES[insight.trend]}`}>
                  {insight.trend === 'up' ? '↑' : insight.trend === 'down' ? '↓' : '→'}{' '}
                  {insight.trendValue}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleSelect}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-lifi-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:border-lifi-400'
                }`}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{insight.title}</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {insight.dataPoints.map((dp, i) => (
                <span
                  key={i}
                  className="text-xs bg-lifi-50 text-lifi-700 px-2 py-0.5 rounded border border-lifi-200"
                >
                  {dp}
                </span>
              ))}
            </div>
            {messages.length > 0 && isSelected && (
              <button
                type="button"
                onClick={onToggleIncludeChat}
                className={`mt-3 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  includeChatContext ? 'text-lifi-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  includeChatContext
                    ? 'bg-lifi-600 border-lifi-600 text-white'
                    : 'border-gray-300'
                }`}>
                  {includeChatContext && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                Include chat context in generation
              </button>
            )}
          </div>

          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Ask questions about this insight to explore it further before creating content.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] text-sm rounded-xl px-4 py-2.5 ${
                  msg.role === 'user' ? 'bg-lifi-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <FormattedContent
                    content={msg.content}
                    showCursor={i === messages.length - 1 && isStreaming}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center border border-gray-200 rounded-full bg-white overflow-hidden focus-within:border-lifi-400 focus-within:ring-1 focus-within:ring-lifi-400 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about this insight..."
              disabled={isStreaming}
              className="flex-1 text-sm bg-transparent border-0 px-4 py-2 focus:ring-0 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-3 py-2 text-lifi-600 hover:text-lifi-700 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
