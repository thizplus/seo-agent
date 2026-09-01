"""Auto Pipeline — รัน full SEO automation ครบวงจร

Flow: analyze site → extract seeds → discover keywords → score → select top → generate articles
"""

import logging

from domain.ports.llm_port import LLMPort
from domain.ports.scraper_port import ScraperPort
from domain.ports.serp_port import SERPPort
from domain.ports.cms_port import CMSPort
from services.site_analyzer import SiteAnalyzer
from services.keyword_discovery import KeywordDiscovery
from services.keyword_scorer import KeywordScorer
from services.article_writer import ArticleWriter
from services.skill_loader import SkillLoader

logger = logging.getLogger(__name__)


class AutoPipeline:
    """รัน SEO automation ครบวงจรสำหรับ 1 site"""

    def __init__(
        self,
        llm: LLMPort,
        skill_loader: SkillLoader,
        scraper: ScraperPort,
        serp: SERPPort,
        keyword_discovery: KeywordDiscovery,
        keyword_scorer: KeywordScorer,
    ):
        self.llm = llm
        self.skill_loader = skill_loader
        self.scraper = scraper
        self.serp = serp
        self.kw_discovery = keyword_discovery
        self.kw_scorer = keyword_scorer
        self.analyzer = SiteAnalyzer(llm, skill_loader, scraper)
        self.writer = ArticleWriter(llm, skill_loader, serp)

    async def run(
        self,
        site_url: str,
        site_name: str = "",
        brand_voice: str = "",
        industry: str = "",
        existing_keywords: list[str] | None = None,
        existing_titles: list[str] | None = None,
        gsc_refresh_token: str = "",
        gsc_site_url: str = "",
        max_articles: int = 3,
        min_score: int = 5,
        wp_url: str = "",
        wp_username: str = "",
        wp_app_password: str = "",
        auto_publish: bool = False,
    ) -> dict:
        """รัน pipeline ครบวงจร

        Returns:
            {
                "analysis": {...},
                "seeds": [...],
                "keywords": [...],
                "articles": [...],
                "published": [...]
            }
        """
        result = {
            "analysis": None,
            "seeds": [],
            "keywords": [],
            "articles": [],
            "published": [],
            "errors": [],
        }

        # === Step 1: Analyze Site ===
        logger.info(f"Pipeline: Analyzing {site_url}")
        try:
            analysis = await self.analyzer.analyze(site_url, site_name)
            result["analysis"] = analysis
            seeds = analysis.get("suggestedSeeds", [])
            result["seeds"] = seeds

            # ใช้ข้อมูลจาก analysis
            if not brand_voice and analysis.get("brandVoice"):
                brand_voice = analysis["brandVoice"]
            if not industry and analysis.get("industry"):
                industry = analysis["industry"]

            logger.info(f"Pipeline: Got {len(seeds)} seeds from analysis")
        except Exception as e:
            result["errors"].append(f"Analysis failed: {str(e)}")
            logger.error(f"Pipeline: Analysis failed: {e}")
            return result

        # เก็บ competitors ที่พบจาก SERP
        result["competitors"] = analysis.get("competitors", [])

        if not seeds:
            result["errors"].append("No seeds extracted from site - site may not have product/service pages")
            return result

        # === Step 2: Discover Keywords ===
        logger.info(f"Pipeline: Discovering keywords from {len(seeds)} seeds")
        try:
            raw_keywords = await self.kw_discovery.discover(
                seed_keywords=seeds[:10],
                site_url=site_url,
                gsc_refresh_token=gsc_refresh_token,
                gsc_site_url=gsc_site_url,
            )
            scored = self.kw_scorer.score_all(raw_keywords)
            result["keywords"] = scored
            logger.info(f"Pipeline: Discovered {len(scored)} keywords")
        except Exception as e:
            result["errors"].append(f"Keyword discovery failed: {str(e)}")
            logger.error(f"Pipeline: Keyword discovery failed: {e}")
            return result

        # === Step 3: Select Top Keywords ===
        # กรอง keyword ที่ score >= min_score + ไม่ซ้ำกับที่มีอยู่แล้ว
        existing_kw_set = set((kw.lower() for kw in (existing_keywords or [])))
        existing_title_set = set((t.lower() for t in (existing_titles or [])))

        top_keywords = []
        for kw in scored:
            keyword_text = kw["keyword"].lower()
            if kw.get("score", 0) < min_score:
                continue
            if keyword_text in existing_kw_set:
                continue
            # ข้ามถ้า keyword ซ้ำกับ title ที่เขียนไปแล้ว
            if any(keyword_text in title for title in existing_title_set):
                continue
            top_keywords.append(kw)

        top_keywords = top_keywords[:max_articles]
        logger.info(f"Pipeline: Selected {len(top_keywords)} keywords for article generation")

        if not top_keywords:
            result["errors"].append(f"No keywords with score >= {min_score} found")
            return result

        # === Step 4: Generate Articles ===
        for kw_data in top_keywords:
            keyword = kw_data["keyword"]
            logger.info(f"Pipeline: Generating article for '{keyword}'")
            try:
                article = await self.writer.generate(
                    keyword=keyword,
                    site_url=site_url,
                    site_name=site_name,
                    brand_voice=brand_voice,
                    industry=industry,
                )
                article["keyword"] = keyword
                article["score"] = kw_data.get("score", 0)
                article["intent"] = kw_data.get("intent", "informational")
                result["articles"].append(article)
                logger.info(f"Pipeline: Generated '{article.get('title', '')}' ({article.get('wordCount', 0)} words)")
            except Exception as e:
                result["errors"].append(f"Article generation failed for '{keyword}': {str(e)}")
                logger.error(f"Pipeline: Article gen failed for '{keyword}': {e}")

        # === Step 5: Publish (ถ้ามี WP credentials) ===
        if wp_url and wp_username and wp_app_password:
            from infrastructure.adapters.wordpress_adapter import WordPressAdapter
            cms = WordPressAdapter(wp_url, wp_username, wp_app_password)
            wp_status = "publish" if auto_publish else "draft"

            for article in result["articles"]:
                try:
                    pub = await cms.publish(
                        title=article["title"],
                        content=article["content"],
                        slug=article.get("slug", ""),
                        meta_description=article.get("metaDescription", ""),
                        status=wp_status,
                    )
                    pub["keyword"] = article["keyword"]
                    result["published"].append(pub)
                    logger.info(f"Pipeline: Published '{article['title']}' → {pub.get('publishedUrl', '')}")
                except Exception as e:
                    result["errors"].append(f"Publish failed for '{article['title']}': {str(e)}")
                    logger.error(f"Pipeline: Publish failed: {e}")

        logger.info(
            f"Pipeline complete: {len(result['articles'])} articles, "
            f"{len(result['published'])} published, {len(result['errors'])} errors"
        )
        return result
