import io
import re

import httpx
from PIL import Image

from domain.ports.llm_port import LLMPort
from domain.ports.image_search_port import ImageSearchPort
from domain.ports.image_storage_port import ImageStoragePort


class ImageFinder:
    """ค้นหารูป → optimize → upload WP → set featured + inject ในเนื้อหา"""

    def __init__(self, llm: LLMPort, image_search: ImageSearchPort, image_storage: ImageStoragePort):
        self.llm = llm
        self.image_search = image_search
        self.image_storage = image_storage

    async def find_and_upload(
        self, title: str, keyword: str, count: int = 3,
        wp_post_id: str = "", wp_url: str = "", wp_username: str = "", wp_app_password: str = "",
    ) -> list[dict]:
        # 1. ค้นหาหลาย query เพื่อให้รูปหลากหลาย
        all_images = []
        queries = [keyword, f"{keyword} wallpaper", title]
        for q in queries:
            results = await self.image_search.search(q, count=count, orientation="landscape")
            all_images.extend(results)
            if len(all_images) >= count * 3:
                break

        if not all_images:
            return []

        # 2. เลือก landscape + ไม่ซ้ำ domain
        selected = self._pick_diverse(all_images, count)

        # 3. สร้าง alt text + filename
        img_meta = await self._make_alt_texts(keyword, title, len(selected))

        # 4. Download + WebP + upload
        results = []
        for i, img in enumerate(selected):
            try:
                image_bytes = await self._download(img["url"])
                webp_bytes = self._to_webp(image_bytes)
                meta = img_meta[i] if i < len(img_meta) else {"alt_text": keyword, "filename": ""}
                alt = meta.get("alt_text", keyword) if isinstance(meta, dict) else str(meta)
                fn = meta.get("filename", "") if isinstance(meta, dict) else ""
                filename = self._make_filename(fn or alt, i + 1)

                uploaded_url = await self.image_storage.upload(webp_bytes, filename, alt_text=alt)
                role = "featured" if i == 0 else "content"

                if i == 0 and wp_post_id and wp_url:
                    await self._set_featured(uploaded_url, wp_post_id, wp_url, wp_username, wp_app_password)

                results.append({"url": uploaded_url, "alt_text": alt, "role": role, "format": "webp", "file_size_kb": len(webp_bytes) // 1024})
            except Exception as e:
                results.append({"url": "", "error": str(e)[:200], "role": "failed"})

        # 5. Inject รูปเข้าเนื้อหา post
        if wp_post_id and wp_url and results:
            await self._inject_to_post(results, wp_post_id, wp_url, wp_username, wp_app_password)

        return results

    def _pick_diverse(self, images: list[dict], count: int) -> list[dict]:
        """เลือกรูปจากคนละ domain ไม่ให้ซ้ำ"""
        from urllib.parse import urlparse
        seen_domains = set()
        seen_urls = set()
        selected = []

        # เรียงตามขนาด landscape ก่อน
        sorted_imgs = sorted(images, key=lambda x: int(x.get("width", 0) or 0), reverse=True)

        for img in sorted_imgs:
            url = img.get("url", "")
            if not url or url in seen_urls:
                continue

            domain = urlparse(url).netloc
            if domain in seen_domains:
                continue

            # เลือก landscape (width >= height)
            w = int(img.get("width", 0) or 0)
            h = int(img.get("height", 0) or 0)
            if w > 0 and h > 0 and w < h:
                continue

            seen_domains.add(domain)
            seen_urls.add(url)
            selected.append(img)

            if len(selected) >= count:
                break

        # ถ้าได้ไม่ครบ เพิ่มจากที่เหลือ (ยอมซ้ำ domain)
        if len(selected) < count:
            for img in sorted_imgs:
                if img.get("url") not in seen_urls:
                    selected.append(img)
                    seen_urls.add(img["url"])
                    if len(selected) >= count:
                        break

        return selected

    def _make_filename(self, alt_text: str, index: int) -> str:
        """สร้างชื่อไฟล์จาก alt text — SEO friendly, ใช้ได้ทุก OS"""
        import hashlib
        # เก็บ EN + ตัวเลข + dash เท่านั้น (ปลอดภัยทุก OS/server)
        en_only = re.sub(r"[^a-zA-Z0-9\s-]", "", alt_text)
        en_only = re.sub(r"\s+", "-", en_only.strip().lower())
        if en_only and len(en_only) > 3:
            return f"{en_only[:40]}.webp"
        # Fallback: ใช้ hash ของ alt text
        h = hashlib.md5(alt_text.encode()).hexdigest()[:8]
        return f"img-{h}-{index}.webp"

    async def _make_alt_texts(self, keyword: str, title: str, count: int) -> list[str]:
        prompt = f"""สร้าง {count} รายการสำหรับรูปภาพบทความ "{title}":

กฎ:
- alt_text: ภาษาไทย สั้น 5-8 คำ มีคำว่า "{keyword}" เขียนเหมือนคนเขียน ห้ามอ้างอิงแหล่งที่มา
- filename: ภาษาอังกฤษ สั้น 3-5 คำ คั่นด้วย - อธิบายรูป ห้ามมีอักขระพิเศษ

ตอบเป็น JSON array:
[{{"alt_text": "alt ภาษาไทย", "filename": "english-filename"}}]"""

        try:
            resp = await self.llm.generate(prompt, temperature=0.5)
            cleaned = re.sub(r"```json\s*", "", resp)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            import json
            items = json.loads(cleaned.strip())
            if isinstance(items, list) and items and isinstance(items[0], dict):
                return items  # [{alt_text, filename}, ...]
            elif isinstance(items, list):
                return [{"alt_text": str(a), "filename": ""} for a in items]
        except Exception:
            pass
        return [{"alt_text": f"{keyword} ภาพที่ {i+1}", "filename": f"image-{i+1}"} for i in range(count)]

    async def _download(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise Exception(f"Download failed: {resp.status_code}")
            return resp.content

    def _to_webp(self, data: bytes, quality: int = 80, max_w: int = 1200) -> bytes:
        try:
            img = Image.open(io.BytesIO(data))
            if img.width > max_w:
                img = img.resize((max_w, int(img.height * max_w / img.width)), Image.LANCZOS)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            out = io.BytesIO()
            img.save(out, format="WEBP", quality=quality)
            return out.getvalue()
        except Exception:
            return data

    async def _set_featured(self, image_url: str, post_id: str, wp_url: str, user: str, pw: str):
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                fn = image_url.split("/")[-1].replace(".webp", "")
                resp = await c.get(f"{wp_url.rstrip('/')}/wp-json/wp/v2/media", params={"search": fn}, auth=(user, pw))
                if resp.status_code == 200 and resp.json():
                    mid = resp.json()[0]["id"]
                    await c.post(f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts/{post_id}", json={"featured_media": mid}, auth=(user, pw))
        except Exception:
            pass

    async def _inject_to_post(self, images: list[dict], post_id: str, wp_url: str, user: str, pw: str):
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                resp = await c.get(f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts/{post_id}", auth=(user, pw))
                if resp.status_code != 200:
                    return
                post = resp.json()
                content = post.get("content", {}).get("raw", "") or post.get("content", {}).get("rendered", "")

                tags = []
                for img in images:
                    if img.get("url") and img.get("role") == "content":
                        tags.append(f'<figure class="wp-block-image size-large"><img src="{img["url"]}" alt="{img.get("alt_text","")}" /></figure>')

                if not tags:
                    return

                parts = content.split("</p>", 1)
                if len(parts) > 1:
                    new_content = parts[0] + "</p>\n" + "\n".join(tags) + "\n" + parts[1]
                else:
                    new_content = content + "\n" + "\n".join(tags)

                await c.post(f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts/{post_id}", json={"content": new_content}, auth=(user, pw))
        except Exception:
            pass
