import { useCallback, useState } from 'react'

import type { ContentType, SavedPost, Tone } from './types'

const STORAGE_KEY = 'lifi-saved-posts'

function load(): SavedPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(posts: SavedPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export function useSavedPosts() {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(load)

  const savePost = useCallback((content: string, tone: Tone, contentType: ContentType) => {
    const post: SavedPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      tone,
      contentType,
      savedAt: Date.now(),
    }
    setSavedPosts((prev) => {
      const next = [post, ...prev]
      persist(next)
      return next
    })
  }, [])

  const updatePost = useCallback((id: string, content: string) => {
    setSavedPosts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, content } : p))
      persist(next)
      return next
    })
  }, [])

  const deletePost = useCallback((id: string) => {
    setSavedPosts((prev) => {
      const next = prev.filter((p) => p.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { savedPosts, savePost, updatePost, deletePost }
}
