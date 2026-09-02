export interface Article {
  id: string
  siteId: string
  keywordId: string | null
  title: string
  slug: string
  content: string
  contentVersion: number
  metaDescription: string
  schemaMarkup: Record<string, unknown> | null
  eeatScore: EEATScore | null
  status: "pending" | "generating" | "completed" | "failed"
  publishStatus: "draft" | "scheduled" | "published" | "updated"
  publishedUrl: string
  cmsPostId: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface EEATScore {
  experience: number
  expertise: number
  authority: number
  trust: number
}

export interface GenerateArticleRequest {
  siteId: string
  keywordId: string
  customTitle?: string
  writingTone?: string
  contentGuide?: string
}
