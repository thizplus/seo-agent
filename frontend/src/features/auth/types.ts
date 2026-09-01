export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}
