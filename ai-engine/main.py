import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form

from models.schemas import (
    AnalyzePageRequest,
    CrawlPagesRequest,
    GenerateArticleRequest,
    GenerateArticleResponse,
    PublishArticleRequest,
    PublishArticleResponse,
    RewriteTitleRequest,
    ExpandArticleRequest,
    FetchMetricsRequest,
    OptimizeArticleRequest,
    AnalyzeSiteRequest,
    DiscoverKeywordsRequest,
    AnalyzeCompetitorRequest,
    CreateClusterRequest,
    GenerateImagesRequest,
    SearchImagesRequest,
    UploadImagesRequest,
    DeleteMediaRequest,
    DeleteWPPostRequest,
    AutoPipelineRequest,
    ScrapePageImagesRequest,
    HealthResponse,
)
from pkg.di.container import Container

# Load .env
load_dotenv(dotenv_path="../.env")

# --- DI Container ---
container = Container()

# Google OAuth config (สำหรับ GSC adapter)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# --- FastAPI app ---
app = FastAPI(title="SEO Agents AI Engine", version="0.2.0")


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="ai-engine")


@app.get("/skills")
async def list_skills():
    return {"skills": container.skill_loader.list_skills()}


@app.post("/generate-article", response_model=GenerateArticleResponse)
async def generate_article(req: GenerateArticleRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")

    llm = container.create_llm(req.llm_provider, req.llm_api_key)
    writer = container.create_article_writer(llm)
    result = await writer.generate(
        keyword=req.keyword, site_url=req.site_url, site_name=req.site_name,
        brand_voice=req.brand_voice, industry=req.industry,
        secondary_keywords=req.secondary_keywords or None,
        pillar_url=req.pillar_url,
        custom_title=req.custom_title,
        content_guide=req.content_guide,
        writing_tone=req.writing_tone,
    )
    return GenerateArticleResponse(**result)


@app.post("/rewrite-title")
async def rewrite_title(req: RewriteTitleRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    llm = container.create_llm(req.llm_provider, req.llm_api_key)
    writer = container.create_article_writer(llm)
    return {"title": await writer.rewrite_title(req.title, req.keyword)}


@app.post("/expand-article")
async def expand_article(req: ExpandArticleRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    llm = container.create_llm(req.llm_provider, req.llm_api_key)
    writer = container.create_article_writer(llm)
    return {"content": await writer.expand_article(req.content, req.keyword)}


@app.post("/publish-article", response_model=PublishArticleResponse)
async def publish_article(req: PublishArticleRequest):
    try:
        cms = container.create_cms(req.wpUrl, req.wpUsername, req.wpAppPassword)
        result = await cms.publish(req.title, req.content, req.slug, req.metaDescription)
        return PublishArticleResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/fetch-metrics")
async def fetch_metrics(req: FetchMetricsRequest):
    try:
        gsc = container.create_search_console(
            req.gsc_refresh_token, req.gsc_site_url, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
        )
        return {"success": True, "data": gsc.get_page_metrics(req.page_url, days=req.days)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/optimize-article")
async def optimize_article(req: OptimizeArticleRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        result = await container.ranking_optimizer.execute(
            action=req.action,
            article={"title": req.title, "content": req.content, "keyword": req.keyword},
            llm=llm,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/decide-optimization")
async def decide_optimization(metrics: dict):
    return {"action": container.ranking_optimizer.decide(metrics)}


@app.post("/create-cluster")
async def create_cluster(req: CreateClusterRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        service = container.create_topic_cluster_service(llm)
        return {"success": True, "data": await service.create_cluster(req.keywords, req.site_url)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/analyze-competitor")
async def analyze_competitor(req: AnalyzeCompetitorRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        profiler = container.create_competitor_profiler(llm)
        return {"success": True, "data": await profiler.analyze(req.competitor_url, req.site_url)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/discover-keywords")
async def discover_keywords(req: DiscoverKeywordsRequest):
    try:
        raw = await container.keyword_discovery.discover(
            seed_keywords=req.seed_keywords, site_url=req.site_url,
            gsc_refresh_token=req.gsc_refresh_token, gsc_site_url=req.gsc_site_url,
        )
        return {"success": True, "data": container.keyword_scorer.score_all(raw)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/search-images")
async def search_images(req: SearchImagesRequest):
    """ค้นหารูป — return preview URLs ไม่ upload (ให้ user เลือกก่อน)"""
    try:
        image_search = container.create_image_search()
        queries = [req.keyword, f"{req.keyword} wallpaper", f"{req.keyword} photo"]
        all_images = []
        for q in queries:
            results = await image_search.search(q, count=req.count, orientation="landscape")
            all_images.extend(results)
            if len(all_images) >= req.count:
                break

        # Deduplicate by URL
        seen = set()
        unique = []
        for img in all_images:
            url = img.get("url", "")
            if url and url not in seen:
                seen.add(url)
                unique.append(img)

        return {"success": True, "data": unique[:req.count]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/upload-selected-images")
async def upload_selected_images(req: UploadImagesRequest):
    """Upload รูปที่ user เลือกแล้ว → WebP → WP Media → set featured"""
    try:
        from services.image_finder import ImageFinder
        storage = container.create_image_storage(req.wp_url, req.wp_username, req.wp_app_password)
        finder = ImageFinder(None, None, storage)

        results = []
        for i, img in enumerate(req.images):
            try:
                image_bytes = await finder._download(img["url"])
                webp_bytes = finder._to_webp(image_bytes)
                alt = img.get("alt_text", "")
                role = img.get("role", "content")

                # Filename จาก alt text
                fn = finder._make_filename(alt, i + 1)
                uploaded_url = await storage.upload(webp_bytes, fn, alt_text=alt)

                # Set featured image
                if role == "featured" and req.wp_post_id:
                    await finder._set_featured(uploaded_url, req.wp_post_id, req.wp_url, req.wp_username, req.wp_app_password)

                results.append({"url": uploaded_url, "alt_text": alt, "role": role, "format": "webp", "file_size_kb": len(webp_bytes) // 1024})
            except Exception as e:
                results.append({"url": "", "error": str(e)[:200], "role": "failed"})

        # Inject content images to post
        if req.wp_post_id:
            await finder._inject_to_post(results, req.wp_post_id, req.wp_url, req.wp_username, req.wp_app_password)

        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/delete-media")
async def delete_media(req: DeleteMediaRequest):
    """ลบรูปจาก WordPress Media Library"""
    try:
        storage = container.create_image_storage(req.wp_url, req.wp_username, req.wp_app_password)
        result = await storage.delete(req.image_url)
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/delete-wp-post")
async def delete_wp_post(req: DeleteWPPostRequest):
    """ลบ post จาก WordPress"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{req.wp_url.rstrip('/')}/wp-json/wp/v2/posts/{req.wp_post_id}",
                params={"force": "true"},
                auth=(req.wp_username, req.wp_app_password),
            )
            return {"success": resp.status_code == 200}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/analyze-site")
async def analyze_site(req: AnalyzeSiteRequest):
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        analyzer = container.create_site_analyzer(llm)
        return {"success": True, "data": await analyzer.analyze(req.url, req.site_name)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/generate-images")
async def generate_images(req: GenerateImagesRequest):
    """Generate + upload images สำหรับบทความ"""
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        image_gen = container.create_image_gen(req.image_provider, req.llm_api_key)
        image_storage = container.create_image_storage(req.wp_url, req.wp_username, req.wp_app_password)
        generator = container.create_image_generator(llm, image_gen, image_storage)

        results = await generator.generate_for_article(
            title=req.title, keyword=req.keyword, content=req.content, count=req.count,
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/analyze-page")
async def analyze_page(req: AnalyzePageRequest):
    """วิเคราะห์ 1 page: SERP top 10 + on-page audit + recommendations"""
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        from services.page_analyzer import PageAnalyzer
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        analyzer = PageAnalyzer(llm, container.scraper, container.serp)
        result = await analyzer.analyze(req.page_url, req.keywords, req.site_url)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/crawl-pages")
async def crawl_pages(req: CrawlPagesRequest):
    """Crawl เว็บ → return pages + keywords ต่อ page (ผูก URL)"""
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        analyzer = container.create_site_analyzer(llm)

        crawl_data = await container.scraper.crawl(req.url, max_pages=req.max_pages)
        page_keywords = await analyzer.extract_page_keywords(crawl_data)

        return {
            "success": True,
            "data": {
                "pages": crawl_data["pages"],
                "pageKeywords": page_keywords,
                "totalPages": crawl_data["total_pages"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auto-pipeline")
async def auto_pipeline(req: AutoPipelineRequest):
    """Full automation: analyze → discover → score → generate → publish"""
    if not req.llm_api_key:
        raise HTTPException(status_code=400, detail="LLM API key is required")
    try:
        from services.auto_pipeline import AutoPipeline
        llm = container.create_llm(req.llm_provider, req.llm_api_key)
        pipeline = AutoPipeline(
            llm=llm,
            skill_loader=container.skill_loader,
            scraper=container.scraper,
            serp=container.serp,
            keyword_discovery=container.keyword_discovery,
            keyword_scorer=container.keyword_scorer,
        )
        result = await pipeline.run(
            site_url=req.site_url,
            site_name=req.site_name,
            brand_voice=req.brand_voice,
            industry=req.industry,
            existing_keywords=req.existing_keywords,
            existing_titles=req.existing_titles,
            gsc_refresh_token=req.gsc_refresh_token,
            gsc_site_url=req.gsc_site_url,
            max_articles=req.max_articles,
            min_score=req.min_score,
            auto_publish=req.auto_publish,
            wp_url=req.wp_url,
            wp_username=req.wp_username,
            wp_app_password=req.wp_app_password,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scrape-page-images")
async def scrape_page_images(req: ScrapePageImagesRequest):
    """ดึง URL รูปทั้งหมดจากหน้าเว็บ"""
    import re
    from urllib.parse import urljoin
    try:
        import httpx
        from bs4 import BeautifulSoup

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(req.page_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })

        soup = BeautifulSoup(resp.text, "html.parser")
        images = []
        seen_urls = set()

        # Filter patterns
        skip_patterns = re.compile(r"(logo|icon|favicon|sprite|placeholder|pixel|tracking|gravatar|avatar|badge|button)", re.I)
        valid_ext = re.compile(r"\.(jpg|jpeg|png|webp|gif)(\?.*)?$", re.I)

        for img in soup.find_all("img"):
            src = img.get("src", "")
            if not src or src.startswith("data:"):
                continue

            # Absolute URL
            url = urljoin(req.page_url, src)
            if not url.startswith("http"):
                continue

            # Skip duplicates
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Skip icons/logos
            if skip_patterns.search(url):
                continue

            # Valid image extension (or no extension = could be dynamic)
            has_ext = "." in url.split("/")[-1].split("?")[0]
            if has_ext and not valid_ext.search(url):
                continue

            # Width filter
            width = img.get("width", "")
            if width and str(width).isdigit() and int(width) < 200:
                continue

            alt = img.get("alt", "")
            images.append({"url": url, "alt": alt})

        return {"success": True, "data": images}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...), alt_text: str = Form("")):
    """Upload รูปจากเครื่อง → แปลง WebP → เก็บใน R2 → return URL"""
    try:
        import io
        from PIL import Image

        image_bytes = await file.read()

        # แปลงเป็น WebP
        img = Image.open(io.BytesIO(image_bytes))
        if img.width > 1200:
            img = img.resize((1200, int(img.height * 1200 / img.width)), Image.LANCZOS)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80)
        webp_bytes = out.getvalue()

        # Upload ไป R2
        r2 = container.create_r2_storage()
        filename = file.filename or "upload.webp"
        if not filename.endswith(".webp"):
            filename = filename.rsplit(".", 1)[0] + ".webp"

        url = await r2.upload(webp_bytes, filename, alt_text=alt_text)

        return {
            "success": True,
            "data": {
                "url": url,
                "alt_text": alt_text,
                "format": "webp",
                "file_size_kb": len(webp_bytes) // 1024,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/analyze-serp")
async def analyze_serp(keyword: str):
    return await container.serp.analyze(keyword)
