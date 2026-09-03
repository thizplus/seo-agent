"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

interface MarkdownPreviewProps {
  content: string
  onTextClick?: (text: string) => void
}

function preprocessContent(content: string): string {
  content = content.replace(/^H1:\s*/gm, "# ")
  content = content.replace(/^H2:\s*/gm, "## ")
  content = content.replace(/^H3:\s*/gm, "### ")
  content = content.replace(/^H4:\s*/gm, "#### ")

  // YouTube URL (plain text) → embed
  content = content.replace(
    /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+).*$/gm,
    "{{youtube:$1}}"
  )
  content = content.replace(
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+).*$/gm,
    "{{youtube:$1}}"
  )

  return content.replace(
    /\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g,
    '<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/$1" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>'
  )
}

export function MarkdownPreview({ content, onTextClick }: MarkdownPreviewProps) {
  const processed = preprocessContent(content)

  const handleClick = (e: React.MouseEvent) => {
    if (!onTextClick) return
    const target = e.target as HTMLElement
    // ดึง text จาก element ที่คลิก (ไม่เอา child elements)
    const text = target.textContent?.trim()
    if (text && text.length > 3) {
      // ตัดเอาแค่ 60 ตัวแรก เพื่อ search ใน markdown
      onTextClick(text.substring(0, 60))
    }
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert overflow-auto p-4 h-full cursor-pointer"
      onClick={handleClick}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {processed}
      </ReactMarkdown>
    </div>
  )
}
