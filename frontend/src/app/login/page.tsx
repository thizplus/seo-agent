"use client"

import { useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { SearchIcon } from "lucide-react"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SearchIcon className="size-4" />
            </div>
            SEO Agents
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm error={error || undefined} />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <SearchIcon className="mx-auto size-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-2xl font-bold text-muted-foreground/70">
              ระบบ SEO อัตโนมัติ
            </h2>
            <p className="mt-2 text-lg text-muted-foreground/50">
              สร้างบทความ วิเคราะห์คู่แข่ง ติดตามอันดับ ด้วย AI
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
