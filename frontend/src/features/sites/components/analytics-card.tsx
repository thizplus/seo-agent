"use client"

import { useEffect } from "react"
import { useSiteAnalytics } from "../hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart3Icon,
  Loader2Icon,
  TrendingUpIcon,
  AlertTriangleIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"

interface AnalyticsCardProps {
  siteId: string
  hasGsc: boolean
}

export function AnalyticsCard({ siteId, hasGsc }: AnalyticsCardProps) {
  const { data: analytics, isLoading, refetch } = useSiteAnalytics(siteId)

  // Auto-fetch เมื่อมี GSC และยังไม่มีข้อมูล
  useEffect(() => {
    if (hasGsc && !analytics) {
      refetch()
    }
  }, [hasGsc])

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3Icon className="size-4" />
            ภาพรวม SEO (28 วัน)
          </CardTitle>
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
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">คลิก</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">แสดงผล</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{(analytics.avgCtr * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">CTR เฉลี่ย</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.avgPosition || "-"}</div>
                <div className="text-sm text-muted-foreground">อันดับเฉลี่ย</div>
              </div>
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
