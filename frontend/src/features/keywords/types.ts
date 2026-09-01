export interface SERPResult {
  url: string
  title: string
  word_count?: number
}

export interface SERPData {
  avg_word_count?: number
  results?: SERPResult[]
  intent?: string
  competition_count?: number
}

export interface Keyword {
  id: string
  siteId: string
  keyword: string
  searchVolume: number
  difficulty: number
  intent: string
  score: number
  source: string
  serpData: SERPData | null
  createdAt: string
}

export interface CreateKeywordRequest {
  keyword: string
}
