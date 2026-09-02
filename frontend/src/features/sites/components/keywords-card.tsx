"use client"

import { useState } from "react"
import { useDiscoverKeywords } from "../hooks"
import { useKeywordList, useCreateKeyword, useAnalyzeSERP } from "@/features/keywords"
import { useGenerateArticle } from "@/features/articles"
import { TONE_OVERRIDE_OPTIONS } from "@/constants/ai-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { KeyIcon, PlusIcon, SparklesIcon, Loader2Icon, ScanSearchIcon, SearchIcon } from "lucide-react"

interface KeywordsCardProps {
  siteId: string
}

export function KeywordsCard({ siteId }: KeywordsCardProps) {
  const { data: keywords, isLoading } = useKeywordList(siteId)
  const createKeyword = useCreateKeyword(siteId)
  const generateArticle = useGenerateArticle()
  const discoverKeywords = useDiscoverKeywords(siteId)
  const analyzeSERP = useAnalyzeSERP(siteId)

  const [newKeyword, setNewKeyword] = useState("")
  const [discoveries, setDiscoveries] = useState<any[]>([])

  // Generate dialog state
  const [genDialog, setGenDialog] = useState(false)
  const [genKeyword, setGenKeyword] = useState<{ id: string; keyword: string } | null>(null)
  const [genForm, setGenForm] = useState({ customTitle: "", writingTone: "", contentGuide: "" })

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyword.trim()) return
    await createKeyword.mutateAsync({ keyword: newKeyword.trim() })
    setNewKeyword("")
  }

  const handleDiscover = (keyword?: string) => {
    const seeds = keyword ? [keyword] : (keywords?.map((k) => k.keyword) || [])
    discoverKeywords.mutate(seeds, {
      onSuccess: (result) => setDiscoveries(result || []),
      onError: (err) => alert(err.message),
    })
  }

  const handleAddDiscoveredKeyword = async (keyword: string) => {
    await createKeyword.mutateAsync({ keyword })
    setDiscoveries((prev) => prev.filter((d) => d.keyword !== keyword))
  }

  const openGenDialog = (kw: { id: string; keyword: string }) => {
    setGenKeyword(kw)
    setGenForm({ customTitle: "", writingTone: "", contentGuide: "" })
    setGenDialog(true)
  }

  const handleGenerate = () => {
    if (!genKeyword) return
    generateArticle.mutate(
      {
        siteId,
        keywordId: genKeyword.id,
        customTitle: genForm.customTitle || undefined,
        writingTone: genForm.writingTone || undefined,
        contentGuide: genForm.contentGuide || undefined,
      },
      {
        onSuccess: () => setGenDialog(false),
        onError: (err) => alert(err.message),
      }
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            คีย์เวิร์ด
          </CardTitle>
          <CardDescription>เพิ่มคีย์เวิร์ดและสร้างบทความ</CardDescription>
        </CardHeader>
        <CardHeader className="pt-0">
          <Button variant="outline" size="sm" onClick={() => handleDiscover()} disabled={discoverKeywords.isPending}>
            {discoverKeywords.isPending ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <ScanSearchIcon className="mr-1 size-4" />}
            {discoverKeywords.isPending ? "กำลังค้นหา..." : "ค้นหาคีย์เวิร์ดทั้งหมด"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="พิมพ์คีย์เวิร์ด..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={createKeyword.isPending}>
              <PlusIcon className="mr-1 size-4" />
              เพิ่ม
            </Button>
          </form>

          {isLoading ? (
            <div className="text-muted-foreground">กำลังโหลดคีย์เวิร์ด...</div>
          ) : !keywords?.length ? (
            <p className="text-muted-foreground">ยังไม่มีคีย์เวิร์ด เพิ่มด้านบน</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-3 font-medium">คีย์เวิร์ด</th>
                    <th className="p-3 font-medium">คะแนน</th>
                    <th className="p-3 font-medium">เจตนา</th>
                    <th className="p-3 font-medium">SERP</th>
                    <th className="p-3 font-medium text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{kw.keyword}</td>
                      <td className="p-3">
                        {kw.score > 0 && (
                          <Badge className={kw.score >= 7 ? "bg-green-100 text-green-700" : kw.score >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                            {kw.score}/10
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {kw.intent && <Badge variant="secondary" className="text-xs">{kw.intent}</Badge>}
                      </td>
                      <td className="p-3">
                        {kw.serpData?.results ? (
                          <span className="text-xs text-muted-foreground">{kw.serpData.results.length} ผล | เฉลี่ย {kw.serpData.avg_word_count || 0} คำ</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => analyzeSERP.mutate(kw.id)} disabled={analyzeSERP.isPending}>
                          <SearchIcon className="mr-1 size-4" />
                          SERP
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openGenDialog({ id: kw.id, keyword: kw.keyword })}
                          disabled={generateArticle.isPending}
                        >
                          <SparklesIcon className="mr-1 size-4" />
                          สร้างบทความ
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Article Dialog */}
      <Dialog open={genDialog} onOpenChange={setGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างบทความ</DialogTitle>
            <DialogDescription>
              Keyword: <span className="font-medium text-foreground">{genKeyword?.keyword}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">หัวข้อบทความ</label>
              <Input
                placeholder="ไม่บังคับ — AI จะตั้งให้"
                value={genForm.customTitle}
                onChange={(e) => setGenForm({ ...genForm, customTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">อารมณ์การเขียน</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={genForm.writingTone}
                onChange={(e) => setGenForm({ ...genForm, writingTone: e.target.value })}
              >
                {TONE_OVERRIDE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">แนวทางเนื้อหา</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="ไม่บังคับ — ใช้ค่าเริ่มต้นของ site"
                rows={3}
                value={genForm.contentGuide}
                onChange={(e) => setGenForm({ ...genForm, contentGuide: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleGenerate} disabled={generateArticle.isPending}>
              {generateArticle.isPending && <Loader2Icon className="mr-1 size-4 animate-spin" />}
              สร้างบทความ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Discoveries */}
      {discoveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearchIcon className="size-5" />
              คีย์เวิร์ดที่ค้นพบ ({discoveries.length})
            </CardTitle>
            <CardDescription>กด + เพื่อเพิ่มคีย์เวิร์ด</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-3 font-medium">คีย์เวิร์ด</th>
                    <th className="p-3 font-medium">แหล่งที่มา</th>
                    <th className="p-3 font-medium">เจตนา</th>
                    <th className="p-3 font-medium">คะแนน</th>
                    <th className="p-3 font-medium text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveries.slice(0, 20).map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{d.keyword}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{d.source}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs">{d.intent}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={d.score >= 7 ? "bg-green-100 text-green-700" : d.score >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                          {d.score}/10
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleAddDiscoveredKeyword(d.keyword)}>
                          <PlusIcon className="mr-1 size-4" />
                          เพิ่ม
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
