"use client"

import { useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  BoldIcon,
  ItalicIcon,
  Heading2Icon,
  Heading3Icon,
  LinkIcon,
  ImageIcon,
  VideoIcon,
  MinusIcon,
  QuoteIcon,
  ListIcon,
  ListOrderedIcon,
} from "lucide-react"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onImageClick?: () => void
  onVideoClick?: () => void
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (value: string) => void
) {
  const { selectionStart, selectionEnd, value } = textarea
  const selected = value.substring(selectionStart, selectionEnd)
  const replacement = selected || "text"
  const newText =
    value.substring(0, selectionStart) +
    before +
    replacement +
    after +
    value.substring(selectionEnd)
  onChange(newText)

  requestAnimationFrame(() => {
    textarea.selectionStart = selectionStart + before.length
    textarea.selectionEnd = selectionStart + before.length + replacement.length
    textarea.focus()
  })
}

function insertLineStart(
  textarea: HTMLTextAreaElement,
  prefix: string,
  onChange: (value: string) => void
) {
  const { selectionStart, value } = textarea
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1
  const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart)
  onChange(newText)

  requestAnimationFrame(() => {
    textarea.selectionStart = selectionStart + prefix.length
    textarea.selectionEnd = selectionStart + prefix.length
    textarea.focus()
  })
}

const TOOLBAR_ITEMS = [
  { icon: BoldIcon, label: "Bold", action: "wrap", before: "**", after: "**" },
  { icon: ItalicIcon, label: "Italic", action: "wrap", before: "*", after: "*" },
  { type: "separator" as const },
  { icon: Heading2Icon, label: "H2", action: "line", prefix: "## " },
  { icon: Heading3Icon, label: "H3", action: "line", prefix: "### " },
  { type: "separator" as const },
  { icon: LinkIcon, label: "Link", action: "wrap", before: "[", after: "](url)" },
  { icon: ImageIcon, label: "Image", action: "image" },
  { icon: VideoIcon, label: "Video", action: "video" },
  { type: "separator" as const },
  { icon: MinusIcon, label: "HR", action: "line", prefix: "\n---\n" },
  { icon: QuoteIcon, label: "Quote", action: "line", prefix: "> " },
  { icon: ListIcon, label: "Bullet", action: "line", prefix: "- " },
  { icon: ListOrderedIcon, label: "Number", action: "line", prefix: "1. " },
] as const

export function MarkdownEditor({
  value,
  onChange,
  onImageClick,
  onVideoClick,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleToolbar = useCallback(
    (item: (typeof TOOLBAR_ITEMS)[number]) => {
      const ta = textareaRef.current
      if (!ta) return

      if ("action" in item) {
        switch (item.action) {
          case "wrap":
            insertAtCursor(ta, item.before!, item.after!, onChange)
            break
          case "line":
            insertLineStart(ta, item.prefix!, onChange)
            break
          case "image":
            onImageClick?.()
            break
          case "video":
            onVideoClick?.()
            break
        }
      }
    },
    [onChange, onImageClick, onVideoClick]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5 bg-muted/30 rounded-t-md sticky top-0 z-10">
        {TOOLBAR_ITEMS.map((item, i) =>
          "type" in item && item.type === "separator" ? (
            <div key={i} className="mx-1 h-5 w-px bg-border" />
          ) : (
            <Button
              key={i}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title={"label" in item ? item.label : ""}
              onClick={() => handleToolbar(item)}
            >
              {"icon" in item && <item.icon className="size-4" />}
            </Button>
          )
        )}
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-[500px] resize-none rounded-t-none border-t-0 font-mono text-sm"
        placeholder="เขียนเนื้อหา Markdown ที่นี่..."
      />
    </div>
  )
}
