import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"
import type { Article, GenerateArticleRequest } from "./types"

export const articleService = {
  async getBySiteId(siteId: string): Promise<Article[]> {
    const res = await apiClient.get<{ data: Article[] }>(
      API_ROUTES.ARTICLES.LIST(siteId)
    )
    return res.data.data
  },

  async getById(id: string): Promise<Article> {
    const res = await apiClient.get<{ data: Article }>(
      API_ROUTES.ARTICLES.BY_ID(id)
    )
    return res.data.data
  },

  async generate(data: GenerateArticleRequest): Promise<Article> {
    const res = await apiClient.post<{ data: Article }>(
      API_ROUTES.ARTICLES.GENERATE,
      data
    )
    return res.data.data
  },

  async fetchMetrics(id: string): Promise<Record<string, any>> {
    const res = await apiClient.get(API_ROUTES.ARTICLES.METRICS(id))
    return res.data.data
  },

  async getVersions(id: string): Promise<any[]> {
    const res = await apiClient.get(API_ROUTES.ARTICLES.VERSIONS(id))
    return res.data.data
  },

  async optimize(id: string): Promise<Record<string, any>> {
    const res = await apiClient.post(API_ROUTES.ARTICLES.OPTIMIZE(id))
    return res.data.data
  },

  async getImages(id: string): Promise<any[]> {
    const res = await apiClient.get(API_ROUTES.ARTICLES.IMAGES(id))
    return res.data.data || []
  },

  async searchImages(keyword: string, count: number = 10): Promise<any[]> {
    const res = await apiClient.post(API_ROUTES.ARTICLES.SEARCH_IMAGES, { keyword, count })
    return res.data.data
  },

  async uploadSelectedImages(id: string, images: { url: string; alt_text: string; role: string }[]): Promise<any[]> {
    const res = await apiClient.post(API_ROUTES.ARTICLES.UPLOAD_IMAGES(id), { images })
    return res.data.data
  },

  async deleteArticle(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.ARTICLES.DELETE(id))
  },

  async deleteImage(articleId: string, imageId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.ARTICLES.DELETE_IMAGE(articleId, imageId))
  },

  async generateImages(id: string, count: number = 2): Promise<any[]> {
    const res = await apiClient.post(API_ROUTES.ARTICLES.GENERATE_IMAGES(id), { count })
    return res.data.data
  },

  async getPageImages(id: string): Promise<{ url: string; alt: string }[]> {
    const res = await apiClient.get<{ data: { url: string; alt: string }[] }>(
      API_ROUTES.ARTICLES.PAGE_IMAGES(id)
    )
    return res.data.data
  },

  async setFeaturedImage(id: string, imageUrl: string): Promise<Article> {
    const res = await apiClient.put<{ data: Article }>(
      API_ROUTES.ARTICLES.FEATURED_IMAGE(id),
      { imageUrl }
    )
    return res.data.data
  },

  async uploadFile(file: File, altText: string = ""): Promise<{ url: string; alt_text: string }> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("alt_text", altText)
    const res = await apiClient.post<{ data: { url: string; alt_text: string } }>(
      API_ROUTES.ARTICLES.UPLOAD_FILE,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    return res.data.data
  },

  async updateContent(
    id: string,
    data: { title: string; slug: string; content: string; metaDescription: string }
  ): Promise<Article> {
    const res = await apiClient.put<{ data: Article }>(
      API_ROUTES.ARTICLES.UPDATE_CONTENT(id),
      data
    )
    return res.data.data
  },

  async publish(id: string): Promise<Article> {
    const res = await apiClient.post<{ data: Article }>(
      API_ROUTES.ARTICLES.PUBLISH(id)
    )
    return res.data.data
  },
}
