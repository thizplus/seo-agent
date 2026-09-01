"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authStore } from "@/features/auth"
import { NAV_ROUTES } from "@/constants/nav"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!authStore.isAuthenticated()) {
      router.replace(NAV_ROUTES.LOGIN)
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
