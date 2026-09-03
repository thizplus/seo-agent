"""DI Container — สร้าง adapters + wire dependencies"""

from domain.ports.llm_port import LLMPort
from domain.ports.scraper_port import ScraperPort
from domain.ports.serp_port import SERPPort
from domain.ports.cms_port import CMSPort
from domain.ports.search_console_port import SearchConsolePort
from domain.ports.image_gen_port import ImageGenerationPort
from domain.ports.image_storage_port import ImageStoragePort

from infrastructure.adapters.gemini_adapter import GeminiAdapter
from infrastructure.adapters.bs4_crawler_adapter import BS4CrawlerAdapter
from infrastructure.adapters.serper_adapter import SerperAdapter
from infrastructure.adapters.wordpress_adapter import WordPressAdapter
from infrastructure.adapters.gsc_adapter import GSCOAuthAdapter

from services.skill_loader import SkillLoader
from services.article_writer import ArticleWriter
from services.site_analyzer import SiteAnalyzer
from services.competitor_profiler import CompetitorProfiler
from services.topic_cluster import TopicClusterService
from services.ranking_optimizer import RankingOptimizer
from services.keyword_discovery import KeywordDiscovery
from services.keyword_scorer import KeywordScorer
from services.image_generator import ImageGenerator
from services.image_finder import ImageFinder
from domain.ports.image_search_port import ImageSearchPort


class Container:
    """Shared services ที่ไม่ต้องการ API key"""

    def __init__(self):
        import os
        self.skill_loader = SkillLoader(skills_dir="skills/")
        self.scraper: ScraperPort = BS4CrawlerAdapter()
        serper_key = os.getenv("SERPER_API_KEY", "")
        self.serp: SERPPort = SerperAdapter(api_key=serper_key) if serper_key else BS4CrawlerAdapter()
        self.keyword_discovery = KeywordDiscovery()
        self.keyword_scorer = KeywordScorer()
        self.ranking_optimizer = RankingOptimizer(self.skill_loader, self.serp)

    def create_llm(self, provider: str, api_key: str) -> LLMPort:
        """สร้าง LLM adapter ตาม provider ของ site

        Supported: gemini, openai, claude, deepseek, groq, mistral
        """
        provider = (provider or "gemini").lower()

        if provider == "openai":
            from infrastructure.adapters.openai_adapter import OpenAIAdapter
            return OpenAIAdapter(api_key=api_key)
        elif provider == "claude":
            from infrastructure.adapters.claude_adapter import ClaudeAdapter
            return ClaudeAdapter(api_key=api_key)
        elif provider == "deepseek":
            from infrastructure.adapters.deepseek_adapter import DeepSeekAdapter
            return DeepSeekAdapter(api_key=api_key)
        elif provider == "groq":
            from infrastructure.adapters.groq_adapter import GroqAdapter
            return GroqAdapter(api_key=api_key)
        elif provider == "mistral":
            from infrastructure.adapters.mistral_adapter import MistralAdapter
            return MistralAdapter(api_key=api_key)
        else:
            return GeminiAdapter(api_key=api_key)

    def create_cms(self, wp_url: str, wp_username: str, wp_app_password: str) -> CMSPort:
        """สร้าง CMS adapter ด้วย credentials ของ site"""
        return WordPressAdapter(wp_url, wp_username, wp_app_password)

    def create_search_console(
        self, refresh_token: str, site_url: str, client_id: str, client_secret: str
    ) -> SearchConsolePort:
        """สร้าง Search Console adapter ด้วย credentials ของ site"""
        return GSCOAuthAdapter(refresh_token, site_url, client_id, client_secret)

    def create_article_writer(self, llm: LLMPort) -> ArticleWriter:
        return ArticleWriter(llm, self.skill_loader, self.serp)

    def create_site_analyzer(self, llm: LLMPort) -> SiteAnalyzer:
        return SiteAnalyzer(llm, self.skill_loader, self.scraper, self.serp)

    def create_competitor_profiler(self, llm: LLMPort) -> CompetitorProfiler:
        return CompetitorProfiler(llm, self.skill_loader, self.scraper)

    def create_topic_cluster_service(self, llm: LLMPort) -> TopicClusterService:
        return TopicClusterService(llm, self.skill_loader)

    def create_image_gen(self, provider: str, api_key: str) -> ImageGenerationPort:
        """สร้าง Image Generation adapter ตาม provider"""
        provider = (provider or "gemini").lower()
        if provider == "dalle":
            from infrastructure.adapters.dalle_adapter import DALLEAdapter
            return DALLEAdapter(api_key=api_key)
        else:
            from infrastructure.adapters.gemini_image_adapter import GeminiImageAdapter
            return GeminiImageAdapter(api_key=api_key)

    def create_image_storage(self, wp_url: str, wp_username: str, wp_app_password: str) -> ImageStoragePort:
        """สร้าง Image Storage adapter (WordPress Media)"""
        from infrastructure.adapters.wp_media_adapter import WordPressMediaAdapter
        return WordPressMediaAdapter(wp_url, wp_username, wp_app_password)

    def create_r2_storage(self) -> ImageStoragePort:
        """สร้าง R2 Storage adapter จาก env vars"""
        import os
        from infrastructure.adapters.r2_storage_adapter import R2StorageAdapter
        return R2StorageAdapter(
            bucket=os.getenv("S3_BUCKET", ""),
            access_key=os.getenv("S3_ACCESS_KEY_ID", ""),
            secret_key=os.getenv("S3_SECRET_ACCESS_KEY", ""),
            endpoint=os.getenv("S3_ENDPOINT", ""),
            base_url=os.getenv("S3_BASE_URL", ""),
        )

    def create_image_generator(
        self, llm: LLMPort, image_gen: ImageGenerationPort, image_storage: ImageStoragePort
    ) -> ImageGenerator:
        return ImageGenerator(llm, image_gen, image_storage)

    def create_image_search(
        self, pexels_key: str = "", unsplash_key: str = "", pixabay_key: str = "",
    ) -> ImageSearchPort:
        """สร้าง Multi-source image search"""
        from infrastructure.adapters.multi_image_search_adapter import MultiImageSearchAdapter
        from infrastructure.adapters.google_image_search_adapter import GoogleImageSearchAdapter

        adapters: list[ImageSearchPort] = [GoogleImageSearchAdapter()]  # DuckDuckGo ไม่ต้อง key

        if pexels_key:
            from infrastructure.adapters.pexels_adapter import PexelsAdapter
            adapters.append(PexelsAdapter(pexels_key))
        if unsplash_key:
            from infrastructure.adapters.unsplash_adapter import UnsplashAdapter
            adapters.append(UnsplashAdapter(unsplash_key))
        if pixabay_key:
            from infrastructure.adapters.pixabay_adapter import PixabayAdapter
            adapters.append(PixabayAdapter(pixabay_key))

        return MultiImageSearchAdapter(adapters)

    def create_image_finder(
        self, llm: LLMPort, image_search: ImageSearchPort, image_storage: ImageStoragePort
    ) -> ImageFinder:
        return ImageFinder(llm, image_search, image_storage)
