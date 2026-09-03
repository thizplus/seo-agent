"use client"

import { use, useState, useEffect, useCallback, useRef, type RefObject } from "react"
import { PageHeader } from "@/components/page-header"
import {
  useArticleDetail,
  usePublishArticle,
  useUpdateContent,
  articleService,
  MarkdownEditor,
  MarkdownPreview,
  ImageInsertDialog,
  VideoInsertDialog,
} from "@/features/articles"
import type { MarkdownEditorRef } from "@/features/articles"
import { NAV_ROUTES } from "@/constants/nav"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
  SaveIcon,
  EyeIcon,
  SplitIcon,
  PenLineIcon,
  RefreshCwIcon,
} from "lucide-react"

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: article, isLoading } = useArticleDetail(id)
  const publishArticle = usePublishArticle()
  const updateContent = useUpdateContent()

  // Editor state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [metaDesc, setMetaDesc] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split")

  // Dialogs
  const editorRef = useRef<MarkdownEditorRef>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)

  // Images tab
  const [searchingImages, setSearchingImages] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [featuredIndex, setFeaturedIndex] = useState<number>(0)
  const [images, setImages] = useState<any[]>([])

  // Featured image
  const [featuredImage, setFeaturedImage] = useState("")
  const [pageImages, setPageImages] = useState<{ url: string; alt: string }[]>([])
  const [loadingPageImages, setLoadingPageImages] = useState(false)
  const [settingFeatured, setSettingFeatured] = useState(false)
  const [imageSheetOpen, setImageSheetOpen] = useState(false)

  // Info tab
  const [metrics, setMetrics] = useState<Record<string, any> | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [optimizing, setOptimizing] = useState(false)

  // Sync article data to editor state
  useEffect(() => {
    if (article) {
      setTitle(article.title)
      setContent(article.content)
      setMetaDesc(article.metaDescription)
      setFeaturedImage(article.featuredImageUrl || "")
      setIsDirty(false)
    }
  }, [article])

  // โหลดรูปจาก DB
  useEffect(() => {
    if (id) {
      articleService.getImages(id).then(setImages).catch(() => {})
    }
  }, [id])

  // Auto-save ทุก 60 วินาที
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isDirty || !article) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      updateContent.mutate({
        id,
        data: { title, content, metaDescription: metaDesc },
      })
      setIsDirty(false)
    }, 60000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [content, title, metaDesc, isDirty])

  // Track dirty
  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    setIsDirty(true)
  }, [])
  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    setIsDirty(true)
  }, [])
  const handleMetaDescChange = useCallback((val: string) => {
    setMetaDesc(val)
    setIsDirty(true)
  }, [])

  // Save
  const handleSave = () => {
    updateContent.mutate(
      { id, data: { title, content, metaDescription: metaDesc } },
      { onSuccess: () => setIsDirty(false) }
    )
  }

  // Insert from dialogs
  const handleInsertMarkdown = useCallback(
    (markdown: string) => {
      if (editorRef.current) {
        editorRef.current.insertAtCursorPosition("\n" + markdown + "\n")
      } else {
        setContent((prev) => prev + "\n" + markdown + "\n")
      }
      setIsDirty(true)
    },
    []
  )

  // Image search callback (layer: Page -> Dialog)
  const handleImageSearch = useCallback(
    async (keyword: string) => {
      return articleService.searchImages(keyword, 12)
    },
    []
  )

  // Image upload callback (layer: Page -> Dialog)
  const handleImageUpload = useCallback(
    async (file: File, altText: string) => {
      return articleService.uploadFile(file, altText)
    },
    []
  )

  // Scrape page images callback (for image insert dialog)
  const handleScrapePageImages = useCallback(async () => {
    return articleService.getPageImages(id)
  }, [id])

  // --- Featured image handlers ---
  const handleOpenImageSheet = async () => {
    setImageSheetOpen(true)
    if (pageImages.length > 0) return // ถ้ามีแล้วไม่ต้อง load ใหม่
    setLoadingPageImages(true)
    try {
      const imgs = await articleService.getPageImages(id)
      setPageImages(imgs || [])
    } catch {
      setPageImages([])
    } finally {
      setLoadingPageImages(false)
    }
  }

  const handleRefreshPageImages = async () => {
    setLoadingPageImages(true)
    try {
      const imgs = await articleService.getPageImages(id)
      setPageImages(imgs || [])
    } catch {
      setPageImages([])
    } finally {
      setLoadingPageImages(false)
    }
  }

  const handleSetFeatured = async (imageUrl: string) => {
    setSettingFeatured(true)
    try {
      const updated = await articleService.setFeaturedImage(id, imageUrl)
      setFeaturedImage(updated.featuredImageUrl || "")
      setImageSheetOpen(false)
    } catch {
      // ignore
    } finally {
      setSettingFeatured(false)
    }
  }

  // --- Images tab handlers ---
  const handleSearchImages = async () => {
    if (!article) return
    setSearchingImages(true)
    setSearchResults([])
    setSelectedImages(new Set())
    try {
      const result = await articleService.searchImages(article.title, 10)
      setSearchResults(result || [])
      setSelectedImages(new Set([0, 1, 2].filter((i) => i < (result?.length || 0))))
      setFeaturedIndex(0)
    } catch {
      // ignore
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
    if (selectedImages.size === 0) return
    setUploadingImages(true)
    try {
      const toUpload = Array.from(selectedImages).map((i) => ({
        url: searchResults[i].url,
        alt_text: article?.title || "",
        role: i === featuredIndex ? "featured" : "content",
      }))
      await articleService.uploadSelectedImages(id, toUpload)
      const saved = await articleService.getImages(id)
      setImages(saved)
      setSearchResults([])
      setSelectedImages(new Set())
    } catch {
      // ignore
    } finally {
      setUploadingImages(false)
    }
  }

  const handleGenerateImages = async () => {
    setGeneratingImages(true)
    try {
      const result = await articleService.generateImages(id, 2)
      setImages(result || [])
    } catch {
      // ignore
    } finally {
      setGeneratingImages(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("ลบรูปนี้? (จะลบจาก WordPress ด้วย)")) return
    try {
      await articleService.deleteImage(id, imageId)
      setImages((prev) => prev.filter((img) => img.ID !== imageId && img.id !== imageId))
    } catch {
      // ignore
    }
  }

  // --- Info tab handlers ---
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
    } catch {
      // ignore
    }
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      await articleService.optimize(id)
      handleLoadVersions()
    } catch {
      // ignore
    } finally {
      setOptimizing(false)
    }
  }

  const handleDeleteArticle = async () => {
    if (!confirm("ลบบทความนี้? (จะลบจาก WordPress + รูปทั้งหมดด้วย)")) return
    try {
      await articleService.deleteArticle(id)
      window.location.href = "/dashboard"
    } catch {
      // ignore
    }
  }

  const handlePublish = () => {
    if (confirm("เผยแพร่บทความนี้ไปยัง WordPress?")) {
      publishArticle.mutate(id)
    }
  }

  // --- Loading / Not found ---
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

  return (
    <>
      <PageHeader
        items={[
          { label: "Dashboard", href: NAV_ROUTES.DASHBOARD },
          { label: "รายละเอียดบทความ" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{title || article.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {article.wordCount} คำ &middot; v{article.contentVersion}
              {isDirty && <span className="ml-2 text-amber-500">(มีการแก้ไข)</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Save */}
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!isDirty || updateContent.isPending}
            >
              {updateContent.isPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 size-4" />
              )}
              บันทึก
            </Button>

            {/* Publish */}
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
              <Button onClick={handlePublish} disabled={publishArticle.isPending}>
                {publishArticle.isPending ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <SendIcon className="mr-2 size-4" />
                )}
                เผยแพร่ไปยัง WordPress
              </Button>
            ) : null}
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
          <p className="text-sm text-destructive">
            เผยแพร่ล้มเหลว: {publishArticle.error.message}
          </p>
        )}

        {/* Featured Image */}
        {featuredImage ? (
          <div className="flex items-start gap-3">
            <div className="relative rounded-lg overflow-hidden border shrink-0 max-w-[280px]">
              <img
                src={featuredImage}
                alt="Featured"
                className="w-full max-h-[160px] object-cover"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenImageSheet} className="shrink-0 mt-1">
              <RefreshCwIcon className="mr-1 size-3.5" />
              เปลี่ยนรูปหลัก
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
            <ImageIcon className="size-5 text-muted-foreground" />
            <p className="flex-1 text-sm text-muted-foreground">ยังไม่มีรูปหลัก</p>
            <Button size="sm" variant="outline" onClick={handleOpenImageSheet}>
              <ImageIcon className="mr-1 size-3.5" />
              เลือกรูปหลัก
            </Button>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="editor">
          <TabsList>
            <TabsTrigger value="editor">แก้ไข</TabsTrigger>
            <TabsTrigger value="images">รูปภาพ</TabsTrigger>
            <TabsTrigger value="info">ข้อมูล</TabsTrigger>
          </TabsList>

          {/* ===== Tab 1: Editor ===== */}
          <TabsContent value="editor">
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <Label className="mb-1">หัวข้อบทความ</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>

              {/* Meta Description */}
              <div>
                <Label className="mb-1">Meta Description</Label>
                <Textarea
                  value={metaDesc}
                  onChange={(e) => handleMetaDescChange(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {metaDesc.length} ตัวอักษร
                  {metaDesc.length > 160 && (
                    <span className="text-amber-500 ml-1">(แนะนำไม่เกิน 160)</span>
                  )}
                </p>
              </div>

              {/* View mode toggle */}
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "editor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("editor")}
                >
                  <PenLineIcon className="mr-1 size-3.5" />
                  เขียน
                </Button>
                <Button
                  variant={viewMode === "split" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("split")}
                >
                  <SplitIcon className="mr-1 size-3.5" />
                  แบ่งจอ
                </Button>
                <Button
                  variant={viewMode === "preview" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("preview")}
                >
                  <EyeIcon className="mr-1 size-3.5" />
                  ดูตัวอย่าง
                </Button>
              </div>

              {/* Editor + Preview */}
              <div
                className={`grid gap-4 ${
                  viewMode === "split"
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {viewMode !== "preview" && (
                  <MarkdownEditor
                    ref={editorRef}
                    value={content}
                    onChange={handleContentChange}
                    onImageClick={() => setImageDialogOpen(true)}
                    onVideoClick={() => setVideoDialogOpen(true)}
                  />
                )}
                {viewMode !== "editor" && (
                  <div className="rounded-md border min-h-[500px]">
                    <MarkdownPreview content={content} />
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          {/* ===== Tab 2: Images ===== */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="size-4" />
                    รูปภาพ
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSearchImages} disabled={searchingImages}>
                      {searchingImages ? (
                        <Loader2Icon className="mr-1 size-4 animate-spin" />
                      ) : (
                        <SearchIcon className="mr-1 size-4" />
                      )}
                      {searchingImages ? "กำลังค้นหา..." : "ค้นหารูปภาพ"}
                    </Button>
                    {selectedImages.size > 0 && (
                      <Button size="sm" onClick={handleUploadSelected} disabled={uploadingImages}>
                        {uploadingImages ? (
                          <Loader2Icon className="mr-1 size-4 animate-spin" />
                        ) : (
                          <UploadIcon className="mr-1 size-4" />
                        )}
                        {uploadingImages
                          ? "กำลังอัปโหลด..."
                          : `อัปโหลดที่เลือก (${selectedImages.size})`}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateImages}
                      disabled={generatingImages}
                    >
                      {generatingImages ? (
                        <Loader2Icon className="mr-1 size-4 animate-spin" />
                      ) : (
                        <ImageIcon className="mr-1 size-4" />
                      )}
                      {generatingImages ? "กำลังสร้าง..." : "สร้างด้วย AI"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      คลิกเพื่อเลือก กดดาวเป็นรูปหลัก แล้วกด &quot;อัปโหลดที่เลือก&quot;
                    </p>
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {searchResults.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => toggleImageSelect(i)}
                          className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                            selectedImages.has(i)
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent hover:border-muted-foreground/30"
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setFeaturedIndex(i)
                              }}
                              className={`absolute top-1 right-1 rounded-full p-0.5 ${
                                featuredIndex === i
                                  ? "bg-yellow-400 text-yellow-900"
                                  : "bg-black/50 text-white hover:bg-yellow-400 hover:text-yellow-900"
                              }`}
                              title={
                                featuredIndex === i ? "Featured image" : "Set as featured"
                              }
                            >
                              <StarIcon className="size-3" />
                            </button>
                          )}
                          <p className="text-xs text-muted-foreground p-1 truncate">
                            {img.source || ""}
                          </p>
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
                            <img
                              src={img.url}
                              alt={img.alt_text || img.AltText}
                              className="w-full aspect-video object-cover"
                            />
                            <div className="p-2 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground truncate">
                                  {img.alt_text || img.AltText}
                                </p>
                              </div>
                              <div className="flex gap-1 items-center shrink-0">
                                {(img.role === "featured" || img.Role === "featured") && (
                                  <Badge className="text-xs">รูปหลัก</Badge>
                                )}
                                <button
                                  onClick={() => handleDeleteImage(img.ID || img.id)}
                                  className="text-destructive hover:bg-destructive/10 rounded p-1"
                                  title="ลบรูป"
                                >
                                  <Trash2Icon className="size-3" />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 text-sm text-destructive">
                            ข้อผิดพลาด: {img.error || "ล้มเหลว"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && images.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    กด &quot;ค้นหารูปภาพ&quot; เลือกรูปที่ต้องการ แล้วอัปโหลด
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab 3: Info ===== */}
          <TabsContent value="info">
            <div className="flex flex-col gap-4">
              {/* EEAT Score */}
              {article.eeatScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">คะแนน EEAT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {(
                        [
                          ["ประสบการณ์", article.eeatScore.experience],
                          ["ความเชี่ยวชาญ", article.eeatScore.expertise],
                          ["ความน่าเชื่อถือ", article.eeatScore.authority],
                          ["ความไว้วางใจ", article.eeatScore.trust],
                        ] as const
                      ).map(([label, score]) => (
                        <div key={label} className="text-center">
                          <div className="text-2xl font-bold">{score}/10</div>
                          <div className="text-sm text-muted-foreground">{label}</div>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleFetchMetrics}
                          disabled={metricsLoading}
                        >
                          {metricsLoading ? (
                            <Loader2Icon className="mr-1 size-4 animate-spin" />
                          ) : (
                            <BarChart3Icon className="mr-1 size-4" />
                          )}
                          {metricsLoading ? "กำลังโหลด..." : "ดึงข้อมูล"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOptimize}
                          disabled={optimizing}
                        >
                          {optimizing ? (
                            <Loader2Icon className="mr-1 size-4 animate-spin" />
                          ) : (
                            <ZapIcon className="mr-1 size-4" />
                          )}
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
                          <div className="text-2xl font-bold">
                            {metrics.impressions || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">แสดงผล</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {((metrics.ctr || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">CTR</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {metrics.position || "-"}
                          </div>
                          <div className="text-sm text-muted-foreground">อันดับเฉลี่ย</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        กด &quot;ดึงข้อมูล&quot; เพื่อโหลดข้อมูลจาก GSC
                      </p>
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
                        <div
                          key={v.ID}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <span className="font-medium">v{v.Version}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {v.Action}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {v.WordCount} คำ &middot;{" "}
                            {new Date(v.CreatedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีประวัติเวอร์ชัน
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Delete */}
              <Card>
                <CardContent className="pt-6">
                  <Button variant="destructive" onClick={handleDeleteArticle}>
                    <Trash2Icon className="mr-2 size-4" />
                    ลบบทความ
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    จะลบจาก WordPress + รูปทั้งหมดด้วย
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={handleInsertMarkdown}
        onSearch={handleImageSearch}
        onUpload={handleImageUpload}
        onScrapePageImages={handleScrapePageImages}
      />
      <VideoInsertDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onInsert={handleInsertMarkdown}
      />

      {/* Featured Image Sheet */}
      <Sheet open={imageSheetOpen} onOpenChange={setImageSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>เลือกรูปหลัก</SheetTitle>
            <SheetDescription>
              คลิกรูปที่ต้องการใช้เป็นรูปหลักของบทความ
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4">
            <Button
              size="sm"
              variant="outline"
              className="mb-3 w-full"
              onClick={handleRefreshPageImages}
              disabled={loadingPageImages}
            >
              {loadingPageImages ? (
                <Loader2Icon className="mr-1 size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-1 size-4" />
              )}
              {loadingPageImages ? "กำลังโหลด..." : "โหลดรูปใหม่"}
            </Button>

            {loadingPageImages && pageImages.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingPageImages && pageImages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                ไม่พบรูปในหน้าเว็บ
              </p>
            )}

            <div className="columns-2 gap-2 space-y-2">
              {pageImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => !settingFeatured && handleSetFeatured(img.url)}
                  className={`break-inside-avoid rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                    featuredImage === img.url
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {settingFeatured && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" />
                กำลังบันทึก...
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
