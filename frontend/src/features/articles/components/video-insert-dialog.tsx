"use client"

import { useState, useMemo } from "react"
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

interface VideoInsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (markdown: string) => void
}

function parseYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function VideoInsertDialog({
  open,
  onOpenChange,
  onInsert,
}: VideoInsertDialogProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("")

  const videoId = useMemo(() => parseYouTubeId(youtubeUrl), [youtubeUrl])

  const handleInsert = () => {
    if (!videoId) return
    onInsert(`{{youtube:${videoId}}}`)
    setYoutubeUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>แทรกวิดีโอ YouTube</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <Label>YouTube URL</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>

          {videoId && (
            <div className="aspect-video rounded-lg overflow-hidden border">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          )}

          {youtubeUrl && !videoId && (
            <p className="text-sm text-destructive">
              URL ไม่ถูกต้อง กรุณาใส่ลิงก์ YouTube
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleInsert} disabled={!videoId}>
            แทรกวิดีโอ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
