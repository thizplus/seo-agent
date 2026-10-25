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
import {
  Loader2Icon,
  UploadIcon,
  GlobeIcon,
  XIcon,
  CheckIcon,
} from "lucide-react"

interface GalleryImage {
  url: string
  alt: string
}

interface GalleryInsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (markdown: string) => void
  onUpload: (file: File, altText: string) => Promise<{ url: string; alt_text: string }>
  onScrapePageImages?: () => Promise<{ url: string; alt: string }[]>
}

export function GalleryInsertDialog({
  open,
  onOpenChange,
  onInsert,
  onUpload,
  onScrapePageImages,
}: GalleryInsertDialogProps) {
  const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([])
  const [cols, setCols] = useState(2)

  // Page images
  const [pageImages, setPageImages] = useState<{ url: string; alt: string }[]>([])
  const [loadingPage, setLoadingPage] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadAlt, setUploadAlt] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFile = useRef<File | null>(null)

  // URL
  const [urlInput, setUrlInput] = useState("")
  const [urlAlt, setUrlAlt] = useState("")

  // Auto-load page images
  useEffect(() => {
    if (open && !pageLoaded && onScrapePageImages) {
      setLoadingPage(true)
      onScrapePageImages()
        .then((imgs) => { setPageImages(imgs || []); setPageLoaded(true) })
        .catch(() => setPageImages([]))
        .finally(() => setLoadingPage(false))
    }
  }, [open])

  const togglePageImage = (img: { url: string; alt: string }) => {
    setSelectedImages((prev) => {
      const exists = prev.findIndex((s) => s.url === img.url)
      if (exists >= 0) return prev.filter((_, i) => i !== exists)
      return [...prev, { url: img.url, alt: img.alt || "image" }]
    })
  }

  const addImage = (img: GalleryImage) => {
    setSelectedImages((prev) => [...prev, img])
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

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
      addImage({ url: result.url, alt: uploadAlt || "image" })
      setUploadAlt("")
      setPreviewUrl(null)
      selectedFile.current = null
      if (fileRef.current) fileRef.current.value = ""
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  const handleInsertUrl = () => {
    if (!urlInput.trim()) return
    addImage({ url: urlInput, alt: urlAlt || "image" })
    setUrlInput("")
    setUrlAlt("")
  }

  const handleInsertGallery = () => {
    if (selectedImages.length < 2) return
    const imgLines = selectedImages.map((img) => `![${img.alt}](${img.url})`).join("\n")
    const md = `{{gallery cols=${cols}}}\n${imgLines}\n{{/gallery}}`
    onInsert(md)
    handleClose()
  }

  const handleClose = () => {
    setSelectedImages([])
    setCols(2)
    setPageImages([])
    setPageLoaded(false)
    setUploadAlt("")
    setPreviewUrl(null)
    selectedFile.current = null
    setUrlInput("")
    setUrlAlt("")
    onOpenChange(false)
  }

  const isSelected = (url: string) => selectedImages.some((s) => s.url === url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แทรก Gallery</DialogTitle>
        </DialogHeader>

        {/* Selected images preview */}
        {selectedImages.length > 0 && (
          <div className="space-y-2">
            <Label>รูปที่เลือก ({selectedImages.length})</Label>
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] font-bold px-1 rounded-br">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column selector */}
        <div className="space-y-2">
          <Label>จำนวนคอลัมน์</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCols(n)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  cols === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {n} คอลัมน์
              </button>
            ))}
          </div>
        </div>

        {/* Tabs for selecting images */}
        <Tabs defaultValue="page">
          <TabsList>
            <TabsTrigger value="page">รูปจากเว็บ</TabsTrigger>
            <TabsTrigger value="upload">อัปโหลด</TabsTrigger>
            <TabsTrigger value="url">ใส่ URL</TabsTrigger>
          </TabsList>

          {/* Page images */}
          <TabsContent value="page">
            {loadingPage && (
              <div className="flex justify-center py-6">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingPage && pageImages.length === 0 && pageLoaded && (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่พบรูปในหน้าเว็บ</p>
            )}
            {pageImages.length > 0 && (
              <div className="max-h-[250px] overflow-y-auto">
                <div className="columns-3 gap-2 [&>*]:mb-2">
                  {pageImages.map((img, i) => {
                    const selected = isSelected(img.url)
                    const selectedIndex = selectedImages.findIndex((s) => s.url === img.url)
                    return (
                      <div
                        key={i}
                        onClick={() => togglePageImage(img)}
                        className={`break-inside-avoid rounded-lg border-2 overflow-hidden cursor-pointer transition-all relative ${
                          selected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-primary/50"
                        }`}
                      >
                        <img src={img.url} alt={img.alt} className="w-full h-auto" loading="lazy" />
                        {selected && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center text-xs font-bold">
                            {selectedIndex + 1}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Upload */}
          <TabsContent value="upload">
            <div className="flex flex-col gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <Input
                placeholder="Alt Text"
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
              />
              {previewUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={previewUrl} alt={uploadAlt} className="w-full max-h-[150px] object-contain" />
                </div>
              )}
              <Button onClick={handleUpload} disabled={!selectedFile.current || uploading} size="sm">
                {uploading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <UploadIcon className="mr-2 size-4" />}
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดเพิ่ม"}
              </Button>
            </div>
          </TabsContent>

          {/* URL */}
          <TabsContent value="url">
            <div className="flex flex-col gap-2">
              <Input placeholder="https://example.com/image.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
              <Input placeholder="Alt Text" value={urlAlt} onChange={(e) => setUrlAlt(e.target.value)} />
              {urlInput && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={urlInput} alt={urlAlt} className="w-full max-h-[150px] object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <Button onClick={handleInsertUrl} disabled={!urlInput.trim()} size="sm">
                <GlobeIcon className="mr-2 size-4" />
                เพิ่มรูป
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button onClick={handleInsertGallery} disabled={selectedImages.length < 2}>
            <CheckIcon className="mr-1 size-4" />
            แทรก Gallery ({selectedImages.length} รูป, {cols} คอลัมน์)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
