"""Google Indexing API + URL Inspection Client"""

import json
import logging
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

INDEXING_SCOPES = ["https://www.googleapis.com/auth/indexing"]
WEBMASTER_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def _load_sa_info():
    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not sa_json:
        raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON env not set")
    return json.loads(sa_json)


class IndexingClient:
    def __init__(self):
        info = _load_sa_info()
        credentials = service_account.Credentials.from_service_account_info(info, scopes=INDEXING_SCOPES)
        self.service = build("indexing", "v3", credentials=credentials)

    def request_indexing(self, url: str) -> dict:
        """ขอให้ Google crawl URL นี้"""
        body = {"url": url, "type": "URL_UPDATED"}
        result = self.service.urlNotifications().publish(body=body).execute()
        logger.info(f"Indexing requested: {url} -> {result}")
        return result

    def request_removal(self, url: str) -> dict:
        """แจ้งว่า URL นี้ถูกลบ"""
        body = {"url": url, "type": "URL_DELETED"}
        return self.service.urlNotifications().publish(body=body).execute()


class URLInspectionClient:
    def __init__(self):
        info = _load_sa_info()
        credentials = service_account.Credentials.from_service_account_info(info, scopes=WEBMASTER_SCOPES)
        self.service = build("searchconsole", "v1", credentials=credentials)

    def inspect(self, url: str, site_url: str) -> dict:
        """ตรวจสอบสถานะ index ของ URL"""
        body = {
            "inspectionUrl": url,
            "siteUrl": site_url,
        }
        result = self.service.urlInspection().index().inspect(body=body).execute()
        inspection = result.get("inspectionResult", {})
        index_status = inspection.get("indexStatusResult", {})

        return {
            "verdict": index_status.get("verdict", ""),
            "coverageState": index_status.get("coverageState", ""),
            "robotsTxtState": index_status.get("robotsTxtState", ""),
            "indexingState": index_status.get("indexingState", ""),
            "lastCrawlTime": index_status.get("lastCrawlTime", ""),
            "pageFetchState": index_status.get("pageFetchState", ""),
            "crawledAs": index_status.get("crawledAs", ""),
        }
