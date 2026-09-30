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
  featuredImageUrl: string
  cmsPostId: string
  wordCount: number
  indexStatus: string
  indexCoverage: string
  lastInspectedAt: string | null
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

export interface ArticleMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  indexed: boolean
  queries: ArticleQuery[]
}

export interface ArticleQuery {
  query: string
  clicks: number
  impressions: number
}

export interface URLInspectionResult {
  verdict: string
  coverageState: string
  robotsTxtState: string
  indexingState: string
  lastCrawlTime: string
  pageFetchState: string
  crawledAs: string
}

export interface MetricsHistoryPoint {
  checkedAt: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  indexed: boolean
}
