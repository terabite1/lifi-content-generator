export type Tone = 'professional' | 'casual' | 'technical'

export interface ContextBlock {
  id: string
  label: string
  content: string
  enabled: boolean
}

export interface DataSource {
  id: string
  label: string
  enabled: boolean
  value: unknown
  loading: boolean
}

export interface GeneratedPost {
  tone: Tone
  content: string
  isStreaming: boolean
}

export type LifiData = Record<string, unknown>

export type ContentType = 'post' | 'article'

export interface Insight {
  id: string
  title: string
  description: string
  category: 'growth' | 'volume' | 'revenue' | 'adoption' | 'technical' | 'ecosystem'
  metric: string
  trend: 'up' | 'down' | 'neutral'
  trendValue: string
  dataPoints: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ExamplePost {
  contentType: ContentType
  tone: Tone
  content: string
}

export interface Example {
  id: string
  label: string
  insights_used: string[]
  posts: ExamplePost[]
}

export interface SavedPost {
  id: string
  content: string
  tone: Tone
  contentType: ContentType
  savedAt: number
}
