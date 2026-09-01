"""Test article writer parser"""
from services.article_writer import ArticleWriter

w = ArticleWriter.__new__(ArticleWriter)

# Simulate Gemini response with ```json wrapper
response = """```json
{
  "title": "ผลิตดิสเพลย์กระดาษ: คู่มือครบวงจร",
  "slug": "paper-display-manufacturing",
  "content": "# ผลิตดิสเพลย์กระดาษ\\n\\nบทความเกี่ยวกับการผลิตดิสเพลย์กระดาษ\\n\\n## ทำไมต้องเลือกดิสเพลย์กระดาษ\\n\\nดิสเพลย์กระดาษเป็นทางเลือกที่คุ้มค่า",
  "metaDescription": "ผลิตดิสเพลย์กระดาษคุณภาพสูง ออกแบบครบวงจร",
  "wordCount": 2500,
  "eeatScore": {"experience": 8, "expertise": 9, "authority": 7, "trust": 8},
  "schemaMarkup": {}
}
```"""

result = w._parse_response(response, "ผลิตดิสเพลย์กระดาษ")
print(f"Title: {result['title']}")
print(f"Slug: {result['slug']}")
print(f"Content starts with #: {result['content'].startswith('#')}")
print(f"Content preview: {result['content'][:80]}")
print(f"Word count: {result['wordCount']}")
print(f"EEAT: {result.get('eeatScore', {})}")
print(f"SUCCESS: {'content' in result and result['content'].startswith('#')}")
