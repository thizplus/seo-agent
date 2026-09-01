"use client"

import { useState } from "react"
import { useAnalyzeCompetitor } from "../hooks"
import type { CompetitorResult } from "../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SwordsIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  LightbulbIcon,
} from "lucide-react"

interface CompetitorAnalysisCardProps {
  siteId: string
}

export function CompetitorAnalysisCard({ siteId }: CompetitorAnalysisCardProps) {
  const analyzeCompetitor = useAnalyzeCompetitor(siteId)
  const [competitorUrl, setCompetitorUrl] = useState("")
  const [competitors, setCompetitors] = useState<CompetitorResult[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!competitorUrl.trim()) return
    analyzeCompetitor.mutate(competitorUrl.trim(), {
      onSuccess: (result) => {
        setCompetitors((prev) => [...prev, result])
        setCompetitorUrl("")
      },
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SwordsIcon className="size-5" />
          วิเคราะห์คู่แข่ง
        </CardTitle>
        <CardDescription>วิเคราะห์คู่แข่งเพื่อค้นหาโอกาสในการสร้างเนื้อหา</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="https://competitor-site.com"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={analyzeCompetitor.isPending}>
            {analyzeCompetitor.isPending ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <SearchIcon className="mr-1 size-4" />}
            {analyzeCompetitor.isPending ? "กำลังวิเคราะห์..." : "วิเคราะห์"}
          </Button>
        </form>

        {competitors.length === 0 ? (
          <div className="text-center py-4">
            <SwordsIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">ยังไม่มีการวิเคราะห์คู่แข่ง เพิ่ม URL ด้านบน</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {competitors.map((comp, idx) => (
              <CompetitorResultCard key={idx} competitor={comp} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompetitorResultCard({ competitor: comp }: { competitor: CompetitorResult }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3">
        <h4 className="font-semibold truncate">{comp.url}</h4>
        <p className="text-muted-foreground mt-1">{comp.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-3">
        {comp.strengths.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <ShieldCheckIcon className="size-4 text-green-600" />
              จุดแข็ง
            </p>
            <ul className="text-sm space-y-1">
              {comp.strengths.map((s, i) => (
                <li key={i} className="text-muted-foreground">- {s}</li>
              ))}
            </ul>
          </div>
        )}
        {comp.weaknesses.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <ShieldAlertIcon className="size-4 text-red-600" />
              จุดอ่อน
            </p>
            <ul className="text-sm space-y-1">
              {comp.weaknesses.map((w, i) => (
                <li key={i} className="text-muted-foreground">- {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {comp.contentGaps.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <LightbulbIcon className="size-4 text-yellow-600" />
            ช่องว่างเนื้อหา (โอกาส)
          </p>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2 font-medium">คีย์เวิร์ด</th>
                  <th className="p-2 font-medium">โอกาส</th>
                </tr>
              </thead>
              <tbody>
                {comp.contentGaps.map((gap, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2 font-medium">{gap.keyword}</td>
                    <td className="p-2 text-muted-foreground">{gap.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {comp.topPages.length > 0 && (
        <div className="mb-3">
          <p className="font-medium mb-1.5">หน้าเด่น</p>
          <div className="flex flex-col gap-1">
            {comp.topPages.slice(0, 5).map((page, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[70%]">{page.title}</span>
                <span className="text-xs text-muted-foreground">{page.wordCount} คำ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {comp.recommendations.length > 0 && (
        <div>
          <p className="font-medium mb-1.5">คำแนะนำ</p>
          <ul className="text-sm space-y-1">
            {comp.recommendations.map((rec, i) => (
              <li key={i} className="text-muted-foreground">- {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
