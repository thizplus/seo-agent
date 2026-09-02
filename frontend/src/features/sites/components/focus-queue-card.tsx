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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TargetIcon, PlusIcon, Loader2Icon, Trash2Icon,
  SkipForwardIcon, RotateCcwIcon, CheckCircleIcon,
  XCircleIcon, ClockIcon, UploadIcon, ExternalLinkIcon,
} from "lucide-react"
import Link from "next/link"
import { NAV_ROUTES } from "@/constants/nav"

interface FocusQueueCardProps {
  siteId: string
}

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
  const [addForm, setAddForm] = useState({ priority: 1, pillarUrl: "", primaryKeyword: "", secondaryKeywords: "" })
  const [csvText, setCsvText] = useState("")

  const handleAdd = () => {
    if (!addForm.primaryKeyword.trim()) return
    addItem.mutate(addForm, {
      onSuccess: () => {
        setAddForm({ priority: (queue?.length || 0) + 2, pillarUrl: "", primaryKeyword: "", secondaryKeywords: "" })
        setShowAdd(false)
      },
      onError: (err) => alert(err.message),
    })
  }

  const handleImport = () => {
    if (!csvText.trim()) return
    const lines = csvText.trim().split("\n").filter(Boolean)
    const keywords = lines.map((line, i) => {
      const parts = line.split("\t")
      return {
        priority: parseInt(parts[0]) || i + 1,
        pillarUrl: parts[1]?.trim() || "",
        primaryKeyword: parts[2]?.trim() || parts[0]?.trim() || "",
        secondaryKeywords: parts[3]?.trim() || "",
      }
    }).filter(k => k.primaryKeyword)

    if (keywords.length === 0) {
      alert("ไม่พบ keyword ที่ valid")
      return
    }

    importQueue.mutate(keywords, {
      onSuccess: (data) => {
        setCsvText("")
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
            <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
              <UploadIcon className="mr-1 size-4" />
              Import
            </Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
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
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: status.progress }}
              />
            </div>
            {status.nextKeyword && (
              <p className="text-sm text-muted-foreground mt-2">
                ถัดไป: <span className="font-medium text-foreground">{status.nextKeyword.primaryKeyword}</span>
              </p>
            )}
          </div>
        )}

        {/* Add form */}
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleAdd} disabled={addItem.isPending}>
                {addItem.isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
                เพิ่ม
              </Button>
            </div>
          </div>
        )}

        {/* Import CSV */}
        {showImport && (
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <p className="font-medium">Import จาก Google Sheet</p>
            <p className="text-sm text-muted-foreground">Copy จาก Sheet แล้ววางที่นี่ (Tab-separated: ลำดับ → URL → Keyword → Keywords รอง)</p>
            <Textarea
              placeholder={"1\t/fabricbackdrop/\tแบคดรอปผ้า\tBackdrop ผ้า, แบคดรอปออกบูธ\n2\t/table-cover/\tผ้าคลุมโต๊ะ\tผ้าปูโต๊ะ, ผ้าคลุมโต๊ะออกบูธ"}
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            {csvText.trim() && (
              <p className="text-sm text-muted-foreground">
                พบ {csvText.trim().split("\n").filter(Boolean).length} keywords พร้อม import
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowImport(false); setCsvText("") }}>ยกเลิก</Button>
              <Button size="sm" onClick={handleImport} disabled={importQueue.isPending || !csvText.trim()}>
                {importQueue.isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
                Import
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
            <p>ยังไม่มีคิว กด "เพิ่ม" หรือ "Import" เพื่อเริ่ม</p>
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
                  <p className="text-sm text-muted-foreground mt-1 ml-6 truncate">
                    {item.secondaryKeywords}
                  </p>
                )}
                {item.pillarUrl && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{item.pillarUrl}</p>
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
