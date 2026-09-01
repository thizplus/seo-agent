export const NAV_ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  SITES: {
    LIST: "/dashboard/sites",
    NEW: "/dashboard/sites/new",
    DETAIL: (id: string) => `/dashboard/sites/${id}`,
    ARTICLES: (id: string) => `/dashboard/sites/${id}/articles`,
  },
  ARTICLES: {
    DETAIL: (id: string) => `/dashboard/articles/${id}`,
  },
} as const
