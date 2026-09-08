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

  content = content.replace(
    /\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g,
    '<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/$1" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>'
  )

  // Image alignment: ![alt](url){center|left|right}
  content = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{(center|left|right)\}/g,
    (_, alt, url, align) => {
      const style = align === "center"
        ? "text-align:center"
        : `float:${align};margin:0 ${align === "left" ? "1em 1em 0" : "0 0 1em 1em"}`
      return `<figure style="${style};margin-top:0.5em;margin-bottom:0.5em"><img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px" /></figure>`
    }
  )

  // Gallery: {{gallery}} ... {{/gallery}}
  content = content.replace(
    /\{\{gallery\}\}\n([\s\S]*?)\n\{\{\/gallery\}\}/g,
    (_, inner) => {
      const images = [...inner.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]
      if (images.length === 0) return ""
      const imgTags = images
        .map(
          (m: RegExpMatchArray) =>
            `<div style="flex:1;min-width:0"><img src="${m[2]}" alt="${m[1]}" style="width:100%;border-radius:8px;object-fit:cover" /></div>`
        )
        .join("")
      return `<div style="display:flex;gap:8px;margin:1em 0">${imgTags}</div>`
    }
  )

  // Text alignment: {center}text{/center} or {right}text{/right}
  content = content.replace(
    /\{(center|right)\}(.+?)\{\/\1\}/g,
    '<p style="text-align:$1">$2</p>'
  )

  return content
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
