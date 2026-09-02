from pydantic import BaseModel
from typing import Optional


class GenerateArticleRequest(BaseModel):
    keyword: str
    site_url: str = ""
    site_name: str = ""
    brand_voice: str = ""
    industry: str = ""
    secondary_keywords: list[str] = []
    pillar_url: str = ""
    custom_prompt: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class GenerateArticleResponse(BaseModel):
    title: str
    slug: str
    content: str
    metaDescription: str = ""
    wordCount: int = 0
    eeatScore: Optional[dict] = None
    schemaMarkup: Optional[dict] = None


class PublishArticleRequest(BaseModel):
    title: str
    content: str
    slug: str
    metaDescription: str = ""
    wpUrl: str
    wpUsername: str
    wpAppPassword: str


class PublishArticleResponse(BaseModel):
    publishedUrl: str
    cmsPostId: str


class RewriteTitleRequest(BaseModel):
    title: str
    keyword: str
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class ExpandArticleRequest(BaseModel):
    content: str
    keyword: str
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class FetchMetricsRequest(BaseModel):
    page_url: str
    gsc_refresh_token: str  # OAuth refresh token (per site)
    gsc_site_url: str       # GSC property URL
    days: int = 28


class OptimizeArticleRequest(BaseModel):
    title: str = ""
    content: str = ""
    keyword: str = ""
    action: str  # rewrite_title | expand_content | add_internal_links | fix_index
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class AnalyzeSiteRequest(BaseModel):
    url: str
    site_name: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class DiscoverKeywordsRequest(BaseModel):
    seed_keywords: list[str] = []
    site_url: str = ""
    gsc_refresh_token: str = ""
    gsc_site_url: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class AnalyzeCompetitorRequest(BaseModel):
    competitor_url: str
    site_url: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class CreateClusterRequest(BaseModel):
    keywords: list[str]
    site_url: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class GenerateImagesRequest(BaseModel):
    title: str
    keyword: str
    content: str = ""
    count: int = 2
    llm_provider: str = "gemini"
    llm_api_key: str = ""
    image_provider: str = "gemini"  # gemini | dalle
    wp_url: str = ""
    wp_username: str = ""
    wp_app_password: str = ""


class SearchImagesRequest(BaseModel):
    """ค้นหารูป — return preview URLs ไม่ upload"""
    keyword: str
    count: int = 10


class UploadImagesRequest(BaseModel):
    """Upload รูปที่เลือกแล้ว"""
    images: list[dict]  # [{url, alt_text, role: featured|content}]
    wp_url: str
    wp_username: str
    wp_app_password: str
    wp_post_id: str = ""


class DeleteMediaRequest(BaseModel):
    image_url: str
    wp_url: str
    wp_username: str
    wp_app_password: str


class DeleteWPPostRequest(BaseModel):
    wp_post_id: str
    wp_url: str
    wp_username: str
    wp_app_password: str


class AnalyzePageRequest(BaseModel):
    page_url: str
    keywords: list[str] = []
    site_url: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class CrawlPagesRequest(BaseModel):
    url: str
    site_name: str = ""
    max_pages: int = 50
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class AutoPipelineRequest(BaseModel):
    site_url: str
    site_name: str = ""
    brand_voice: str = ""
    industry: str = ""
    existing_keywords: list[str] = []
    existing_titles: list[str] = []
    gsc_refresh_token: str = ""
    gsc_site_url: str = ""
    max_articles: int = 3
    min_score: int = 5
    auto_publish: bool = False
    wp_url: str = ""
    wp_username: str = ""
    wp_app_password: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""


class HealthResponse(BaseModel):
    status: str
    service: str
