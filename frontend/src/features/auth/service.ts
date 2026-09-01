import { API_ROUTES } from "@/constants/api-routes"

export const authService = {
  getGoogleLoginURL(): string {
    return API_ROUTES.AUTH.GOOGLE
  },
}
