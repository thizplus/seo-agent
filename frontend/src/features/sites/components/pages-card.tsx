"use client"

import { useState } from "react"
import { usePageList, useAnalyzePage } from "@/features/pages"
import { pageService } from "@/features/pages"
import type { PageAnalysis } from "@/features/pages"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LayoutListIcon, SearchIcon, Loader2Icon, AlertTriangleIcon,
  CheckCircleIcon, XCircleIcon, ExternalLinkIcon, ChevronDownIcon, ChevronRightIcon,
} from "lucide-react"

interface PagesCardProps {
  siteId: string
}

const PAGE_TYPE_COLORS: Record<string, string> = {
  product: "bg-blue-100 text-blue-700",
  service: "bg-purple-100 text-purple-700",
  blog: "bg-green-100 text-green-700",
  home: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-700",
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "bg-green-100 text-green-700" :
  score >= 50 ? "bg-yellow-100 text-yellow-700" :
  "bg-red-100 text-red-700"

export function PagesCard({ siteId }: PagesCardProps) {
  const { data: pages, isLoading } = usePageList(siteId)
  const analyzePage = useAnalyzePage(siteId)
  const [expandedPage, setExpandedPage] = useState<string | null>(null)
  const [analysisCache, setAnalysisCache] = useState<Record<string, PageAnalysis>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null)

  const handleToggle = async (pageId: string) => {
    if (expandedPage === pageId) {
      setExpandedPage(null)
      return
    }
    // ถ้ามี cache แล้ว → แสดงเลย
    if (analysisCache[pageId]) {
      setExpandedPage(pageId)
      return
    }
    // ดึงจาก DB
    setLoadingAnalysis(pageId)
    try {
      const data = await pageService.getAnalysis(siteId, pageId)
      setAnalysisCache(prev => ({ ...prev, [pageId]: data }))
      setExpandedPage(pageId)
    } catch {
      // ยังไม่เคย analyze → expand ว่างๆ ให้กด Analyze
      setExpandedPage(pageId)
    } finally {
      setLoadingAnalysis(null)
    }
  }

  const handleAnalyze = (pageId: string) => {
    analyzePage.mutate(pageId, {
      onSuccess: (data) => {
        setAnalysisCache(prev => ({ ...prev, [pageId]: data }))
        setExpandedPage(pageId)
      },
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutListIcon className="size-5" />
          หน้าเว็บ ({pages?.length || 0})
        </CardTitle>
        <CardDescription>คลิกหน้าเพื่อดูผลวิเคราะห์ คลิก วิเคราะห์ เพื่อดึงข้อมูลคู่แข่ง SERP</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">กำลังโหลดหน้าเว็บ...</p>
        ) : !pages?.length ? (
          <div className="text-center py-6">
            <LayoutListIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">ยังไม่มีหน้าเว็บ เริ่มไปป์ไลน์ก่อน</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pages.map((page) => {
              const analysis = analysisCache[page.id]
              const isExpanded = expandedPage === page.id
              const isLoadingThis = loadingAnalysis === page.id

              return (
                <div key={page.id} className="rounded-lg border">
                  {/* Header — clickable to toggle */}
                  <div
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleToggle(page.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 shrink-0">
                        {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={PAGE_TYPE_COLORS[page.pageType] || PAGE_TYPE_COLORS.other}>
                            {page.pageType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{page.wordCount} คำ</span>
                          {page.auditScore !== undefined && page.auditScore > 0 && (
                            <Badge className={SCORE_COLOR(page.auditScore)}>{page.auditScore}/100</Badge>
                          )}
                          {isLoadingThis && <Loader2Icon className="size-3 animate-spin" />}
                        </div>
                        <p className="font-medium truncate">{page.h1 || page.title || page.url}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {(() => { try { return decodeURIComponent(new URL(page.url).pathname) } catch { return page.url } })()}
                          </p>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon className="size-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        </div>
                        {page.keywords?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {page.keywords.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {kw.keyword}
                                {kw.score > 0 && (
                                  <span className="ml-1 px-1 rounded bg-muted text-muted-foreground">{kw.score}/10</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleAnalyze(page.id) }}
                        disabled={analyzePage.isPending}
                      >
                        {analyzePage.isPending ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <SearchIcon className="mr-1 size-4" />}
                        วิเคราะห์
                      </Button>
                    </div>
                  </div>

                  {/* Expanded analysis */}
                  {isExpanded && (
                    <div className="border-t p-3 bg-muted/30 space-y-3">
                      {!analysis ? (
                        <p className="text-muted-foreground">ยังไม่มีผลวิเคราะห์ คลิก วิเคราะห์ เพื่อดึงข้อมูล SERP</p>
                      ) : (
                        <>
                          {/* Audit Score */}
                          <div className="flex items-center gap-3">
                            <Badge className={SCORE_COLOR(analysis.auditScore) + " text-lg px-3 py-1"}>
                              {analysis.auditScore}/100
                            </Badge>
                            <div className="text-sm space-x-2">
                              <span>เรา: {analysis.ourWordCount} คำ</span>
                              <span>|</span>
                              <span>เฉลี่ยคู่แข่ง: {analysis.avgWordCount} คำ</span>
                            </div>
                          </div>

                          {/* Issues */}
                          {analysis.issues?.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">ปัญหา</p>
                              <div className="space-y-1">
                                {analysis.issues.map((issue, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    {issue.severity === "critical" ? (
                                      <XCircleIcon className="size-4 text-red-500 shrink-0 mt-0.5" />
                                    ) : (
                                      <AlertTriangleIcon className="size-4 text-yellow-500 shrink-0 mt-0.5" />
                                    )}
                                    <span className="text-muted-foreground">{issue.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* SERP Competitors */}
                          {analysis.serpSnapshots && Object.entries(analysis.serpSnapshots).map(([kw, snap]) => (
                            <div key={kw}>
                              <p className="text-sm font-medium mb-1">
                                SERP: &ldquo;{kw}&rdquo;
                                {snap.our_position > 0 ? (
                                  <Badge className="ml-2 bg-green-100 text-green-700">#{snap.our_position}</Badge>
                                ) : (
                                  <Badge className="ml-2" variant="secondary">ไม่ติดอันดับ</Badge>
                                )}
                              </p>
                              {snap.results?.length > 0 ? (
                                <div className="space-y-0.5">
                                  {snap.results.slice(0, 5).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="shrink-0">#{r.position}</span>
                                        <span className="truncate">{(() => { try { return new URL(r.url).hostname } catch { return r.url } })()}</span>
                                        <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                          <ExternalLinkIcon className="size-3 hover:text-foreground" />
                                        </a>
                                      </div>
                                      <span className="shrink-0">{r.word_count} คำ</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">ไม่มีผล SERP</p>
                              )}
                            </div>
                          ))}

                          {/* Recommendations */}
                          {analysis.recommendations?.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">คำแนะนำ</p>
                              <ul className="space-y-1">
                                {analysis.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircleIcon className="size-4 text-blue-500 shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
