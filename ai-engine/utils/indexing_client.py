"""Google Indexing API Client — ขอให้ Google crawl URL"""

import json
import logging
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/indexing"]


class IndexingClient:
    def __init__(self):
        sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
        if not sa_json:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON env not set")

        info = json.loads(sa_json)
        credentials = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
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

    def get_status(self, url: str) -> dict:
        """เช็คสถานะ indexing ของ URL"""
        return self.service.urlNotifications().getMetadata(url=url).execute()
