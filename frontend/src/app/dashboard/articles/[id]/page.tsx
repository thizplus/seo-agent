"use client"

import { use, useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { useArticleDetail, usePublishArticle, articleService } from "@/features/articles"
import { NAV_ROUTES } from "@/constants/nav"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SendIcon,
  Loader2Icon,
  ExternalLinkIcon,
  ImageIcon,
  SearchIcon,
  CheckIcon,
  UploadIcon,
  StarIcon,
  Trash2Icon,
  BarChart3Icon,
  HistoryIcon,
  ZapIcon,
} from "lucide-react"

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: article, isLoading } = useArticleDetail(id)
  const publishArticle = usePublishArticle()
  const [searchingImages, setSearchingImages] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])  // preview จาก search
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())  // index ที่เลือก
  const [featuredIndex, setFeaturedIndex] = useState<number>(0)  // รูปที่จะเป็น featured
  const [images, setImages] = useState<any[]>([])
  const [metrics, setMetrics] = useState<Record<string, any> | null>(null)

  // โหลดรูปจาก DB เมื่อเปิดหน้า
  useEffect(() => {
    if (id) {
      articleService.getImages(id).then(setImages).catch(() => {})
    }
  }, [id])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [optimizing, setOptimizing] = useState(false)

  const handleFetchMetrics = async () => {
    setMetricsLoading(true)
    try {
      setMetrics(await articleService.fetchMetrics(id))
    } catch {
      setMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }

  const handleLoadVersions = async () => {
    try {
      setVersions(await articleService.getVersions(id))
    } catch {}
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const result = await articleService.optimize(id)
      alert(result.action ? `Optimized: ${result.action}` : "No optimization needed")
      handleLoadVersions()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Optimize failed")
    } finally {
      setOptimizing(false)
    }
  }

  const handleSearchImages = async () => {
    if (!article) return
    setSearchingImages(true)
    setSearchResults([])
    setSelectedImages(new Set())
    try {
      const result = await articleService.searchImages(article.title, 10)
      setSearchResults(result || [])
      // Auto select แรก 3 รูป
      setSelectedImages(new Set([0, 1, 2].filter((i) => i < (result?.length || 0))))
      setFeaturedIndex(0)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Search failed")
    } finally {
      setSearchingImages(false)
    }
  }

  const toggleImageSelect = (index: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleUploadSelected = async () => {
    if (selectedImages.size === 0) return alert("เลือกรูปก่อนครับ")
    setUploadingImages(true)
    try {
      const toUpload = Array.from(selectedImages).map((i) => ({
        url: searchResults[i].url,
        alt_text: article?.title || "",
        role: i === featuredIndex ? "featured" : "content",
      }))
      await articleService.uploadSelectedImages(id, toUpload)
      // Reload images จาก DB
      const saved = await articleService.getImages(id)
      setImages(saved)
      setSearchResults([])
      setSelectedImages(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleGenerateImages = async () => {
    setGeneratingImages(true)
    try {
      const result = await articleService.generateImages(id, 2)
      setImages(result || [])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image generation failed")
    } finally {
      setGeneratingImages(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("ลบรูปนี้? (จะลบจาก WordPress ด้วย)")) return
    try {
      await articleService.deleteImage(id, imageId)
      setImages((prev) => prev.filter((img) => img.ID !== imageId))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handleDeleteArticle = async () => {
    if (!confirm("ลบบทความนี้? (จะลบจาก WordPress + รูปทั้งหมดด้วย)")) return
    try {
      await articleService.deleteArticle(id)
      window.location.href = "/dashboard"
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handlePublish = () => {
    if (confirm("เผยแพร่บทความนี้ไปยัง WordPress?")) {
      publishArticle.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader items={[{ label: "กำลังโหลด..." }]} />
        <div className="p-4 text-base text-muted-foreground">กำลังโหลดบทความ...</div>
      </>
    )
  }

  if (!article) {
    return (
      <>
        <PageHeader items={[{ label: "ไม่พบ" }]} />
        <div className="p-4 text-base text-destructive">ไม่พบบทความ</div>
      </>
    )
  }

  const eeat = article.eeatScore

  return (
    <>
      <PageHeader
        items={[
          { label: "Dashboard", href: NAV_ROUTES.DASHBOARD },
          { label: "รายละเอียดบทความ" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{article.title}</h1>
            <p className="mt-1 text-base text-muted-foreground">
              {article.wordCount} คำ &middot; v{article.contentVersion}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {article.publishStatus === "published" && article.publishedUrl ? (
              <>
                <a
                  href={article.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ExternalLinkIcon className="mr-2 size-4" />
                  ดูบนเว็บ
                </a>
                <Button
                  variant="outline"
                  onClick={handlePublish}
                  disabled={publishArticle.isPending}
                >
                  {publishArticle.isPending ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SendIcon className="mr-2 size-4" />
                  )}
                  เผยแพร่ใหม่
                </Button>
              </>
            ) : article.status === "completed" ? (
              <Button
                onClick={handlePublish}
                disabled={publishArticle.isPending}
              >
                {publishArticle.isPending ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <SendIcon className="mr-2 size-4" />
                )}
                เผยแพร่ไปยัง WordPress
              </Button>
            ) : null}
            <Button variant="destructive" size="sm" onClick={handleDeleteArticle}>
              <Trash2Icon className="mr-1 size-4" />
              ลบ
            </Button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2">
          <Badge
            variant={
              article.status === "completed"
                ? "default"
                : article.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
          >
            {article.status}
          </Badge>
          <Badge variant="outline">{article.publishStatus}</Badge>
        </div>

        {publishArticle.isError && (
          <p className="text-base text-destructive">
            เผยแพร่ล้มเหลว: {publishArticle.error.message}
          </p>
        )}

        {/* EEAT Score */}
        {eeat && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">คะแนน EEAT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {(
                  [
                    ["ประสบการณ์", eeat.experience],
                    ["ความเชี่ยวชาญ", eeat.expertise],
                    ["ความน่าเชื่อถือ", eeat.authority],
                    ["ความไว้วางใจ", eeat.trust],
                  ] as const
                ).map(([label, score]) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold">{score}/10</div>
                    <div className="text-base text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics + Optimize */}
        {article.publishStatus === "published" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3Icon className="size-4" />
                  ตัวชี้วัดประสิทธิภาพ
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleFetchMetrics} disabled={metricsLoading}>
                    {metricsLoading ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <BarChart3Icon className="mr-1 size-4" />}
                    {metricsLoading ? "กำลังโหลด..." : "ดึงข้อมูล"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleOptimize} disabled={optimizing}>
                    {optimizing ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <ZapIcon className="mr-1 size-4" />}
                    {optimizing ? "กำลังปรับปรุง..." : "ปรับปรุง"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.clicks || 0}</div>
                    <div className="text-sm text-muted-foreground">คลิก</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.impressions || 0}</div>
                    <div className="text-sm text-muted-foreground">แสดงผล</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{((metrics.ctr || 0) * 100).toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">CTR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.position || "-"}</div>
                    <div className="text-sm text-muted-foreground">อันดับเฉลี่ย</div>
                  </div>
                </div>
              ) : (
                <p className="text-base text-muted-foreground">กด &quot;ดึงข้อมูล&quot; เพื่อโหลดข้อมูลจาก GSC (ต้องเชื่อมต่อ GSC ก่อน)</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Version History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HistoryIcon className="size-4" />
                ประวัติเวอร์ชัน
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={handleLoadVersions}>
                โหลดเวอร์ชัน
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {versions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {versions.map((v: any) => (
                  <div key={v.ID} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">v{v.Version}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{v.Action}</Badge>
                    </div>
                    <div className="text-base text-muted-foreground">
                      {v.WordCount} คำ &middot; {new Date(v.CreatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">ยังไม่มีประวัติเวอร์ชัน</p>
            )}
          </CardContent>
        </Card>

        {/* Meta Description */}
        {article.metaDescription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meta Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base">{article.metaDescription}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {article.metaDescription.length} ตัวอักษร
              </p>
            </CardContent>
          </Card>
        )}

        {/* Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="size-4" />
                รูปภาพ
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSearchImages} disabled={searchingImages}>
                  {searchingImages ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <SearchIcon className="mr-1 size-4" />}
                  {searchingImages ? "กำลังค้นหา..." : "ค้นหารูปภาพ"}
                </Button>
                {selectedImages.size > 0 && (
                  <Button size="sm" onClick={handleUploadSelected} disabled={uploadingImages}>
                    {uploadingImages ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <UploadIcon className="mr-1 size-4" />}
                    {uploadingImages ? "กำลังอัปโหลด..." : `อัปโหลดที่เลือก (${selectedImages.size})`}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleGenerateImages} disabled={generatingImages}>
                  {generatingImages ? <Loader2Icon className="mr-1 size-4 animate-spin" /> : <ImageIcon className="mr-1 size-4" />}
                  {generatingImages ? "กำลังสร้าง..." : "สร้างด้วย AI"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Results — เลือกก่อน upload */}
            {searchResults.length > 0 && (
              <div className="mb-4">
                <p className="text-base text-muted-foreground mb-2">
                  คลิกเพื่อเลือก กดดาวเป็นรูปหลัก แล้วกด &quot;อัปโหลดที่เลือก&quot;
                </p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {searchResults.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => toggleImageSelect(i)}
                      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        selectedImages.has(i) ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={img.thumb_url || img.url}
                        alt=""
                        className="w-full aspect-video object-cover"
                        loading="lazy"
                      />
                      {selectedImages.has(i) && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <CheckIcon className="size-3" />
                        </div>
                      )}
                      {selectedImages.has(i) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFeaturedIndex(i) }}
                          className={`absolute top-1 right-1 rounded-full p-0.5 ${
                            featuredIndex === i ? "bg-yellow-400 text-yellow-900" : "bg-black/50 text-white hover:bg-yellow-400 hover:text-yellow-900"
                          }`}
                          title={featuredIndex === i ? "Featured image" : "Set as featured"}
                        >
                          <StarIcon className="size-3" />
                        </button>
                      )}
                      <p className="text-sm text-muted-foreground p-1 truncate">{img.source || ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Images */}
            {images.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {images.map((img, i) => (
                  <div key={i} className="rounded-lg border overflow-hidden">
                    {img.url ? (
                      <>
                        <img src={img.url} alt={img.alt_text} className="w-full aspect-video object-cover" />
                        <div className="p-2 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground truncate">{img.alt_text || img.AltText}</p>
                          </div>
                          <div className="flex gap-1 items-center shrink-0">
                            {(img.role === "featured" || img.Role === "featured") && <Badge className="text-sm">รูปหลัก</Badge>}
                            <button
                              onClick={() => handleDeleteImage(img.ID || img.id)}
                              className="text-destructive hover:bg-destructive/10 rounded p-1"
                              title="Delete image"
                            >
                              <Trash2Icon className="size-3" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-base text-destructive">ข้อผิดพลาด: {img.error || "ล้มเหลว"}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && images.length === 0 && (
              <p className="text-base text-muted-foreground">
                กด &quot;ค้นหารูปภาพ&quot; เลือกรูปที่ต้องการ แล้วอัปโหลด
              </p>
            )}
          </CardContent>
        </Card>

        {/* Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ตัวอย่างเนื้อหา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {article.content || "ไม่มีเนื้อหา"}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
