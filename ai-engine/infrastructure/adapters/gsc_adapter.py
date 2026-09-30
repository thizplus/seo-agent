from datetime import datetime, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from domain.ports.search_console_port import SearchConsolePort


class GSCOAuthAdapter(SearchConsolePort):
    """Google Search Console OAuth implementation ของ SearchConsolePort"""

    def __init__(
        self, refresh_token: str, site_url: str, client_id: str, client_secret: str
    ):
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
        )
        self.service = build("searchconsole", "v1", credentials=credentials)
        self.site_url = site_url

    def get_page_metrics(self, page_url: str, days: int = 28) -> dict:
        end_date = datetime.now().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        body = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["query", "page"],
            "dimensionFilterGroups": [
                {"filters": [{"dimension": "page", "operator": "equals", "expression": page_url}]}
            ],
            "rowLimit": 1000,
        }

        response = (
            self.service.searchanalytics()
            .query(siteUrl=self.site_url, body=body)
            .execute()
        )

        rows = response.get("rows", [])
        if not rows:
            return {
                "clicks": 0, "impressions": 0, "ctr": 0,
                "position": 0, "indexed": False, "queries": [],
            }

        total_clicks = sum(r.get("clicks", 0) for r in rows)
        total_impressions = sum(r.get("impressions", 0) for r in rows)
        avg_position = (
            sum(r.get("position", 0) * r.get("impressions", 0) for r in rows) / total_impressions
            if total_impressions > 0 else 0
        )
        avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0

        queries = []
        for r in sorted(rows, key=lambda x: x.get("impressions", 0), reverse=True)[:20]:
            keys = r.get("keys", [])
            queries.append({
                "query": keys[0] if keys else "",
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
            })

        return {
            "clicks": total_clicks,
            "impressions": total_impressions,
            "ctr": round(avg_ctr, 4),
            "position": round(avg_position, 1),
            "indexed": total_impressions > 0,
            "queries": queries,
        }

    def get_site_metrics(self, days: int = 28) -> dict:
        end_date = datetime.now().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        body = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["page"],
            "rowLimit": 5000,
        }

        response = (
            self.service.searchanalytics()
            .query(siteUrl=self.site_url, body=body)
            .execute()
        )

        rows = response.get("rows", [])
        total_clicks = sum(r.get("clicks", 0) for r in rows)
        total_impressions = sum(r.get("impressions", 0) for r in rows)
        avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
        avg_position = (
            sum(r.get("position", 0) * r.get("impressions", 0) for r in rows) / total_impressions
            if total_impressions > 0
            else 0
        )

        pages = []
        for r in sorted(rows, key=lambda x: x.get("clicks", 0), reverse=True):
            keys = r.get("keys", [])
            pages.append({
                "page": keys[0] if keys else "",
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": round(r.get("ctr", 0), 4),
                "position": round(r.get("position", 0), 1),
            })

        query_body = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "dimensions": ["query"],
            "rowLimit": 20,
        }
        query_response = (
            self.service.searchanalytics()
            .query(siteUrl=self.site_url, body=query_body)
            .execute()
        )
        queries = []
        for r in query_response.get("rows", []):
            keys = r.get("keys", [])
            queries.append({
                "query": keys[0] if keys else "",
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
            })

        return {
            "totalClicks": total_clicks,
            "totalImpressions": total_impressions,
            "avgCtr": round(avg_ctr, 4),
            "avgPosition": round(avg_position, 1),
            "totalPages": len(rows),
            "pages": pages,
            "topQueries": queries,
        }
