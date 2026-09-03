"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Loader2Icon,
  SearchIcon,
  WandIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckIcon,
} from "lucide-react"

interface ReviewIssue {
  type: string
  severity: "critical" | "warning" | "info"
  original: string
  suggestion: string
  reason: string
}

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReview: (customRules: string, targetTone: string) => Promise<{ issues: ReviewIssue[]; summary: any }>
  onRewrite: (issues: ReviewIssue[], customRules: string, targetTone: string) => Promise<{ content: string }>
  onApply: (content: string) => void
}

const TONE_OPTIONS = [
  "สนทนาเป็นกันเอง",
  "มืออาชีพแต่เข้าถึงง่าย",
  "ให้ความรู้",
  "กระตุ้นให้ซื้อ",
]

const TYPE_LABELS: Record<string, string> = {
  formal_language: "ภาษาทางการเกินไป",
  wrong_translation: "คำแปลไม่ตรง",
  irrelevant_content: "เนื้อหาไม่เกี่ยวข้อง",
  keyword_stuffing: "คำซ้ำมากเกินไป",
  custom_rules: "เงื่อนไขกำหนดเอง",
}

const SEVERITY_ICON = {
  critical: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
}

const SEVERITY_COLOR = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-blue-500",
}

export function ReviewDialog({
  open,
  onOpenChange,
  onReview,
  onRewrite,
  onApply,
}: ReviewDialogProps) {
  const [step, setStep] = useState<"input" | "issues" | "rewriting" | "diff">("input")
  const [customRules, setCustomRules] = useState("")
  const [targetTone, setTargetTone] = useState("สนทนาเป็นกันเอง")
  const [reviewing, setReviewing] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [issues, setIssues] = useState<ReviewIssue[]>([])
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set())
  const [rewrittenContent, setRewrittenContent] = useState("")

  const handleReview = async () => {
    setReviewing(true)
    try {
      const result = await onReview(customRules, targetTone)
      setIssues(result.issues || [])
      setSelectedIssues(new Set(result.issues?.map((_: any, i: number) => i) || []))
      setStep("issues")
    } catch {
      // ignore
    } finally {
      setReviewing(false)
    }
  }

  const toggleIssue = (index: number) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleRewrite = async () => {
    const selected = issues.filter((_, i) => selectedIssues.has(i))
    if (selected.length === 0) return
    setRewriting(true)
    setStep("rewriting")
    try {
      const result = await onRewrite(selected, customRules, targetTone)
      setRewrittenContent(result.content)
      setStep("diff")
    } catch {
      setStep("issues")
    } finally {
      setRewriting(false)
    }
  }

  const handleApply = () => {
    onApply(rewrittenContent)
    handleClose()
  }

  const handleClose = () => {
    setStep("input")
    setIssues([])
    setSelectedIssues(new Set())
    setRewrittenContent("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "input" && "ตรวจสอบบทความ"}
            {step === "issues" && `ผลตรวจสอบ (พบ ${issues.length} ปัญหา)`}
            {step === "rewriting" && "กำลัง Rewrite..."}
            {step === "diff" && "เนื้อหาที่แก้ไขแล้ว"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1">โทนที่ต้องการ</Label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <Button
                    key={tone}
                    size="sm"
                    variant={targetTone === tone ? "default" : "outline"}
                    onClick={() => setTargetTone(tone)}
                  >
                    {tone}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1">เงื่อนไขเพิ่มเติม (ถ้ามี)</Label>
              <Textarea
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                rows={3}
                placeholder={"เช่น:\n- ห้ามระบุระยะเวลาผลิต\n- ห้ามเขียนเรื่องบริจาค\n- ห้ามระบุราคา"}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleReview} disabled={reviewing}>
                {reviewing ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <SearchIcon className="mr-2 size-4" />
                )}
                {reviewing ? "กำลังตรวจสอบ..." : "ตรวจสอบ"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Issues */}
        {step === "issues" && (
          <div className="flex flex-col gap-2">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckIcon className="size-8 mx-auto mb-2 text-green-500" />
                <p>ไม่พบปัญหา! บทความดูดีแล้ว</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  คลิกเพื่อเลือก/ยกเลิกปัญหาที่ต้องการแก้ ({selectedIssues.size} เลือก)
                </p>
                <div className="flex flex-col gap-2 max-h-[400px] overflow-auto">
                  {issues.map((issue, i) => {
                    const Icon = SEVERITY_ICON[issue.severity] || InfoIcon
                    const selected = selectedIssues.has(i)
                    return (
                      <div
                        key={i}
                        onClick={() => toggleIssue(i)}
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/30 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`size-4 mt-0.5 shrink-0 ${SEVERITY_COLOR[issue.severity]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {TYPE_LABELS[issue.type] || issue.type}
                              </Badge>
                            </div>
                            <p className="text-sm line-through text-muted-foreground">
                              {issue.original}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              → {issue.suggestion}
                            </p>
                            {issue.reason && (
                              <p className="text-xs text-muted-foreground mt-1">{issue.reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStep("input")}>
                    กลับ
                  </Button>
                  <Button
                    onClick={handleRewrite}
                    disabled={selectedIssues.size === 0}
                  >
                    <WandIcon className="mr-2 size-4" />
                    แก้ไข {selectedIssues.size} ปัญหา
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {/* Step 3: Rewriting */}
        {step === "rewriting" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2Icon className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">กำลัง Rewrite บทความ...</p>
          </div>
        )}

        {/* Step 4: Diff / Apply */}
        {step === "diff" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border max-h-[400px] overflow-auto">
              <div className="prose prose-sm max-w-none dark:prose-invert p-4 whitespace-pre-wrap text-sm">
                {rewrittenContent.substring(0, 3000)}
                {rewrittenContent.length > 3000 && "..."}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("issues")}>
                กลับ
              </Button>
              <Button onClick={handleApply}>
                <CheckIcon className="mr-2 size-4" />
                ใช้เวอร์ชันใหม่
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
