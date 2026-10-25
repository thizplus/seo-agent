"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react"
import { TONE_OVERRIDE_OPTIONS } from "@/constants/ai-settings"
import type { RegenerateOptions } from "../types"

interface RegenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleTitle: string
  isPending: boolean
  onRegenerate: (options: RegenerateOptions) => void
}

export function RegenerateDialog({
  open,
  onOpenChange,
  articleTitle,
  isPending,
  onRegenerate,
}: RegenerateDialogProps) {
  const [useCurrentTitle, setUseCurrentTitle] = useState(true)
  const [customTitle, setCustomTitle] = useState("")
  const [writingTone, setWritingTone] = useState("")
  const [contentGuide, setContentGuide] = useState("")
  const [referenceUrls, setReferenceUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState("")

  const addUrl = () => {
    const trimmed = urlInput.trim()
    if (trimmed && referenceUrls.length < 3 && !referenceUrls.includes(trimmed)) {
      setReferenceUrls([...referenceUrls, trimmed])
      setUrlInput("")
    }
  }

  const removeUrl = (index: number) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    onRegenerate({
      useCurrentTitle,
      customTitle: useCurrentTitle ? undefined : customTitle,
      writingTone: writingTone || undefined,
      contentGuide: contentGuide || undefined,
      referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>สร้างบทความใหม่</DialogTitle>
          <DialogDescription>
            เนื้อหาเดิมจะถูกบันทึกเป็น version ก่อนหน้า
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex items-center justify-between gap-2">
            <Label>ใช้ title เดิม</Label>
            <Switch checked={useCurrentTitle} onCheckedChange={setUseCurrentTitle} />
          </div>
          {useCurrentTitle ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2 line-clamp-2">
              {articleTitle}
            </p>
          ) : (
            <Input
              placeholder="หัวข้อใหม่ (ไม่บังคับ — AI จะตั้งให้)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          )}

          {/* Tone */}
          <div>
            <Label className="mb-1 block">อารมณ์การเขียน</Label>
            <Select value={writingTone} onValueChange={(v) => setWritingTone(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ใช้ค่าเริ่มต้นของ site" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OVERRIDE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "default"} value={opt.value || " "}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Guide */}
          <div>
            <Label className="mb-1 block">ขอบเขตเนื้อหา</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="ไม่บังคับ — เช่น &quot;เน้นบูธผ้า ห้ามพูดถึงบูธเหล็ก&quot;"
              rows={3}
              value={contentGuide}
              onChange={(e) => setContentGuide(e.target.value)}
            />
          </div>

          {/* Reference URLs */}
          <div>
            <Label className="mb-1 block">URL บทความอ้างอิง (สูงสุด 3)</Label>
            <div className="space-y-2">
              {referenceUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-muted-foreground truncate bg-muted rounded px-2 py-1">
                    {url}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => removeUrl(i)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
              {referenceUrls.length < 3 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={addUrl}
                    disabled={!urlInput.trim()}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI จะอ่านบทความเหล่านี้เป็นแนวทาง แต่จะเขียนใหม่ด้วยภาษาของเราเอง
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
            {isPending ? "กำลังสร้าง..." : "สร้างใหม่"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
