class KeywordScorer:
    """Score keywords เพื่อ prioritize"""

    # Money keyword signals (Thai + English)
    MONEY_SIGNALS = ["ราคา", "รีวิว", "ดีไหม", "ซื้อ", "สั่ง", "จอง", "price", "review", "buy"]
    COMMERCIAL_SIGNALS = ["แนะนำ", "เปรียบเทียบ", "top", "best", "อันดับ"]

    def score(self, keyword: dict) -> int:
        """คำนวณ score สำหรับ keyword

        Args:
            keyword: {keyword, source, intent, impressions?, position?}

        Returns:
            score 0-10
        """
        s = 0
        kw = keyword.get("keyword", "").lower()
        source = keyword.get("source", "")
        intent = keyword.get("intent", "informational")

        # Intent bonus
        if intent == "transactional":
            s += 3
        elif intent == "commercial":
            s += 2
        elif intent == "informational":
            s += 1

        # Source bonus
        if source == "gsc":
            s += 2  # GSC = มี data จริง
            # Position bonus (ใกล้หน้า 1 = ดี)
            position = keyword.get("position", 100)
            if position <= 15:
                s += 2
            elif position <= 20:
                s += 1
            # Impressions bonus
            impressions = keyword.get("impressions", 0)
            if impressions >= 100:
                s += 1

        elif source == "google_suggest":
            s += 1  # มีคนค้นหาจริง

        # Money keyword bonus
        if any(w in kw for w in self.MONEY_SIGNALS):
            s += 2
        elif any(w in kw for w in self.COMMERCIAL_SIGNALS):
            s += 1

        # Length bonus (long-tail มักง่ายกว่า)
        word_count = len(kw.split())
        if 3 <= word_count <= 6:
            s += 1

        return min(s, 10)

    def score_all(self, keywords: list[dict]) -> list[dict]:
        """Score ทุก keyword แล้ว sort by score DESC"""
        for kw in keywords:
            kw["score"] = self.score(kw)

        return sorted(keywords, key=lambda x: x["score"], reverse=True)
