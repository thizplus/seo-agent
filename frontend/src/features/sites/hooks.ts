import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { siteService } from "./service"
import type { CreateSiteRequest, UpdateSiteRequest } from "./types"

export const siteKeys = {
  all: ["sites"] as const,
  list: () => [...siteKeys.all, "list"] as const,
  detail: (id: string) => [...siteKeys.all, "detail", id] as const,
}

export function useSiteList() {
  return useQuery({
    queryKey: siteKeys.list(),
    queryFn: () => siteService.getAll(),
  })
}

export function useSiteDetail(id: string) {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: () => siteService.getById(id),
    enabled: !!id,
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSiteRequest) => siteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.list() })
    },
  })
}

export function useUpdateSite(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateSiteRequest) => siteService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: siteKeys.list() })
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => siteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.list() })
    },
  })
}

export function useAnalyzeSite(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => siteService.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) })
    },
  })
}

export function useDiscoverKeywords(id: string) {
  return useMutation({
    mutationFn: (seedKeywords: string[]) => siteService.discoverKeywords(id, seedKeywords),
  })
}

export function useCreateCluster(id: string) {
  return useMutation({
    mutationFn: (keywords: string[]) => siteService.createCluster(id, keywords),
  })
}

export function useRunPipeline(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (maxArticles?: number) => siteService.runPipeline(id, maxArticles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ["pages", "list", id] })
      queryClient.invalidateQueries({ queryKey: ["keywords", "list", id] })
      queryClient.invalidateQueries({ queryKey: ["articles", "list", id] })
    },
  })
}

export function useAnalyzeCompetitor(id: string) {
  return useMutation({
    mutationFn: (competitorUrl: string) => siteService.analyzeCompetitor(id, competitorUrl),
  })
}

export function useGscProperties(id: string) {
  return useMutation({
    mutationFn: () => siteService.getGscProperties(id),
  })
}

export function useSelectGscProperty(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (siteUrl: string) => siteService.selectGscProperty(id, siteUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) })
    },
  })
}

export function useDisconnectGsc(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => siteService.disconnectGsc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) })
    },
  })
}

export const memberKeys = {
  all: ["members"] as const,
  list: (siteId: string) => [...memberKeys.all, "list", siteId] as const,
}

export function useSiteMembers(siteId: string) {
  return useQuery({
    queryKey: memberKeys.list(siteId),
    queryFn: () => siteService.getMembers(siteId),
  })
}

export function useAddMember(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => siteService.addMember(siteId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(siteId) })
    },
  })
}

export function useRemoveMember(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => siteService.removeMember(siteId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(siteId) })
    },
  })
}

// --- Focus Queue ---

export const focusQueueKeys = {
  all: ["focusQueue"] as const,
  list: (siteId: string) => [...focusQueueKeys.all, "list", siteId] as const,
  status: (siteId: string) => [...focusQueueKeys.all, "status", siteId] as const,
}

export function useFocusQueue(siteId: string) {
  return useQuery({
    queryKey: focusQueueKeys.list(siteId),
    queryFn: () => siteService.getFocusQueue(siteId),
  })
}

export function useFocusQueueStatus(siteId: string) {
  return useQuery({
    queryKey: focusQueueKeys.status(siteId),
    queryFn: () => siteService.getFocusQueueStatus(siteId),
  })
}

function invalidateFocusQueue(queryClient: ReturnType<typeof useQueryClient>, siteId: string) {
  queryClient.invalidateQueries({ queryKey: focusQueueKeys.list(siteId) })
  queryClient.invalidateQueries({ queryKey: focusQueueKeys.status(siteId) })
}

export function useAddFocusQueueItem(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { priority: number; pillarUrl: string; primaryKeyword: string; secondaryKeywords: string; customTitle?: string; contentGuide?: string; writingTone?: string }) =>
      siteService.addFocusQueueItem(siteId, data),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}

export function useImportFocusQueue(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keywords: { priority: number; pillarUrl: string; primaryKeyword: string; secondaryKeywords: string; customTitle?: string; contentGuide?: string; writingTone?: string }[]) =>
      siteService.importFocusQueue(siteId, keywords),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}

export function useDeleteFocusQueueItem(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queueId: string) => siteService.deleteFocusQueueItem(siteId, queueId),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}

export function useSkipFocusQueueItem(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queueId: string) => siteService.skipFocusQueueItem(siteId, queueId),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}

export function useRetryFocusQueueItem(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queueId: string) => siteService.retryFocusQueueItem(siteId, queueId),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}

export function useResetFocusQueue(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => siteService.resetFocusQueue(siteId),
    onSuccess: () => invalidateFocusQueue(queryClient, siteId),
  })
}
