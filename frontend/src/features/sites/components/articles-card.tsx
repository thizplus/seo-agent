"use client"

import { useArticleList } from "@/features/articles"
import { useKeywordList } from "@/features/keywords"
import { NAV_ROUTES } from "@/constants/nav"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileTextIcon, KeyIcon } from "lucide-react"

interface ArticlesCardProps {
  siteId: string
}

export function ArticlesCard({ siteId }: ArticlesCardProps) {
  const { data: articles } = useArticleList(siteId)
  const { data: keywords } = useKeywordList(siteId)

  const getKeyword = (keywordId: string | null) => {
    if (!keywordId || !keywords) return null
    return keywords.find(k => k.id === keywordId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="size-5" />
          บทความ
        </CardTitle>
        <CardDescription>บทความที่สร้างสำหรับเว็บไซต์นี้</CardDescription>
      </CardHeader>
      <CardContent>
        {!articles?.length ? (
          <p className="text-muted-foreground">ยังไม่มีบทความ สร้างจากคีย์เวิร์ดด้านบน</p>
        ) : (
          <div className="flex flex-col gap-2">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={NAV_ROUTES.ARTICLES.DETAIL(article.id)}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{article.title || "กำลังสร้าง..."}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const kw = getKeyword(article.keywordId)
                      return kw ? (
                        <Badge variant="outline" className="text-xs">
                          <KeyIcon className="size-3 mr-1" />
                          {kw.keyword}
                        </Badge>
                      ) : null
                    })()}
                    <span className="text-xs text-muted-foreground">
                      {article.wordCount > 0 ? `${article.wordCount} คำ` : ""}
                      {article.createdAt && (
                        <span className="ml-1">
                          {new Date(article.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Badge
                    variant={
                      article.status === "completed" ? "default"
                        : article.status === "failed" ? "destructive"
                        : "secondary"
                    }
                  >
                    {article.status}
                  </Badge>
                  {article.publishStatus === "published" && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">เผยแพร่แล้ว</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
