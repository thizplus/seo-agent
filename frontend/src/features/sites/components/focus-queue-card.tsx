"use client"

import { useState } from "react"
import {
  useFocusQueue, useFocusQueueStatus,
  useAddFocusQueueItem, useImportFocusQueue,
  useDeleteFocusQueueItem, useSkipFocusQueueItem,
  useRetryFocusQueueItem, useResetFocusQueue,
} from "../hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TargetIcon, PlusIcon, Loader2Icon, Trash2Icon,
  SkipForwardIcon, RotateCcwIcon, CheckCircleIcon,
  XCircleIcon, ClockIcon, ExternalLinkIcon,
} from "lucide-react"
import Link from "next/link"

interface FocusQueueCardProps {
  siteId: string
}

const emptyRow = { priority: 0, pillarUrl: "", primaryKeyword: "", secondaryKeywords: "", customTitle: "", overrideTone: "", overrideGuide: "" }

const TONE_OPTIONS = [
  { value: "", label: "ใช้ค่าเริ่มต้นของ site" },
  { value: "กันเอง สนุก ใช้ภาษาง่ายๆ", label: "กันเอง สนุก" },
  { value: "ทางการ มืออาชีพ น่าเชื่อถือ", label: "ทางการ มืออาชีพ" },
  { value: "เน้นขาย กระตุ้นซื้อ มี CTA ทุกหัวข้อ", label: "เน้นขาย" },
  { value: "ให้ความรู้ อธิบายละเอียด เหมือนครูสอน", label: "ให้ความรู้" },
  { value: "รีวิว เปรียบเทียบ ตรงไปตรงมา", label: "รีวิว เปรียบเทียบ" },
]

export function FocusQueueCard({ siteId }: FocusQueueCardProps) {
  const { data: queue, isLoading } = useFocusQueue(siteId)
  const { data: status } = useFocusQueueStatus(siteId)
  const addItem = useAddFocusQueueItem(siteId)
  const importQueue = useImportFocusQueue(siteId)
  const deleteItem = useDeleteFocusQueueItem(siteId)
  const skipItem = useSkipFocusQueueItem(siteId)
  const retryItem = useRetryFocusQueueItem(siteId)
  const resetQueue = useResetFocusQueue(siteId)

  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addForm, setAddForm] = useState({ ...emptyRow, priority: 1 })

  // Import: หลาย rows กรอกทีเดียว
  const [importRows, setImportRows] = useState([{ ...emptyRow, priority: 1 }, { ...emptyRow, priority: 2 }, { ...emptyRow, priority: 3 }])

  const handleAdd = () => {
    if (!addForm.primaryKeyword.trim()) return
    addItem.mutate(addForm, {
      onSuccess: () => {
        setAddForm({ ...emptyRow, priority: (queue?.length || 0) + 2 })
        setShowAdd(false)
      },
      onError: (err) => alert(err.message),
    })
  }

  const updateImportRow = (index: number, field: string, value: string | number) => {
    setImportRows(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const addImportRow = () => {
    setImportRows(rows => [...rows, { ...emptyRow, priority: rows.length + 1 }])
  }

  const removeImportRow = (index: number) => {
    setImportRows(rows => rows.filter((_, i) => i !== index))
  }

  const handleImport = () => {
    const valid = importRows.filter(r => r.primaryKeyword.trim())
    if (valid.length === 0) {
      alert("กรุณากรอก keyword อย่างน้อย 1 ตัว")
      return
    }
    const keywords = valid.map((r, i) => ({
      priority: r.priority || i + 1,
      pillarUrl: r.pillarUrl.trim(),
      primaryKeyword: r.primaryKeyword.trim(),
      secondaryKeywords: r.secondaryKeywords.trim(),
      customTitle: r.customTitle?.trim() || "",
    }))

    importQueue.mutate(keywords, {
      onSuccess: (data) => {
        setImportRows([{ ...emptyRow, priority: 1 }, { ...emptyRow, priority: 2 }, { ...emptyRow, priority: 3 }])
        setShowImport(false)
        alert(`Import สำเร็จ ${data.imported} keywords`)
      },
      onError: (err) => alert(err.message),
    })
  }

  const handleReset = () => {
    if (!confirm("Reset คิวทั้งหมดเป็น 'รอสร้าง'? (บทความเดิมไม่ถูกลบ)")) return
    resetQueue.mutate()
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed": return <CheckCircleIcon className="size-4 text-green-600 shrink-0" />
      case "failed": return <XCircleIcon className="size-4 text-red-500 shrink-0" />
      case "skipped": return <SkipForwardIcon className="size-4 text-muted-foreground shrink-0" />
      default: return <ClockIcon className="size-4 text-amber-500 shrink-0" />
    }
  }

  const statusLabel = (s: string, retryCount: number) => {
    switch (s) {
      case "completed": return <Badge variant="default" className="bg-green-600">สร้างแล้ว</Badge>
      case "failed": return <Badge variant="destructive">ล้มเหลว ({retryCount}/3)</Badge>
      case "skipped": return <Badge variant="secondary">ข้าม</Badge>
      default: return <Badge variant="outline">รอสร้าง</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="size-5" />
              คิวบทความ (Keyword Focus)
            </CardTitle>
            <CardDescription>
              ระบบจะสร้างบทความตามลำดับอัตโนมัติ วันละ 1 keyword
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowImport(!showImport); setShowAdd(false) }}>
              <PlusIcon className="mr-1 size-4" />
              Import หลายตัว
            </Button>
            <Button size="sm" onClick={() => { setShowAdd(!showAdd); setShowImport(false) }}>
              <PlusIcon className="mr-1 size-4" />
              เพิ่ม
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Progress bar */}
        {status && status.total > 0 && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>{status.completed}/{status.total} เสร็จ</span>
              {status.failed > 0 && <span className="text-red-500">{status.failed} ล้มเหลว</span>}
              <span className="text-muted-foreground">เหลือ ~{status.estimatedDaysLeft} วัน</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: status.progress }} />
            </div>
            {status.nextKeyword && (
              <p className="text-sm text-muted-foreground mt-2">
                ถัดไป: <span className="font-medium text-foreground">{status.nextKeyword.primaryKeyword}</span>
              </p>
            )}
          </div>
        )}

        {/* Add single item form */}
        {showAdd && (
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <p className="font-medium">เพิ่ม Keyword เข้าคิว</p>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">ลำดับ</span>
              <Input type="number" value={addForm.priority} onChange={(e) => setAddForm({ ...addForm, priority: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">Keyword</span>
              <Input placeholder="keyword หลัก" value={addForm.primaryKeyword} onChange={(e) => setAddForm({ ...addForm, primaryKeyword: e.target.value })} />
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">Keywords รอง</span>
              <Input placeholder="keyword1, keyword2, ..." value={addForm.secondaryKeywords} onChange={(e) => setAddForm({ ...addForm, secondaryKeywords: e.target.value })} />
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">URL หลัก</span>
              <Input placeholder="/path/" value={addForm.pillarUrl} onChange={(e) => setAddForm({ ...addForm, pillarUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">หัวข้อ</span>
              <Input placeholder="กำหนดหัวข้อบทความ (ไม่บังคับ — AI จะตั้งให้)" value={addForm.customTitle} onChange={(e) => setAddForm({ ...addForm, customTitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm">อารมณ์</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addForm.overrideTone}
                onChange={(e) => setAddForm({ ...addForm, overrideTone: e.target.value })}
              >
                {TONE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
              <span className="text-sm mt-2">แนวทาง</span>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="แนวทางเฉพาะ keyword นี้ (ไม่บังคับ — ใช้ค่าเริ่มต้นของ site)"
                rows={2}
                value={addForm.overrideGuide}
                onChange={(e) => setAddForm({ ...addForm, overrideGuide: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleAdd} disabled={addItem.isPending}>
                {addItem.isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
                เพิ่ม
              </Button>
            </div>
          </div>
        )}

        {/* Import multiple items form */}
        {showImport && (
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <p className="font-medium">Import หลาย Keywords พร้อมกัน</p>
            <p className="text-sm text-muted-foreground">กรอกทีละช่อง ไม่ต้องกังวลเรื่อง format</p>

            {/* Rows */}
            {importRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-2 items-center">
                <Input type="number" value={row.priority} onChange={(e) => updateImportRow(i, "priority", parseInt(e.target.value) || i + 1)} className="text-center text-sm" />
                <Input placeholder="Keyword หลัก *" value={row.primaryKeyword} onChange={(e) => updateImportRow(i, "primaryKeyword", e.target.value)} />
                <Input placeholder="Keywords รอง (kw1, kw2, ...)" value={row.secondaryKeywords} onChange={(e) => updateImportRow(i, "secondaryKeywords", e.target.value)} />
                <Input placeholder="URL หลัก /path/" value={row.pillarUrl} onChange={(e) => updateImportRow(i, "pillarUrl", e.target.value)} />
                <Button variant="ghost" size="icon" className="size-8" onClick={() => removeImportRow(i)}>
                  <Trash2Icon className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addImportRow} className="self-start">
              <PlusIcon className="mr-1 size-4" />
              เพิ่มแถว
            </Button>

            <p className="text-sm text-muted-foreground">
              {importRows.filter(r => r.primaryKeyword.trim()).length} keywords พร้อม import
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleImport} disabled={importQueue.isPending}>
                {importQueue.isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
                Import {importRows.filter(r => r.primaryKeyword.trim()).length} keywords
              </Button>
            </div>
          </div>
        )}

        {/* Queue list */}
        {isLoading ? (
          <p className="text-muted-foreground">กำลังโหลด...</p>
        ) : !queue?.length ? (
          <div className="text-center py-6 text-muted-foreground">
            <TargetIcon className="mx-auto size-8 mb-2 opacity-50" />
            <p>ยังไม่มีคิว กด "เพิ่ม" หรือ "Import หลายตัว" เพื่อเริ่ม</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(item.status)}
                    <span className="text-muted-foreground text-sm">#{item.priority}</span>
                    <span className="font-medium truncate">{item.primaryKeyword}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {statusLabel(item.status, item.retryCount)}
                    {item.status === "failed" && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => retryItem.mutate(item.id)} title="ลองใหม่">
                        <RotateCcwIcon className="size-3.5" />
                      </Button>
                    )}
                    {item.status === "pending" && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => skipItem.mutate(item.id)} title="ข้าม">
                        <SkipForwardIcon className="size-3.5" />
                      </Button>
                    )}
                    {item.articleId && (
                      <Link href={`/dashboard/articles/${item.articleId}`}>
                        <Button variant="ghost" size="icon" className="size-8" title="ดูบทความ">
                          <ExternalLinkIcon className="size-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { if (confirm("ลบ keyword นี้ออกจากคิว?")) deleteItem.mutate(item.id) }}>
                      <Trash2Icon className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                {item.secondaryKeywords && (
                  <p className="text-sm text-muted-foreground mt-1 ml-6 truncate">{item.secondaryKeywords}</p>
                )}
                {item.pillarUrl && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{item.pillarUrl}</p>
                )}
                {item.customTitle && (
                  <p className="text-xs text-blue-600 mt-0.5 ml-6">หัวข้อ: {item.customTitle}</p>
                )}
                {item.overrideTone && (
                  <p className="text-xs text-purple-600 mt-0.5 ml-6">อารมณ์: {item.overrideTone}</p>
                )}
                {item.overrideGuide && (
                  <p className="text-xs text-amber-600 mt-0.5 ml-6">แนวทาง: {item.overrideGuide}</p>
                )}
                {item.errorMessage && (
                  <p className="text-sm text-red-500 mt-1 ml-6">{item.errorMessage}</p>
                )}
                {item.completedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                    สร้างเมื่อ {new Date(item.completedAt).toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reset button */}
        {queue && queue.length > 0 && queue.some(q => q.status === "completed" || q.status === "skipped") && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetQueue.isPending}>
              <RotateCcwIcon className="mr-1 size-4" />
              Reset คิว (วนรอบใหม่)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
