import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { articleService } from "./service"
import type { GenerateArticleRequest } from "./types"

export const articleKeys = {
  all: ["articles"] as const,
  list: (siteId: string) => [...articleKeys.all, "list", siteId] as const,
  detail: (id: string) => [...articleKeys.all, "detail", id] as const,
}

export function useArticleList(siteId: string) {
  return useQuery({
    queryKey: articleKeys.list(siteId),
    queryFn: () => articleService.getBySiteId(siteId),
    enabled: !!siteId,
  })
}

export function useArticleDetail(id: string) {
  return useQuery({
    queryKey: articleKeys.detail(id),
    queryFn: () => articleService.getById(id),
    enabled: !!id,
  })
}

export function useGenerateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateArticleRequest) => articleService.generate(data),
    onSuccess: (article) => {
      queryClient.invalidateQueries({
        queryKey: articleKeys.list(article.siteId),
      })
    },
  })
}

export function useUpdateContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { title: string; content: string; metaDescription: string }
    }) => articleService.updateContent(id, data),
    onSuccess: (article) => {
      queryClient.invalidateQueries({
        queryKey: articleKeys.detail(article.id),
      })
    },
  })
}

export function usePublishArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => articleService.publish(id),
    onSuccess: (article) => {
      queryClient.invalidateQueries({
        queryKey: articleKeys.detail(article.id),
      })
      queryClient.invalidateQueries({
        queryKey: articleKeys.list(article.siteId),
      })
    },
  })
}
