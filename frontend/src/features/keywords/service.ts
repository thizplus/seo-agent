import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { Keyword, CreateKeywordRequest } from "./types"

export const keywordService = {
  async getBySiteId(siteId: string): Promise<Keyword[]> {
    const res = await apiClient.get<{ data: Keyword[] }>(
      API_ROUTES.KEYWORDS.LIST(siteId)
    )
    return res.data.data
  },

  async create(siteId: string, data: CreateKeywordRequest): Promise<Keyword> {
    const res = await apiClient.post<{ data: Keyword }>(
      API_ROUTES.KEYWORDS.CREATE(siteId),
      data
    )
    return res.data.data
  },

  async analyzeSERP(siteId: string, kwId: string): Promise<any> {
    const res = await apiClient.post(API_ROUTES.KEYWORDS.ANALYZE_SERP(siteId, kwId))
    return res.data.data
  },
}
