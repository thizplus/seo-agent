"use client"

import { useEffect, useState } from "react"
import { useSiteAnalytics } from "../hooks"
import type { AnalyticsComparison } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3Icon,
  Loader2Icon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  SearchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from "lucide-react"
import Link from "next/link"

const PERIOD_OPTIONS = [
  { value: "7", label: "7 วัน" },
  { value: "28", label: "28 วัน" },
  { value: "90", label: "3 เดือน" },
  { value: "180", label: "6 เดือน" },
  { value: "480", label: "16 เดือน" },
] as const

function getPeriodLabel(days: number): string {
  return PERIOD_OPTIONS.find((p) => p.value === String(days))?.label ?? `${days} วัน`
}

function ChangeIndicator({
  value,
  suffix = "%",
  invertColor = false,
}: {
  value: number
  suffix?: string
  invertColor?: boolean // position: ลดลง = ดี
}) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <MinusIcon className="size-3" />0{suffix}
      </span>
    )
  }
  const isPositive = value > 0
  const isGood = invertColor ? !isPositive : isPositive
  const color = isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      {isPositive ? "+" : ""}{value}{suffix}
    </span>
  )
}

interface AnalyticsCardProps {
  siteId: string
  hasGsc: boolean
}

export function AnalyticsCard({ siteId, hasGsc }: AnalyticsCardProps) {
  const [days, setDays] = useState(28)
  const { data: analytics, isLoading, refetch } = useSiteAnalytics(siteId, days)

  useEffect(() => {
    if (hasGsc && !analytics) {
      refetch()
    }
  }, [hasGsc])

  // เปลี่ยนช่วงเวลา → refetch
  useEffect(() => {
    if (hasGsc) {
      refetch()
    }
  }, [days])

  if (!hasGsc) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3Icon className="size-4" />
            ภาพรวม SEO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            กรุณาเชื่อมต่อ Google Search Console ที่ tab &quot;เครื่องมือ&quot; เพื่อดูสถิติ SEO
          </p>
        </CardContent>
      </Card>
    )
  }

  const cmp = analytics?.comparison

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3Icon className="size-4" />
            ภาพรวม SEO
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2Icon className="mr-1 size-4 animate-spin" />
              ) : (
                <BarChart3Icon className="mr-1 size-4" />
              )}
              {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
            </Button>
          </div>
        </div>
        {cmp && (
          <p className="text-xs text-muted-foreground mt-1">
            เทียบกับ {getPeriodLabel(days)} ก่อนหน้า
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!analytics ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                กำลังโหลดข้อมูลจาก Google Search Console...
              </>
            ) : (
              "กด \"รีเฟรช\" เพื่อโหลดข้อมูลจาก Google Search Console"
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <SummaryItem
                value={analytics.totalClicks.toLocaleString()}
                label="คลิก"
                change={cmp?.clicksChange}
              />
              <SummaryItem
                value={analytics.totalImpressions.toLocaleString()}
                label="แสดงผล"
                change={cmp?.impressionsChange}
              />
              <SummaryItem
                value={`${(analytics.avgCtr * 100).toFixed(1)}%`}
                label="CTR เฉลี่ย"
                change={cmp ? Math.round(cmp.ctrChange * 10000) / 100 : undefined}
                changeSuffix="pp"
              />
              <SummaryItem
                value={analytics.avgPosition ? String(analytics.avgPosition) : "-"}
                label="อันดับเฉลี่ย"
                change={cmp?.positionChange}
                invertColor
              />
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {analytics.indexedArticles}/{analytics.publishedArticles}
                </div>
                <div className="text-sm text-muted-foreground">Indexed</div>
              </div>
            </div>

            {/* Top Articles */}
            {analytics.topArticles && analytics.topArticles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <TrendingUpIcon className="size-3.5" />
                  บทความที่มีคลิกสูงสุด
                </h4>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">บทความ</th>
                        <th className="text-right p-2 font-medium">คลิก</th>
                        <th className="text-right p-2 font-medium">แสดงผล</th>
                        <th className="text-right p-2 font-medium">อันดับ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topArticles.map((a) => (
                        <tr key={a.articleId} className="border-b last:border-0">
                          <td className="p-2">
                            <Link
                              href={`/dashboard/articles/${a.articleId}`}
                              className="text-primary hover:underline"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="text-right p-2">{a.clicks}</td>
                          <td className="text-right p-2">{a.impressions}</td>
                          <td className="text-right p-2">{a.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Low CTR Articles */}
            {analytics.lowCtrArticles && analytics.lowCtrArticles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangleIcon className="size-3.5 text-amber-500" />
                  โอกาสปรับปรุง (Impressions สูง CTR ต่ำ)
                </h4>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">บทความ</th>
                        <th className="text-right p-2 font-medium">แสดงผล</th>
                        <th className="text-right p-2 font-medium">CTR</th>
                        <th className="text-right p-2 font-medium">อันดับ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.lowCtrArticles.map((a) => (
                        <tr key={a.articleId} className="border-b last:border-0">
                          <td className="p-2">
                            <Link
                              href={`/dashboard/articles/${a.articleId}`}
                              className="text-primary hover:underline"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="text-right p-2">{a.impressions}</td>
                          <td className="text-right p-2">
                            <Badge variant="outline" className="text-amber-500">
                              {(a.ctr * 100).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="text-right p-2">{a.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Queries */}
            {analytics.topQueries && analytics.topQueries.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <SearchIcon className="size-3.5" />
                  คำค้นหายอดนิยม
                </h4>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">คำค้นหา</th>
                        <th className="text-right p-2 font-medium">คลิก</th>
                        <th className="text-right p-2 font-medium">แสดงผล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topQueries.slice(0, 10).map((q) => (
                        <tr key={q.query} className="border-b last:border-0">
                          <td className="p-2">{q.query}</td>
                          <td className="text-right p-2">{q.clicks}</td>
                          <td className="text-right p-2">{q.impressions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryItem({
  value,
  label,
  change,
  changeSuffix = "%",
  invertColor = false,
}: {
  value: string
  label: string
  change?: number
  changeSuffix?: string
  invertColor?: boolean
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {change !== undefined && (
        <div className="mt-1">
          <ChangeIndicator value={change} suffix={changeSuffix} invertColor={invertColor} />
        </div>
      )}
    </div>
  )
}
