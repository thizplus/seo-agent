import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsService } from "./service"
import type { AutoPublishSettings } from "./types"

export const settingsKeys = {
  all: ["settings"] as const,
  autoPublish: () => [...settingsKeys.all, "auto-publish"] as const,
}

export function useAutoPublishSettings() {
  return useQuery({
    queryKey: settingsKeys.autoPublish(),
    queryFn: () => settingsService.getAutoPublish(),
  })
}

export function useUpdateAutoPublish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AutoPublishSettings) => settingsService.updateAutoPublish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.autoPublish() })
    },
  })
}
