"use client"

import { useState, useRef } from "react"
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
import { Loader2Icon, SearchIcon, CheckIcon, UploadIcon, GlobeIcon } from "lucide-react"

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
    onInsert(`![${alt}](${img.url})`)
    handleClose()
  }

  const handleInsertFromUrl = () => {
    if (!imageUrl.trim()) return
    onInsert(`![${altText || "image"}](${imageUrl})`)
    handleClose()
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
      onInsert(`![${uploadAlt || "image"}](${result.url})`)
      handleClose()
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  const handleLoadPageImages = async () => {
    if (!onScrapePageImages) return
    setLoadingPage(true)
    try {
      const imgs = await onScrapePageImages()
      setPageImages(imgs || [])
      setPageLoaded(true)
    } catch {
      setPageImages([])
    } finally {
      setLoadingPage(false)
    }
  }

  const handlePageTabClick = () => {
    if (!pageLoaded) handleLoadPageImages()
  }

  const handleClose = () => {
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

        <Tabs defaultValue="page">
          <TabsList>
            <TabsTrigger value="page" onClick={handlePageTabClick}>รูปจากเว็บ</TabsTrigger>
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
              <p className="text-sm text-muted-foreground text-center py-8">
                ไม่พบรูปในหน้าเว็บ
              </p>
            )}

            {pageImages.length > 0 && (
              <div className="columns-2 gap-2 space-y-2 max-h-[350px] overflow-auto">
                {pageImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onInsert(`![${img.alt || "image"}](${img.url})`)
                      handleClose()
                    }}
                    className="break-inside-avoid rounded-lg border-2 border-transparent overflow-hidden cursor-pointer transition-all hover:border-primary hover:ring-2 hover:ring-primary/30"
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
            )}
          </TabsContent>

          {/* Tab 2: Upload */}
          <TabsContent value="upload">
            <div className="flex flex-col gap-3">
              <div>
                <Label>เลือกไฟล์รูปภาพ</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input
                  placeholder="คำอธิบายรูปภาพ"
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                />
              </div>
              {previewUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <img
                    src={previewUrl}
                    alt={uploadAlt}
                    className="w-full max-h-[200px] object-contain"
                  />
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleUpload} disabled={!selectedFile.current || uploading}>
                  {uploading ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <UploadIcon className="mr-2 size-4" />
                  )}
                  {uploading ? "กำลังอัปโหลด..." : "อัปโหลดและแทรก"}
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
                {searching ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SearchIcon className="size-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-auto">
                {searchResults.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      selectedIndex === i
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
                    {selectedIndex === i && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <CheckIcon className="size-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchResults.length > 0 && (
              <DialogFooter className="mt-3">
                <Button
                  onClick={handleInsertFromSearch}
                  disabled={selectedIndex === null}
                >
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
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input
                  placeholder="คำอธิบายรูปภาพ"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                />
              </div>
              {imageUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={altText}
                    className="w-full max-h-[200px] object-contain"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleInsertFromUrl} disabled={!imageUrl.trim()}>
                  แทรกรูป
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
