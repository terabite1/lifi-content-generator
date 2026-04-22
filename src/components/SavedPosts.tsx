import type { SavedPost } from '../lib/types'

interface Props {
  posts: SavedPost[]
  onDelete: (id: string) => void
  onOpen: (post: SavedPost) => void
}

const TONE_COLORS: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-700',
  casual: 'bg-green-100 text-green-700',
  technical: 'bg-purple-100 text-purple-700',
}

function getPreview(content: string, maxLines = 3): string {
  const lines = content.split('\n').filter((l) => l.trim())
  return lines.slice(0, maxLines).join('\n')
}

export function SavedPosts({ posts, onDelete, onOpen }: Props) {
  if (posts.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-20">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        <p className="text-lg">No saved posts yet</p>
        <p className="text-sm mt-1">Posts you save will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TONE_COLORS[post.tone] || 'bg-gray-100 text-gray-700'}`}>
                {post.tone.charAt(0).toUpperCase() + post.tone.slice(1)}
              </span>
              <span className="text-xs text-gray-400">
                {post.contentType === 'article' ? 'Article' : 'Post'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(post.savedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors inline-flex items-center justify-center"
              aria-label="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="w-full px-4 pt-3 pb-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-line">{getPreview(post.content)}</p>
            <span className="text-xs text-lifi-600 font-medium mt-2 inline-block">More...</span>
          </button>
        </div>
      ))}
    </div>
  )
}
