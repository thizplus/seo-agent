import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional


class Crawler:
    """Crawl เว็บไซต์ + ดึง URLs และข้อมูล SEO"""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async def crawl(self, url: str, max_pages: int = 50) -> dict:
        """Crawl เว็บแล้ว return ข้อมูลทั้งหมด

        Returns:
            {
                "pages": [{url, title, meta_description, h1, h2s, word_count, page_type}],
                "sitemap_urls": [...],
                "total_pages": int
            }
        """
        base_domain = urlparse(url).netloc
        visited = set()
        pages = []
        to_visit = [url.rstrip("/")]

        # ลอง sitemap ก่อน
        sitemap_urls = await self._fetch_sitemap(url)

        async with httpx.AsyncClient(timeout=15, headers=self.HEADERS, follow_redirects=True) as client:
            while to_visit and len(visited) < max_pages:
                current_url = to_visit.pop(0)
                if current_url in visited:
                    continue
                visited.add(current_url)

                page_data = await self._crawl_page(client, current_url)
                if not page_data:
                    continue

                pages.append(page_data)

                # หา links ไปหน้าอื่นใน domain เดียวกัน
                for link in page_data.get("_links", []):
                    parsed = urlparse(link)
                    if parsed.netloc == base_domain and link not in visited:
                        to_visit.append(link)

                # ลบ internal field
                page_data.pop("_links", None)

        return {
            "pages": pages,
            "sitemap_urls": sitemap_urls[:50],
            "total_pages": len(pages),
        }

    async def _crawl_page(self, client: httpx.AsyncClient, url: str) -> Optional[dict]:
        """Crawl หน้าเดียว"""
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            if "text/html" not in resp.headers.get("content-type", ""):
                return None
        except Exception:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"})
        if meta_tag:
            meta_desc = meta_tag.get("content", "")

        h1 = ""
        h1_tag = soup.find("h1")
        if h1_tag:
            h1 = h1_tag.get_text(strip=True)

        h2s = [h2.get_text(strip=True) for h2 in soup.find_all("h2")][:10]

        # นับคำ
        body = soup.find("body")
        text = body.get_text(separator=" ", strip=True) if body else ""
        word_count = len(text.split())

        # detect page type
        page_type = self._detect_page_type(url, title, h1)

        # ดึง links
        links = []
        for a in soup.find_all("a", href=True):
            href = urljoin(url, a["href"])
            parsed = urlparse(href)
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
            if parsed.scheme in ("http", "https"):
                links.append(clean)

        return {
            "url": url,
            "title": title,
            "meta_description": meta_desc,
            "h1": h1,
            "h2s": h2s,
            "word_count": word_count,
            "page_type": page_type,
            "status_code": resp.status_code,
            "_links": links,
        }

    async def _fetch_sitemap(self, base_url: str) -> list[str]:
        """ดึง URLs จาก sitemap.xml"""
        sitemap_url = f"{base_url.rstrip('/')}/sitemap.xml"
        try:
            async with httpx.AsyncClient(timeout=10, headers=self.HEADERS) as client:
                resp = await client.get(sitemap_url)
                if resp.status_code != 200:
                    return []

            soup = BeautifulSoup(resp.text, "xml")
            urls = [loc.text for loc in soup.find_all("loc")]
            return urls
        except Exception:
            return []

    def _detect_page_type(self, url: str, title: str, h1: str) -> str:
        """ตรวจจับประเภทหน้า"""
        path = urlparse(url).path.lower()
        combined = f"{path} {title} {h1}".lower()

        if path == "/" or path == "":
            return "home"
        if any(w in combined for w in ["contact", "ติดต่อ"]):
            return "contact"
        if any(w in combined for w in ["about", "เกี่ยวกับ"]):
            return "about"
        if any(w in combined for w in ["blog", "บทความ", "article"]):
            return "blog"
        if any(w in combined for w in ["product", "สินค้า", "shop"]):
            return "product"
        if any(w in combined for w in ["service", "บริการ"]):
            return "service"
        return "other"
