"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import type { ComponentPropsWithoutRef } from "react"

interface MarkdownPreviewProps {
  content: string
  onHeadingClick?: (text: string) => void
}

function preprocessContent(content: string): string {
  // H2: / H3: text -> proper markdown headings
  content = content.replace(/^H1:\s*/gm, "# ")
  content = content.replace(/^H2:\s*/gm, "## ")
  content = content.replace(/^H3:\s*/gm, "### ")
  content = content.replace(/^H4:\s*/gm, "#### ")

  // {{youtube:VIDEO_ID}} -> iframe embed
  return content.replace(
    /\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g,
    '<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/$1" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>'
  )
}

function createHeadingComponent(
  tag: "h1" | "h2" | "h3" | "h4",
  onHeadingClick?: (text: string) => void
) {
  return function HeadingComponent(props: ComponentPropsWithoutRef<typeof tag>) {
    const text = String(props.children || "")
    const Tag = tag
    return (
      <Tag
        {...props}
        className={onHeadingClick ? "cursor-pointer hover:text-primary transition-colors" : ""}
        onClick={() => onHeadingClick?.(text)}
      />
    )
  }
}

export function MarkdownPreview({ content, onHeadingClick }: MarkdownPreviewProps) {
  const processed = preprocessContent(content)

  const components = onHeadingClick
    ? {
        h1: createHeadingComponent("h1", onHeadingClick),
        h2: createHeadingComponent("h2", onHeadingClick),
        h3: createHeadingComponent("h3", onHeadingClick),
        h4: createHeadingComponent("h4", onHeadingClick),
      }
    : undefined

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert overflow-auto p-4 h-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
