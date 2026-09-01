import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pageService } from "./service"

export const pageKeys = {
  all: ["pages"] as const,
  list: (siteId: string) => [...pageKeys.all, "list", siteId] as const,
}

export function usePageList(siteId: string) {
  return useQuery({
    queryKey: pageKeys.list(siteId),
    queryFn: () => pageService.getBySiteId(siteId),
    enabled: !!siteId,
  })
}

export function useAnalyzePage(siteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => pageService.analyzePage(siteId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(siteId) })
    },
  })
}
