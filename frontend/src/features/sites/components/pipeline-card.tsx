"use client"

import { useState } from "react"
import { useRunPipeline } from "../hooks"
import type { PipelineResult } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RocketIcon, Loader2Icon, CheckCircleIcon, XCircleIcon, SearchIcon, FileTextIcon, ScanSearchIcon } from "lucide-react"

interface PipelineCardProps {
  siteId: string
}

const STEP_ICONS: Record<string, typeof ScanSearchIcon> = {
  analyze: ScanSearchIcon,
  discover: SearchIcon,
  generate: FileTextIcon,
}

const STEP_LABELS: Record<string, string> = {
  analyze: "วิเคราะห์เว็บไซต์",
  discover: "ค้นหาคีย์เวิร์ด",
  generate: "สร้างบทความ",
}

export function PipelineCard({ siteId }: PipelineCardProps) {
  const pipeline = useRunPipeline(siteId)
  const [result, setResult] = useState<PipelineResult | null>(null)

  const [bgMessage, setBgMessage] = useState<string | null>(null)

  const handleRun = () => {
    setResult(null)
    setBgMessage(null)
    pipeline.mutate(3, {
      onSuccess: (data) => {
        if (data?.message) {
          setBgMessage(data.message)
        } else {
          setResult(data)
        }
      },
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RocketIcon className="size-5" />
              ไปป์ไลน์อัตโนมัติ
            </CardTitle>
            <CardDescription>
              วิเคราะห์ → ค้นหาคีย์เวิร์ด → สร้างบทความ (ปุ่มเดียวจบ)
            </CardDescription>
          </div>
          <Button onClick={handleRun} disabled={pipeline.isPending}>
            {pipeline.isPending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <RocketIcon className="mr-2 size-4" />
            )}
            {pipeline.isPending ? "กำลังทำงาน..." : "เริ่มไปป์ไลน์"}
          </Button>
        </div>
      </CardHeader>

      {(pipeline.isPending || bgMessage) && (
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            {bgMessage || "กำลังทำงาน... (วิเคราะห์ → ค้นหา → สร้างบทความ) อาจใช้เวลา 3-5 นาที"}
          </div>
          {bgMessage && (
            <p className="mt-2 text-sm text-muted-foreground">
              สามารถ refresh หน้านี้เพื่อดูผลลัพธ์ได้เลย
            </p>
          )}
        </CardContent>
      )}

      {result?.steps && (
        <CardContent>
          <div className="flex flex-col gap-3">
            {result.steps.map((step, i) => {
              const Icon = STEP_ICONS[step.name] || ScanSearchIcon
              const label = STEP_LABELS[step.name] || step.name
              const isOk = step.status === "completed"

              return (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {isOk ? (
                      <CheckCircleIcon className="size-4 text-green-600" />
                    ) : (
                      <XCircleIcon className="size-4 text-red-600" />
                    )}
                    <Icon className="size-4" />
                    <span className="font-medium">{label}</span>
                    <Badge variant={isOk ? "default" : "destructive"} className="ml-auto">
                      {step.status === "completed" ? "สำเร็จ" : step.status === "failed" ? "ล้มเหลว" : step.status}
                    </Badge>
                  </div>

                  {/* Step-specific data */}
                  {step.name === "analyze" && isOk && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>ธุรกิจ: {step.data?.businessType} | อุตสาหกรรม: {step.data?.industry}</p>
                      <p>คีย์เวิร์ดเริ่มต้น: {step.data?.seedCount} คีย์เวิร์ดที่ดึงได้</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(step.data?.seeds || []).slice(0, 8).map((s: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                        {(step.data?.seeds || []).length > 8 && (
                          <Badge variant="outline" className="text-xs">+{step.data.seeds.length - 8} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {step.name === "discover" && isOk && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>พบ: {step.data?.totalFound} คีย์เวิร์ด | บันทึก: {(step.data?.savedKeywords || []).length} (score &ge; 5)</p>
                      {(step.data?.savedKeywords || []).map((kw: any, j: number) => (
                        <div key={j} className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 text-xs">{kw.score}/10</Badge>
                          <span>{kw.keyword}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.name === "generate" && isOk && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {(step.data?.articles || []).length === 0 ? (
                        <p>ไม่มีบทความใหม่ (ทุกคีย์เวิร์ดมีบทความแล้ว)</p>
                      ) : (
                        (step.data?.articles || []).map((a: any, j: number) => (
                          <div key={j} className="flex items-center justify-between">
                            <span className="truncate max-w-[70%]">{a.title}</span>
                            <span className="text-xs">{a.wordCount} คำ</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {!isOk && (
                    <p className="text-sm text-destructive">{String(step.data)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
