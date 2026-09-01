import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { keywordService } from "./service"
import type { CreateKeywordRequest } from "./types"

export function useAnalyzeSERP(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (kwId: string) => keywordService.analyzeSERP(siteId, kwId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keywordKeys.list(siteId) })
    },
  })
}

export const keywordKeys = {
  all: ["keywords"] as const,
  list: (siteId: string) => [...keywordKeys.all, "list", siteId] as const,
}

export function useKeywordList(siteId: string) {
  return useQuery({
    queryKey: keywordKeys.list(siteId),
    queryFn: () => keywordService.getBySiteId(siteId),
    enabled: !!siteId,
  })
}

export function useCreateKeyword(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKeywordRequest) =>
      keywordService.create(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keywordKeys.list(siteId) })
    },
  })
}
