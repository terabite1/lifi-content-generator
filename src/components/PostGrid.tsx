import type { ContentType, GeneratedPost, Tone } from '../lib/types'
import { PostCard } from './PostCard'

interface Props {
  posts: Record<string, GeneratedPost>
  contentType?: ContentType
  onRegenerate: (tone: Tone, feedback?: string) => void
  onAccept: (post: GeneratedPost) => void
}

const TONES: Tone[] = ['professional', 'casual', 'technical']

export function PostGrid({ posts, contentType = 'post', onRegenerate, onAccept }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {TONES.map((tone) => {
        const post = posts[tone]
        if (!post) return null
        return (
          <PostCard
            key={tone}
            post={post}
            contentType={contentType}
            onRegenerate={onRegenerate}
            onAccept={onAccept}
          />
        )
      })}
    </div>
  )
}
