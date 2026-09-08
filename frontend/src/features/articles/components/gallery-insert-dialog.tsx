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
  ImagePlusIcon,
  XIcon,
  GlobeIcon,
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
  const [images, setImages] = useState<[GalleryImage | null, GalleryImage | null]>([null, null])
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0)

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

  const setSlotImage = (img: GalleryImage) => {
    setImages((prev) => {
      const next = [...prev] as [GalleryImage | null, GalleryImage | null]
      next[activeSlot] = img
      // เลื่อนไป slot ถัดไปอัตโนมัติ
      if (activeSlot === 0 && !next[1]) setActiveSlot(1)
      return next
    })
  }

  const handleSelectPageImage = (img: { url: string; alt: string }) => {
    setSlotImage({ url: img.url, alt: img.alt || "image" })
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
      setSlotImage({ url: result.url, alt: uploadAlt || "image" })
      // Reset upload state
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
    setSlotImage({ url: urlInput, alt: urlAlt || "image" })
    setUrlInput("")
    setUrlAlt("")
  }

  const handleInsertGallery = () => {
    const [img1, img2] = images
    if (!img1 || !img2) return
    const md = `{{gallery}}\n![${img1.alt}](${img1.url})\n![${img2.alt}](${img2.url})\n{{/gallery}}`
    onInsert(md)
    handleClose()
  }

  const removeSlot = (slot: 0 | 1) => {
    setImages((prev) => {
      const next = [...prev] as [GalleryImage | null, GalleryImage | null]
      next[slot] = null
      return next
    })
    setActiveSlot(slot)
  }

  const handleClose = () => {
    setImages([null, null])
    setActiveSlot(0)
    setPageImages([])
    setPageLoaded(false)
    setUploadAlt("")
    setPreviewUrl(null)
    selectedFile.current = null
    setUrlInput("")
    setUrlAlt("")
    onOpenChange(false)
  }

  const canInsert = images[0] !== null && images[1] !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แทรก Gallery (2 รูปคู่กัน)</DialogTitle>
        </DialogHeader>

        {/* Preview slots */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {([0, 1] as const).map((slot) => (
            <div
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className={`relative rounded-lg border-2 overflow-hidden cursor-pointer min-h-[100px] flex items-center justify-center bg-muted/30 transition-all ${
                activeSlot === slot
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-dashed border-muted-foreground/30"
              }`}
            >
              {images[slot] ? (
                <>
                  <img
                    src={images[slot]!.url}
                    alt={images[slot]!.alt}
                    className="w-full h-auto max-h-[140px] object-cover"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlot(slot) }}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <XIcon className="size-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 rounded">
                    รูป {slot + 1}
                  </span>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm p-4">
                  <ImagePlusIcon className="size-6 mx-auto mb-1 opacity-50" />
                  เลือกรูป {slot + 1}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          กำลังเลือกให้ <strong>รูป {activeSlot + 1}</strong> — คลิกช่องด้านบนเพื่อสลับ
        </p>

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
                  {pageImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectPageImage(img)}
                      className="break-inside-avoid rounded-lg border-2 border-transparent overflow-hidden cursor-pointer transition-all hover:border-primary hover:ring-2 hover:ring-primary/30"
                    >
                      <img src={img.url} alt={img.alt} className="w-full h-auto" loading="lazy" />
                    </div>
                  ))}
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
                {uploading ? "กำลังอัปโหลด..." : `อัปโหลดเป็นรูป ${activeSlot + 1}`}
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
                ใช้เป็นรูป {activeSlot + 1}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button onClick={handleInsertGallery} disabled={!canInsert}>
            แทรก Gallery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
