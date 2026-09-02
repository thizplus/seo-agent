"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

interface MarkdownPreviewProps {
  content: string
}

function preprocessContent(content: string): string {
  // {{youtube:VIDEO_ID}} -> iframe embed
  return content.replace(
    /\{\{youtube:([a-zA-Z0-9_-]+)\}\}/g,
    '<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/$1" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>'
  )
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const processed = preprocessContent(content)

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert overflow-auto p-4 h-full">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {processed}
      </ReactMarkdown>
    </div>
  )
}
