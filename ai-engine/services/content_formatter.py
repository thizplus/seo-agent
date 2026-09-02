"""แปลง Markdown → Gutenberg blocks สำหรับ WordPress"""

import re


class GutenbergFormatter:
    """แปลง Markdown content เป็น WordPress Gutenberg blocks"""

    def format(self, markdown: str) -> str:
        """แปลง Markdown → Gutenberg block HTML"""
        # แปลง {{youtube:VIDEO_ID}} → Gutenberg embed block ก่อน split lines
        markdown = re.sub(
            r'\{\{youtube:([a-zA-Z0-9_-]+)\}\}',
            r'{{__YT_EMBED__:\1}}',
            markdown
        )
        lines = markdown.strip().split("\n")
        blocks = []
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines
            if not line:
                i += 1
                continue

            # Heading
            if line.startswith("#"):
                block = self._parse_heading(line)
                if block:
                    blocks.append(block)
                    i += 1
                    continue

            # Unordered list
            if line.startswith("- ") or line.startswith("* "):
                list_lines = []
                while i < len(lines) and (lines[i].strip().startswith("- ") or lines[i].strip().startswith("* ")):
                    list_lines.append(lines[i].strip()[2:])
                    i += 1
                blocks.append(self._make_list(list_lines, ordered=False))
                continue

            # Ordered list
            if re.match(r"^\d+\.\s", line):
                list_lines = []
                while i < len(lines) and re.match(r"^\d+\.\s", lines[i].strip()):
                    list_lines.append(re.sub(r"^\d+\.\s", "", lines[i].strip()))
                    i += 1
                blocks.append(self._make_list(list_lines, ordered=True))
                continue

            # Blockquote
            if line.startswith(">"):
                quote_lines = []
                while i < len(lines) and lines[i].strip().startswith(">"):
                    quote_lines.append(lines[i].strip().lstrip("> "))
                    i += 1
                blocks.append(self._make_quote("\n".join(quote_lines)))
                continue

            # Code block
            if line.startswith("```"):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                i += 1  # skip closing ```
                blocks.append(self._make_code("\n".join(code_lines)))
                continue

            # Table
            if "|" in line and i + 1 < len(lines) and "---" in lines[i + 1]:
                table_lines = []
                while i < len(lines) and "|" in lines[i].strip():
                    table_lines.append(lines[i].strip())
                    i += 1
                blocks.append(self._make_table(table_lines))
                continue

            # YouTube embed
            yt_match = re.match(r"\{\{__YT_EMBED__:([a-zA-Z0-9_-]+)\}\}", line)
            if yt_match:
                blocks.append(self._make_youtube(yt_match.group(1)))
                i += 1
                continue

            # Image (already in markdown)
            img_match = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", line)
            if img_match:
                blocks.append(self._make_image(img_match.group(2), img_match.group(1)))
                i += 1
                continue

            # Paragraph (default) — รวม lines ต่อเนื่องที่ไม่ใช่ special
            para_lines = []
            while i < len(lines) and lines[i].strip() and not self._is_special(lines[i].strip()):
                para_lines.append(lines[i].strip())
                i += 1
            if para_lines:
                blocks.append(self._make_paragraph(" ".join(para_lines)))
                continue

            i += 1

        return "\n\n".join(blocks)

    def _is_special(self, line: str) -> bool:
        if line.startswith("#"):
            return True
        if line.startswith("- ") or line.startswith("* "):
            return True
        if re.match(r"^\d+\.\s", line):
            return True
        if line.startswith(">"):
            return True
        if line.startswith("```"):
            return True
        if line.startswith("!["):
            return True
        if line.startswith("{{__YT_EMBED__:"):
            return True
        return False

    def _parse_heading(self, line: str) -> str:
        match = re.match(r"^(#{1,6})\s+(.+)", line)
        if not match:
            return ""
        level = len(match.group(1))
        text = self._inline_format(match.group(2).strip())
        if level == 1:
            # ข้าม H1 — WP theme แสดง title เป็น H1 อยู่แล้ว (ป้องกัน H1 ซ้ำ)
            return ""
        elif level == 2:
            return f'<!-- wp:heading -->\n<h2>{text}</h2>\n<!-- /wp:heading -->'
        else:
            return f'<!-- wp:heading {{"level":{level}}} -->\n<h{level}>{text}</h{level}>\n<!-- /wp:heading -->'

    def _make_paragraph(self, text: str) -> str:
        text = self._inline_format(text)
        return f'<!-- wp:paragraph -->\n<p>{text}</p>\n<!-- /wp:paragraph -->'

    def _make_list(self, items: list[str], ordered: bool = False) -> str:
        tag = "ol" if ordered else "ul"
        block_type = "list" if not ordered else 'list {"ordered":true}'
        li = "\n".join(f"<li>{self._inline_format(item)}</li>" for item in items)
        return f'<!-- wp:{block_type} -->\n<{tag}>\n{li}\n</{tag}>\n<!-- /wp:list -->'

    def _make_quote(self, text: str) -> str:
        text = self._inline_format(text)
        return f'<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>{text}</p></blockquote>\n<!-- /wp:quote -->'

    def _make_code(self, code: str) -> str:
        return f'<!-- wp:code -->\n<pre class="wp-block-code"><code>{code}</code></pre>\n<!-- /wp:code -->'

    def _make_image(self, url: str, alt: str) -> str:
        return f'<!-- wp:image -->\n<figure class="wp-block-image size-large"><img src="{url}" alt="{alt}" /></figure>\n<!-- /wp:image -->'

    def _make_youtube(self, video_id: str) -> str:
        url = f"https://www.youtube.com/watch?v={video_id}"
        return (
            f'<!-- wp:embed {{"url":"{url}","type":"video","providerNameSlug":"youtube"}} -->\n'
            f'<figure class="wp-block-embed is-type-video is-provider-youtube">'
            f'<div class="wp-block-embed__wrapper">{url}</div>'
            f'</figure>\n'
            f'<!-- /wp:embed -->'
        )

    def _make_table(self, lines: list[str]) -> str:
        if len(lines) < 2:
            return ""
        # Parse header
        headers = [c.strip() for c in lines[0].strip("|").split("|")]
        # Skip separator line (---)
        rows = []
        for line in lines[2:]:
            cells = [c.strip() for c in line.strip("|").split("|")]
            rows.append(cells)

        thead = "<thead><tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr></thead>"
        tbody_rows = "".join(
            "<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>"
            for row in rows
        )
        tbody = f"<tbody>{tbody_rows}</tbody>"

        return f'<!-- wp:table -->\n<figure class="wp-block-table"><table>{thead}{tbody}</table></figure>\n<!-- /wp:table -->'

    def _inline_format(self, text: str) -> str:
        """แปลง inline markdown: **bold**, *italic*, [link](url), `code`"""
        # Bold
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        # Italic
        text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
        # Inline code
        text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
        # Links
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
        return text
