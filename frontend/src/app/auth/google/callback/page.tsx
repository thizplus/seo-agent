"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authStore } from "@/features/auth"
import { NAV_ROUTES } from "@/constants/nav"
import { apiClient } from "@/lib/api-client"
import { API_ROUTES } from "@/constants/api-routes"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const userId = searchParams.get("user_id")

    if (!token) {
      router.replace(NAV_ROUTES.LOGIN + "?error=no_token")
      return
    }

    // เก็บ token ก่อน
    localStorage.setItem("seo_agents_token", token)

    // ดึง user info จาก /auth/me
    apiClient
      .get(API_ROUTES.AUTH.ME)
      .then((res) => {
        const user = res.data.data
        authStore.setAuth(token, {
          id: user.id || userId || "",
          email: user.email || "",
          name: user.name || user.email || "",
          avatarUrl: user.avatarUrl || "",
          createdAt: user.createdAt || "",
        })
        router.replace(NAV_ROUTES.DASHBOARD)
      })
      .catch(() => {
        // ถ้าดึง user info ไม่ได้ ก็ใช้ข้อมูลจาก URL params
        authStore.setAuth(token, {
          id: userId || "",
          email: "",
          name: "",
          avatarUrl: "",
          createdAt: "",
        })
        router.replace(NAV_ROUTES.DASHBOARD)
      })
  }, [router, searchParams])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-medium">Signing in...</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  )
}
