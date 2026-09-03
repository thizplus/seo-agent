"use client"

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react"
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

export interface MarkdownEditorRef {
  insertAtCursorPosition: (text: string) => void
  scrollToText: (text: string) => void
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

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, onImageClick, onVideoClick }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const cursorPosRef = useRef<number>(value.length)

    // เก็บ cursor position ทุกครั้งที่ user คลิก/พิมพ์
    const trackCursor = useCallback(() => {
      if (textareaRef.current) {
        cursorPosRef.current = textareaRef.current.selectionStart
      }
    }, [])

    useImperativeHandle(ref, () => ({
      insertAtCursorPosition(text: string) {
        const pos = cursorPosRef.current
        const newValue =
          value.substring(0, pos) + text + value.substring(pos)
        onChange(newValue)
        cursorPosRef.current = pos + text.length
      },
      scrollToText(searchText: string) {
        const ta = textareaRef.current
        if (!ta) return

        // Search หลายวิธี — text อาจถูก strip markdown
        const cleanSearch = searchText.replace(/[*#>`_\[\]()]/g, "").trim()
        let idx = value.indexOf(searchText)
        if (idx === -1) idx = value.indexOf(cleanSearch)
        if (idx === -1 && cleanSearch.length > 15) {
          idx = value.indexOf(cleanSearch.substring(0, 15))
        }
        if (idx === -1) return

        // 1. Set selection ก่อน
        ta.setSelectionRange(idx, idx + Math.min(searchText.length, 30))

        // 2. ใช้ scrollIntoView trick — สร้าง span ใน hidden textarea clone วัดตำแหน่ง
        const textBefore = value.substring(0, idx)
        const linesBefore = textBefore.split("\n").length - 1
        const computedStyle = window.getComputedStyle(ta)
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0
        const toolbarHeight = 40 // ความสูง toolbar ที่ sticky อยู่ด้านบน

        // คำนวณ scroll position จาก line count
        const targetScroll = paddingTop + (linesBefore * lineHeight) - toolbarHeight - (ta.clientHeight / 3)
        ta.scrollTop = Math.max(0, targetScroll)

        // 3. Focus หลัง scroll
        ta.focus()
      },
    }), [value, onChange])

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
              trackCursor()
              onImageClick?.()
              break
            case "video":
              trackCursor()
              onVideoClick?.()
              break
          }
        }
      },
      [onChange, onImageClick, onVideoClick, trackCursor]
    )

    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5 bg-background rounded-t-md sticky top-0 z-10">
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
          onSelect={trackCursor}
          onClick={trackCursor}
          onKeyUp={trackCursor}
          className="flex-1 min-h-[500px] resize-none rounded-t-none border-t-0 font-mono text-sm"
          placeholder="เขียนเนื้อหา Markdown ที่นี่..."
        />
      </div>
    )
  }
)
