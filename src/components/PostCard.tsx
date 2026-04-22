import { useEffect, useRef, useState } from 'react'

import type { ContentType, GeneratedPost, Tone } from '../lib/types'
import { FormattedContent } from './FormattedContent'

interface Props {
  post: GeneratedPost
  contentType?: ContentType
  onRegenerate: (tone: Tone, feedback?: string) => void
  onAccept: (post: GeneratedPost) => void
  onEdit?: (content: string) => void
}

const TONE_COLORS: Record<Tone, string> = {
  professional: 'bg-blue-100 text-blue-700',
  casual: 'bg-green-100 text-green-700',
  technical: 'bg-purple-100 text-purple-700',
}

const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professional',
  casual: 'Casual',
  technical: 'Technical',
}

export function PostCard({ post, contentType = 'post', onRegenerate, onAccept, onEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reviseInputRef = useRef<HTMLInputElement>(null)

  const charLimit = contentType === 'article' ? 10000 : 3000
  const charCount = post.content.length
  const isOverLimit = charCount > charLimit

  useEffect(() => {
    if (post.isStreaming) {
      setIsEditing(false)
      setShowFeedback(false)
    }
  }, [post.isStreaming])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
      el.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (showFeedback) {
      reviseInputRef.current?.focus()
    }
  }, [showFeedback])

  const handleFeedbackSubmit = () => {
    if (!feedback.trim()) return
    onRegenerate(post.tone, feedback.trim())
    setFeedback('')
    setShowFeedback(false)
    setIsEditing(false)
  }

  const handleTextareaInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TONE_COLORS[post.tone]}`}>
            {TONE_LABELS[post.tone]}
          </span>
          {post.isStreaming && (
            <span className="text-xs text-gray-400 animate-pulse">Generating...</span>
          )}
        </div>
        {!post.isStreaming && (
          <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {post.content.trim() ? post.content.trim().split(/\s+/).length : 0} words
          </span>
        )}
      </div>

      <div className="p-4 flex-1">
        {isEditing && !post.isStreaming ? (
          <textarea
            ref={textareaRef}
            value={post.content}
            onChange={(e) => onEdit?.(e.target.value)}
            onInput={handleTextareaInput}
            onFocus={handleTextareaInput}
            className="w-full text-sm text-gray-800 leading-relaxed min-h-[300px] resize-none border-0 outline-none focus:ring-0 p-0"
          />
        ) : (
          <div className="text-sm text-gray-800 min-h-[120px]">
            <FormattedContent content={post.content} showCursor={post.isStreaming} />
          </div>
        )}
      </div>

      {!post.isStreaming && post.content && (
        <div className="px-4 py-3 border-t border-gray-100">
          {showFeedback ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setShowFeedback(false); setFeedback('') }}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 flex items-center border border-gray-200 rounded-full bg-white overflow-hidden focus-within:border-lifi-400 focus-within:ring-1 focus-within:ring-lifi-400 transition-colors">
                <input
                  ref={reviseInputRef}
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFeedbackSubmit()
                    if (e.key === 'Escape') { setShowFeedback(false); setFeedback('') }
                  }}
                  placeholder="What should change?"
                  className="flex-1 text-sm bg-transparent border-0 px-4 py-2 focus:ring-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleFeedbackSubmit}
                  disabled={!feedback.trim()}
                  className="px-3 py-2 text-lifi-600 hover:text-lifi-700 disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing)
                  setShowFeedback(false)
                }}
                className={`flex-1 px-3 py-1.5 border text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                  isEditing
                    ? 'border-lifi-300 text-lifi-600 bg-lifi-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                {isEditing ? 'Preview' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={() => { setShowFeedback(true); setIsEditing(false) }}
                className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Revise
              </button>
              <button
                type="button"
                onClick={() => onAccept(post)}
                className="flex-1 px-3 py-1.5 lifi-gradient-btn text-white text-sm font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1.5"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
