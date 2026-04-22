import { useState } from 'react'

import type { ContentType, GeneratedPost } from '../lib/types'
import { FormattedContent } from './FormattedContent'

interface Props {
  post: GeneratedPost
  contentType?: ContentType
  onClose: () => void
  onSave?: () => void
  isSaved?: boolean
}

export function PostPreview({ post, contentType = 'post', onClose, onSave, isSaved }: Props) {
  const [text] = useState(post.content)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charLimit = contentType === 'article' ? 10000 : 3000
  const charCount = text.length
  const isOverLimit = charCount > charLimit

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {contentType === 'article' ? 'Article' : 'Post'} Preview
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full lifi-gradient flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 64 64" className="w-7 h-7" role="img" aria-label="LI.FI">
                  <title>LI.FI</title>
                  <path fill="#fff" d="m31.751 0 13.172 13.171a4 4 0 0 1 0 5.657l-7.838 7.838-5.334-5.333c-5.89-5.89-5.89-15.442 0-21.333Z"/>
                  <path fill="#fff" fillRule="evenodd" d="M31.752 64 10.418 42.667c-5.89-5.891-5.89-15.443 0-21.334l18.505 18.505a4 4 0 0 0 5.657 0l18.505-18.505c5.891 5.891 5.891 15.443 0 21.334L31.752 64Z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">LI.FI</p>
                <p className="text-xs text-gray-500">Cross-chain liquidity protocol</p>
              </div>
            </div>
            <div className="text-sm text-gray-800">
              <FormattedContent content={text} />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}>
              {charCount.toLocaleString()} / {charLimit.toLocaleString()} characters
            </span>
            {isOverLimit && (
              <span className="text-red-500 text-xs">Over LinkedIn's character limit</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaved}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all inline-flex items-center gap-1.5 ${
                  isSaved
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-lifi-600 text-white hover:bg-lifi-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
