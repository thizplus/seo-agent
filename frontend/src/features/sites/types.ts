export interface Site {
  id: string
  name: string
  url: string
  description: string
  businessType: string
  industry: string
  brandVoice: string
  analysisStatus: string
  llmProvider: string
  hasLlmKey: boolean
  hasWordPress: boolean
  hasGsc: boolean
  gscSiteUrl: string
  createdAt: string
  updatedAt: string
}

export interface CreateSiteRequest {
  name: string
  url: string
  description?: string
  industry?: string
  llmProvider?: string
  llmApiKey?: string
  wpUrl?: string
  wpUsername?: string
  wpAppPassword?: string
}

export interface UpdateSiteRequest {
  name?: string
  url?: string
  description?: string
  industry?: string
  llmProvider?: string
  llmApiKey?: string
  wpUrl?: string
  wpUsername?: string
  wpAppPassword?: string
}

export interface TopicClusterResult {
  pillarKeyword: string
  pillarTitle: string
  supportingKeywords: { keyword: string; title: string; relationship: string }[]
  linkMap: { from: string; to: string; anchorText: string }[]
}

export interface PipelineStep {
  name: string
  status: string
  data: any
}

export interface PipelineResult {
  steps?: PipelineStep[]
  message?: string
}

export interface SiteMember {
  id: string
  siteId: string
  email: string
  role: "owner" | "editor"
  joined: boolean
  createdAt?: string
}

export interface FocusQueueItem {
  id: string
  siteId: string
  priority: number
  pillarUrl: string
  primaryKeyword: string
  secondaryKeywords: string
  customPrompt: string
  status: "pending" | "completed" | "failed" | "skipped"
  articleId?: string
  errorMessage?: string
  retryCount: number
  completedAt?: string
  createdAt: string
}

export interface FocusQueueStatus {
  total: number
  completed: number
  pending: number
  failed: number
  skipped: number
  progress: string
  estimatedDaysLeft: number
  nextKeyword?: { priority: number; primaryKeyword: string; secondaryKeywords: string }
}

export interface CompetitorResult {
  url: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  contentGaps: { keyword: string; opportunity: string }[]
  topPages: { url: string; title: string; wordCount: number }[]
  recommendations: string[]
}
