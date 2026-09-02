"use client"

import { useState } from "react"
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
import { Loader2Icon, SearchIcon, CheckIcon } from "lucide-react"

interface ImageInsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (markdown: string) => void
  onSearch: (keyword: string) => Promise<any[]>
}

export function ImageInsertDialog({
  open,
  onOpenChange,
  onInsert,
  onSearch,
}: ImageInsertDialogProps) {
  // Search tab
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // URL tab
  const [imageUrl, setImageUrl] = useState("")
  const [altText, setAltText] = useState("")

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

  const handleClose = () => {
    setSearchKeyword("")
    setSearchResults([])
    setSelectedIndex(null)
    setImageUrl("")
    setAltText("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แทรกรูปภาพ</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">ค้นหารูปฟรี</TabsTrigger>
            <TabsTrigger value="url">ใส่ URL</TabsTrigger>
          </TabsList>

          {/* Tab 1: Search */}
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

          {/* Tab 2: URL */}
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
