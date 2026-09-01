"use client"

import { PageHeader } from "@/components/page-header"
import { useSiteList } from "@/features/sites"
import { NAV_ROUTES } from "@/constants/nav"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { GlobeIcon, FileTextIcon, PlusIcon } from "lucide-react"

export default function DashboardPage() {
  const { data: sites, isLoading } = useSiteList()

  return (
    <>
      <PageHeader items={[{ label: "Dashboard" }]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <GlobeIcon className="size-4" />
              เว็บไซต์
            </div>
            <div className="mt-2 text-3xl font-bold">
              {isLoading ? "..." : sites?.length ?? 0}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <FileTextIcon className="size-4" />
              สถานะ
            </div>
            <div className="mt-2 text-lg font-medium text-muted-foreground">
              {isLoading ? "กำลังโหลด..." : "ระบบพร้อม"}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6 flex items-center justify-center">
            <Link href={NAV_ROUTES.SITES.NEW} className={buttonVariants()}>
              <PlusIcon className="mr-2 size-4" />
              เพิ่มเว็บไซต์
            </Link>
          </div>
        </div>

        {/* Site List */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">เว็บไซต์ของคุณ</h2>
          {isLoading ? (
            <div className="text-muted-foreground">กำลังโหลดเว็บไซต์...</div>
          ) : !sites?.length ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <GlobeIcon className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                ยังไม่มีเว็บไซต์ เพิ่มเว็บไซต์แรกเพื่อเริ่มใช้งาน
              </p>
              <Link
                href={NAV_ROUTES.SITES.NEW}
                className={buttonVariants({ className: "mt-4" })}
              >
                <PlusIcon className="mr-2 size-4" />
                เพิ่มเว็บไซต์
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <Link
                  key={site.id}
                  href={NAV_ROUTES.SITES.DETAIL(site.id)}
                  className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <h3 className="font-semibold">{site.name}</h3>
                  <p className="mt-1 text-base text-muted-foreground truncate">
                    {site.url}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {site.hasLlmKey && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-700 dark:bg-green-900 dark:text-green-300">
                        {(site.llmProvider || "gemini").toUpperCase()}
                      </span>
                    )}
                    {site.hasWordPress && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        เชื่อมต่อ WP แล้ว
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
