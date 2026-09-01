import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { Site, CreateSiteRequest, UpdateSiteRequest, TopicClusterResult, CompetitorResult, PipelineResult } from "./types"

export const siteService = {
  async getAll(): Promise<Site[]> {
    const res = await apiClient.get<{ data: Site[] }>(API_ROUTES.SITES.LIST)
    return res.data.data
  },

  async getById(id: string): Promise<Site> {
    const res = await apiClient.get<{ data: Site }>(API_ROUTES.SITES.BY_ID(id))
    return res.data.data
  },

  async create(data: CreateSiteRequest): Promise<Site> {
    const res = await apiClient.post<{ data: Site }>(API_ROUTES.SITES.CREATE, data)
    return res.data.data
  },

  async update(id: string, data: UpdateSiteRequest): Promise<Site> {
    const res = await apiClient.put<{ data: Site }>(API_ROUTES.SITES.UPDATE(id), data)
    return res.data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SITES.DELETE(id))
  },

  async discoverKeywords(id: string, seedKeywords: string[]): Promise<any[]> {
    const res = await apiClient.post(API_ROUTES.SITES.DISCOVER_KEYWORDS(id), { seedKeywords })
    return res.data.data
  },

  async analyze(id: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post(API_ROUTES.SITES.ANALYZE(id))
    return res.data.data
  },

  getGscConnectURL(id: string): string {
    return API_ROUTES.SITES.GSC_CONNECT(id)
  },

  async getGscProperties(id: string): Promise<{ properties: { siteUrl: string; permission: string }[]; selectedUrl: string }> {
    const res = await apiClient.get(API_ROUTES.SITES.GSC_PROPERTIES(id))
    return res.data.data
  },

  async selectGscProperty(id: string, siteUrl: string): Promise<void> {
    await apiClient.post(API_ROUTES.SITES.GSC_SELECT(id), { siteUrl })
  },

  async disconnectGsc(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SITES.GSC_DISCONNECT(id))
  },

  async createCluster(id: string, keywords: string[]): Promise<TopicClusterResult> {
    const res = await apiClient.post<{ data: TopicClusterResult }>(API_ROUTES.SITES.CREATE_CLUSTER(id), { keywords })
    return res.data.data
  },

  async runPipeline(id: string, maxArticles: number = 3): Promise<PipelineResult> {
    const res = await apiClient.post<{ data: PipelineResult }>(API_ROUTES.SITES.RUN_PIPELINE(id), { maxArticles })
    return res.data.data
  },

  async analyzeCompetitor(id: string, competitorUrl: string): Promise<CompetitorResult> {
    const res = await apiClient.post<{ data: CompetitorResult }>(API_ROUTES.SITES.ANALYZE_COMPETITOR(id), { competitorUrl })
    return res.data.data
  },
}
