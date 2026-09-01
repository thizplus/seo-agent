import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { SitePage, PageAnalysis } from "./types"

// re-export for convenience
export type { PageAnalysis }

export const pageService = {
  async getBySiteId(siteId: string): Promise<SitePage[]> {
    const res = await apiClient.get<{ data: SitePage[] }>(API_ROUTES.PAGES.LIST(siteId))
    return res.data.data
  },

  async analyzePage(siteId: string, pageId: string): Promise<PageAnalysis> {
    const res = await apiClient.post<{ data: PageAnalysis }>(API_ROUTES.PAGES.ANALYZE(siteId, pageId))
    return res.data.data
  },

  async getAnalysis(siteId: string, pageId: string): Promise<PageAnalysis> {
    const res = await apiClient.get<{ data: PageAnalysis }>(API_ROUTES.PAGES.ANALYSIS(siteId, pageId))
    return res.data.data
  },
}
