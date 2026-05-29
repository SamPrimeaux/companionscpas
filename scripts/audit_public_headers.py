from urllib.request import urlopen
from html.parser import HTMLParser
from pathlib import Path
import re
import hashlib

BASE = "https://companionscpas.meauxbility.workers.dev"
ROUTES = ["/", "/about", "/adopt", "/services", "/donate"]

class HeaderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_header = False
        self.depth = 0
        self.parts = []
        self.body_attrs = {}

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "body":
            self.body_attrs = attrs_dict
        if tag == "header":
            self.in_header = True
            self.depth = 1
        elif self.in_header:
            self.depth += 1

        if self.in_header:
            attr = "".join(f' {k}="{v}"' for k, v in attrs)
            self.parts.append(f"<{tag}{attr}>")

    def handle_endtag(self, tag):
        if self.in_header:
            self.parts.append(f"</{tag}>")
            self.depth -= 1
            if tag == "header" and self.depth <= 0:
                self.in_header = False

    def handle_data(self, data):
        if self.in_header:
            text = data.strip()
            if text:
                self.parts.append(text)

def fetch(route):
    with urlopen(BASE + route, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")

def normalize_header(h):
    h = re.sub(r"\s+", " ", h).strip()
    return h

for route in ROUTES:
    html = fetch(route)
    parser = HeaderParser()
    parser.feed(html)
    header = "\n".join(parser.parts)
    norm = normalize_header(header)
    digest = hashlib.sha256(norm.encode()).hexdigest()[:12]

    print(f"\n===== {route} =====")
    print("body attrs:", parser.body_attrs)
    print("header hash:", digest)
    print("bad refs:", sorted(set(re.findall(
        r"assets\.meauxxx\.com|samprimeauxwork|companionscpas-platform|desktop-links|class=\"brand\"|container nav|donateModal|onclick=",
        header
    ))))
    print("header:")
    print(header[:1500])
