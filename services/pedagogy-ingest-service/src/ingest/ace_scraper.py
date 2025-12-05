import requests
from bs4 import BeautifulSoup

def fetch_article(url: str):
    r = requests.get(url, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")
    article = soup.find("article") or soup.find("main") or soup.body
    if not article:
        return {"text": ""}
    text = " ".join(p.get_text(strip=True) for p in article.find_all("p"))
    return {"text": text[:200000]}
