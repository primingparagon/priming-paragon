import feedparser
def parse_rss(url: str):
    feed = feedparser.parse(url)
    entries = []
    for e in feed.entries:
        entries.append({"title": e.get("title"), "link": e.get("link"), "published": e.get("published")})
    return entries
