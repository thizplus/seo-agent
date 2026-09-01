import type { Keyword } from "@/features/keywords"

export interface SitePage {
  id: string
  siteId: string
  url: string
  title: string
  h1: string
  metaDescription: string
  pageType: string
  wordCount: number
  keywords: Keyword[]
  auditScore?: number
  lastAnalyzedAt?: string
  lastCrawledAt: string
  createdAt: string
}

export interface AuditIssue {
  type: string
  severity: "critical" | "warning"
  message: string
}

export interface PageAnalysis {
  pageId: string
  analyzedAt: string
  ourWordCount: number
  ourH1: string
  ourMeta: string
  ourH2Count: number
  avgWordCount: number
  competitionCount: number
  auditScore: number
  issues: AuditIssue[]
  recommendations: string[]
  serpSnapshots: Record<string, {
    our_position: number
    avg_word_count: number
    results: { position: number; url: string; title: string; word_count: number }[]
  }>
}
