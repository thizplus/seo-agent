import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { Site, CreateSiteRequest, UpdateSiteRequest, TopicClusterResult, CompetitorResult, PipelineResult, SiteMember, FocusQueueItem, FocusQueueStatus } from "./types"

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

  async getMembers(id: string): Promise<{ members: SiteMember[]; isOwner: boolean }> {
    const res = await apiClient.get<{ data: { members: SiteMember[]; isOwner: boolean } }>(API_ROUTES.SITES.MEMBERS(id))
    return res.data.data
  },

  async addMember(id: string, email: string): Promise<SiteMember> {
    const res = await apiClient.post<{ data: SiteMember }>(API_ROUTES.SITES.MEMBERS(id), { email })
    return res.data.data
  },

  async removeMember(id: string, memberId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SITES.REMOVE_MEMBER(id, memberId))
  },

  async getFocusQueue(id: string): Promise<FocusQueueItem[]> {
    const res = await apiClient.get<{ data: FocusQueueItem[] }>(API_ROUTES.SITES.FOCUS_QUEUE(id))
    return res.data.data || []
  },

  async getFocusQueueStatus(id: string): Promise<FocusQueueStatus> {
    const res = await apiClient.get<{ data: FocusQueueStatus }>(API_ROUTES.SITES.FOCUS_QUEUE_STATUS(id))
    return res.data.data
  },

  async addFocusQueueItem(id: string, data: { priority: number; pillarUrl: string; primaryKeyword: string; secondaryKeywords: string }): Promise<FocusQueueItem> {
    const res = await apiClient.post<{ data: FocusQueueItem }>(API_ROUTES.SITES.FOCUS_QUEUE(id), data)
    return res.data.data
  },

  async importFocusQueue(id: string, keywords: { priority: number; pillarUrl: string; primaryKeyword: string; secondaryKeywords: string }[]): Promise<{ imported: number }> {
    const res = await apiClient.post<{ data: { imported: number } }>(API_ROUTES.SITES.FOCUS_QUEUE_IMPORT(id), { keywords })
    return res.data.data
  },

  async deleteFocusQueueItem(id: string, queueId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SITES.FOCUS_QUEUE_ITEM(id, queueId))
  },

  async skipFocusQueueItem(id: string, queueId: string): Promise<void> {
    await apiClient.post(API_ROUTES.SITES.FOCUS_QUEUE_SKIP(id, queueId))
  },

  async retryFocusQueueItem(id: string, queueId: string): Promise<void> {
    await apiClient.post(API_ROUTES.SITES.FOCUS_QUEUE_RETRY(id, queueId))
  },

  async resetFocusQueue(id: string): Promise<void> {
    await apiClient.post(API_ROUTES.SITES.FOCUS_QUEUE_RESET(id))
  },
}
