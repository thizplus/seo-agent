import axios from "axios"

export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("seo_agents_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Redirect to login on 401
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("seo_agents_token")
      localStorage.removeItem("seo_agents_user")
      window.location.href = "/login"
    }

    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Something went wrong"
    return Promise.reject(new Error(message))
  }
)
