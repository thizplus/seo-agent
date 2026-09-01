const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const API_ROUTES = {
  HEALTH: `${API_BASE}/api/v1/health`,

  // Auth
  AUTH: {
    GOOGLE: `${API_BASE}/api/v1/auth/google`,
    ME: `${API_BASE}/api/v1/auth/me`,
  },

  // Sites
  SITES: {
    LIST: `${API_BASE}/api/v1/sites`,
    CREATE: `${API_BASE}/api/v1/sites`,
    BY_ID: (id: string) => `${API_BASE}/api/v1/sites/${id}`,
    UPDATE: (id: string) => `${API_BASE}/api/v1/sites/${id}`,
    DELETE: (id: string) => `${API_BASE}/api/v1/sites/${id}`,
    GSC_CONNECT: (id: string) => `${API_BASE}/api/v1/auth/gsc/connect/${id}`,
    GSC_PROPERTIES: (id: string) => `${API_BASE}/api/v1/sites/${id}/gsc/properties`,
    GSC_SELECT: (id: string) => `${API_BASE}/api/v1/sites/${id}/gsc/select`,
    GSC_DISCONNECT: (id: string) => `${API_BASE}/api/v1/sites/${id}/gsc`,
    ANALYZE: (id: string) => `${API_BASE}/api/v1/sites/${id}/analyze`,
    DISCOVER_KEYWORDS: (id: string) => `${API_BASE}/api/v1/sites/${id}/discover-keywords`,
    CREATE_CLUSTER: (id: string) => `${API_BASE}/api/v1/sites/${id}/clusters`,
    ANALYZE_COMPETITOR: (id: string) => `${API_BASE}/api/v1/sites/${id}/competitors`,
    RUN_PIPELINE: (id: string) => `${API_BASE}/api/v1/sites/${id}/pipeline`,
    MEMBERS: (id: string) => `${API_BASE}/api/v1/sites/${id}/members`,
    REMOVE_MEMBER: (id: string, memberId: string) => `${API_BASE}/api/v1/sites/${id}/members/${memberId}`,
  },

  // Pages
  PAGES: {
    LIST: (siteId: string) => `${API_BASE}/api/v1/sites/${siteId}/pages`,
    ANALYZE: (siteId: string, pageId: string) => `${API_BASE}/api/v1/sites/${siteId}/pages/${pageId}/analyze`,
    ANALYSIS: (siteId: string, pageId: string) => `${API_BASE}/api/v1/sites/${siteId}/pages/${pageId}/analysis`,
  },

  // Keywords (nested under site)
  KEYWORDS: {
    LIST: (siteId: string) => `${API_BASE}/api/v1/sites/${siteId}/keywords`,
    CREATE: (siteId: string) => `${API_BASE}/api/v1/sites/${siteId}/keywords`,
    ANALYZE_SERP: (siteId: string, kwId: string) => `${API_BASE}/api/v1/sites/${siteId}/keywords/${kwId}/analyze-serp`,
  },

  // Articles
  ARTICLES: {
    LIST: (siteId: string) => `${API_BASE}/api/v1/sites/${siteId}/articles`,
    GENERATE: `${API_BASE}/api/v1/articles/generate`,
    BY_ID: (id: string) => `${API_BASE}/api/v1/articles/${id}`,
    METRICS: (id: string) => `${API_BASE}/api/v1/articles/${id}/metrics`,
    VERSIONS: (id: string) => `${API_BASE}/api/v1/articles/${id}/versions`,
    OPTIMIZE: (id: string) => `${API_BASE}/api/v1/articles/${id}/optimize`,
    IMAGES: (id: string) => `${API_BASE}/api/v1/articles/${id}/images`,
    SEARCH_IMAGES: `${API_BASE}/api/v1/articles/search-images`,
    UPLOAD_IMAGES: (id: string) => `${API_BASE}/api/v1/articles/${id}/upload-images`,
    FIND_IMAGES: (id: string) => `${API_BASE}/api/v1/articles/${id}/find-images`,
    GENERATE_IMAGES: (id: string) => `${API_BASE}/api/v1/articles/${id}/generate-images`,
    PUBLISH: (id: string) => `${API_BASE}/api/v1/articles/${id}/publish`,
    DELETE: (id: string) => `${API_BASE}/api/v1/articles/${id}`,
    DELETE_IMAGE: (id: string, imageId: string) => `${API_BASE}/api/v1/articles/${id}/images/${imageId}`,
  },
} as const
