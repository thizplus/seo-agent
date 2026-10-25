"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2Icon, SearchIcon, CheckIcon, UploadIcon, GlobeIcon, XIcon } from "lucide-react"

interface GalleryImage {
  url: string
  alt: string
}

interface ImageInsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (markdown: string) => void
  onSearch: (keyword: string) => Promise<any[]>
  onUpload: (file: File, altText: string) => Promise<{ url: string; alt_text: string }>
  onScrapePageImages?: () => Promise<{ url: string; alt: string }[]>
}

export function ImageInsertDialog({
  open,
  onOpenChange,
  onInsert,
  onSearch,
  onUpload,
  onScrapePageImages,
}: ImageInsertDialogProps) {
  // Layout mode: 1 = single image, 2-4 = gallery
  const [cols, setCols] = useState(1)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // Search tab
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // URL tab
  const [imageUrl, setImageUrl] = useState("")
  const [altText, setAltText] = useState("")

  // Upload tab
  const [uploading, setUploading] = useState(false)
  const [uploadAlt, setUploadAlt] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFile = useRef<File | null>(null)

  // Page images tab
  const [pageImages, setPageImages] = useState<{ url: string; alt: string }[]>([])
  const [loadingPage, setLoadingPage] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)

  const isGalleryMode = cols >= 2

  // --- Single image handlers ---
  const insertSingle = (md: string) => {
    onInsert(md)
    handleClose()
  }

  // --- Gallery mode handlers ---
  const addToGallery = (img: GalleryImage) => {
    setGalleryImages((prev) => [...prev, img])
  }

  const toggleGalleryImage = (img: GalleryImage) => {
    setGalleryImages((prev) => {
      const exists = prev.findIndex((s) => s.url === img.url)
      if (exists >= 0) return prev.filter((_, i) => i !== exists)
      return [...prev, img]
    })
  }

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index))
  }

  const isGallerySelected = (url: string) => galleryImages.some((s) => s.url === url)
  const gallerySelectedIndex = (url: string) => galleryImages.findIndex((s) => s.url === url)

  const handleInsertGallery = () => {
    if (galleryImages.length < 2) return
    const imgLines = galleryImages.map((img) => `![${img.alt}](${img.url})`).join("\n")
    onInsert(`{{gallery cols=${cols}}}\n${imgLines}\n{{/gallery}}`)
    handleClose()
  }

  // --- Search ---
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return
    setSearching(true)
    setSelectedIndex(null)
    try {
      const results = await onSearch(searchKeyword)
      setSearchResults(results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleInsertFromSearch = () => {
    if (selectedIndex === null || !searchResults[selectedIndex]) return
    const img = searchResults[selectedIndex]
    const alt = img.alt || searchKeyword
    if (isGalleryMode) {
      addToGallery({ url: img.url, alt })
      setSelectedIndex(null)
    } else {
      insertSingle(`![${alt}](${img.url})`)
    }
  }

  // --- URL ---
  const handleInsertFromUrl = () => {
    if (!imageUrl.trim()) return
    if (isGalleryMode) {
      addToGallery({ url: imageUrl, alt: altText || "image" })
      setImageUrl("")
      setAltText("")
    } else {
      insertSingle(`![${altText || "image"}](${imageUrl})`)
    }
  }

  // --- Upload ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    selectedFile.current = file
    setPreviewUrl(URL.createObjectURL(file))
    if (!uploadAlt) setUploadAlt(file.name.replace(/\.[^.]+$/, ""))
  }

  const handleUpload = async () => {
    if (!selectedFile.current) return
    setUploading(true)
    try {
      const result = await onUpload(selectedFile.current, uploadAlt)
      if (isGalleryMode) {
        addToGallery({ url: result.url, alt: uploadAlt || "image" })
        setUploadAlt("")
        setPreviewUrl(null)
        selectedFile.current = null
        if (fileRef.current) fileRef.current.value = ""
      } else {
        insertSingle(`![${uploadAlt || "image"}](${result.url})`)
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  // --- Page images ---
  useEffect(() => {
    if (open && !pageLoaded && onScrapePageImages) {
      setLoadingPage(true)
      onScrapePageImages()
        .then((imgs) => { setPageImages(imgs || []); setPageLoaded(true) })
        .catch(() => setPageImages([]))
        .finally(() => setLoadingPage(false))
    }
  }, [open])

  const handlePageImageClick = (img: { url: string; alt: string }) => {
    if (isGalleryMode) {
      toggleGalleryImage({ url: img.url, alt: img.alt || "image" })
    } else {
      insertSingle(`![${img.alt || "image"}](${img.url})`)
    }
  }

  const handleClose = () => {
    setCols(1)
    setGalleryImages([])
    setSearchKeyword("")
    setSearchResults([])
    setSelectedIndex(null)
    setImageUrl("")
    setAltText("")
    setUploadAlt("")
    setPreviewUrl(null)
    selectedFile.current = null
    setPageImages([])
    setPageLoaded(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แทรกรูปภาพ</DialogTitle>
        </DialogHeader>

        {/* Layout selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">จำนวนคอลัมน์</Label>
          <div className="flex gap-1.5">
            {[
              { value: 1, label: "1 รูป" },
              { value: 2, label: "2 คอลัมน์" },
              { value: 3, label: "3 คอลัมน์" },
              { value: 4, label: "4 คอลัมน์" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setCols(opt.value); if (opt.value === 1) setGalleryImages([]) }}
                className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
                  cols === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery selected images preview */}
        {isGalleryMode && galleryImages.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">รูปที่เลือก ({galleryImages.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {galleryImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.url} alt={img.alt} className="h-14 w-14 rounded border object-cover" />
                  <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] font-bold px-1 rounded-br">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => removeGalleryImage(i)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="page">
          <TabsList>
            <TabsTrigger value="page">รูปจากเว็บ</TabsTrigger>
            <TabsTrigger value="upload">อัปโหลด</TabsTrigger>
            <TabsTrigger value="search">ค้นหารูปฟรี</TabsTrigger>
            <TabsTrigger value="url">ใส่ URL</TabsTrigger>
          </TabsList>

          {/* Tab 1: Page Images */}
          <TabsContent value="page">
            {loadingPage && (
              <div className="flex justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingPage && pageImages.length === 0 && pageLoaded && (
              <p className="text-sm text-muted-foreground text-center py-8">ไม่พบรูปในหน้าเว็บ</p>
            )}
            {pageImages.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto">
                <div className="columns-2 gap-2 [&>*]:mb-2">
                  {pageImages.map((img, i) => {
                    const selected = isGalleryMode && isGallerySelected(img.url)
                    const idx = gallerySelectedIndex(img.url)
                    return (
                      <div
                        key={i}
                        onClick={() => handlePageImageClick(img)}
                        className={`break-inside-avoid rounded-lg border-2 overflow-hidden cursor-pointer transition-all relative ${
                          selected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-primary hover:ring-2 hover:ring-primary/30"
                        }`}
                      >
                        <img src={img.url} alt={img.alt} className="w-full h-auto" loading="lazy" />
                        {selected && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Upload */}
          <TabsContent value="upload">
            <div className="flex flex-col gap-3">
              <div>
                <Label>เลือกไฟล์รูปภาพ</Label>
                <Input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="cursor-pointer" />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input placeholder="คำอธิบายรูปภาพ" value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} />
              </div>
              {previewUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={previewUrl} alt={uploadAlt} className="w-full max-h-[200px] object-contain" />
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleUpload} disabled={!selectedFile.current || uploading}>
                  {uploading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <UploadIcon className="mr-2 size-4" />}
                  {uploading ? "กำลังอัปโหลด..." : isGalleryMode ? "อัปโหลดเพิ่ม" : "อัปโหลดและแทรก"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>

          {/* Tab 3: Search */}
          <TabsContent value="search">
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="ค้นหารูปภาพ..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching} size="sm">
                {searching ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-auto">
                {searchResults.map((img, i) => {
                  const selected = isGalleryMode
                    ? isGallerySelected(img.url)
                    : selectedIndex === i
                  const idx = isGalleryMode ? gallerySelectedIndex(img.url) : -1
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isGalleryMode) {
                          toggleGalleryImage({ url: img.url, alt: img.alt || searchKeyword })
                        } else {
                          setSelectedIndex(i)
                        }
                      }}
                      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        selected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img src={img.thumb_url || img.url} alt="" className="w-full aspect-video object-cover" loading="lazy" />
                      {selected && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center text-xs font-bold">
                          {isGalleryMode ? idx + 1 : <CheckIcon className="size-3" />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {searchResults.length > 0 && !isGalleryMode && (
              <DialogFooter className="mt-3">
                <Button onClick={handleInsertFromSearch} disabled={selectedIndex === null}>
                  แทรกรูปที่เลือก
                </Button>
              </DialogFooter>
            )}
          </TabsContent>

          {/* Tab 4: URL */}
          <TabsContent value="url">
            <div className="flex flex-col gap-3">
              <div>
                <Label>URL รูปภาพ</Label>
                <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input placeholder="คำอธิบายรูปภาพ" value={altText} onChange={(e) => setAltText(e.target.value)} />
              </div>
              {imageUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={imageUrl} alt={altText} className="w-full max-h-[200px] object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleInsertFromUrl} disabled={!imageUrl.trim()}>
                  {isGalleryMode ? "เพิ่มรูป" : "แทรกรูป"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>

        {/* Gallery insert button */}
        {isGalleryMode && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
            <Button onClick={handleInsertGallery} disabled={galleryImages.length < 2}>
              <CheckIcon className="mr-1 size-4" />
              แทรก Gallery ({galleryImages.length} รูป, {cols} คอลัมน์)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
