import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { AutoPublishSettings } from "./types"

export const settingsService = {
  async getAutoPublish(): Promise<AutoPublishSettings> {
    const res = await apiClient.get<{ data: AutoPublishSettings }>(API_ROUTES.SETTINGS.AUTO_PUBLISH)
    return res.data.data
  },

  async updateAutoPublish(data: AutoPublishSettings): Promise<AutoPublishSettings> {
    const res = await apiClient.put<{ data: AutoPublishSettings }>(API_ROUTES.SETTINGS.AUTO_PUBLISH, data)
    return res.data.data
  },
}
