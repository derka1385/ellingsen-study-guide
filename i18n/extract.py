"""Tag every leaf text block in the page with data-i="N" and dump {N: innerHTML} for translation.
usage: extract.py page.html tagged.html blocks.json"""
import sys, json, re
from html.parser import HTMLParser

BLOCK = {"p", "li", "td", "th", "h1", "h2", "h3", "h4", "summary", "figcaption", "dt", "dd",
         "blockquote", "label", "button", "option", "div", "text", "title", "small", "cite"}
VOID = {"br", "img", "input", "meta", "link", "path", "circle", "line", "rect", "hr", "wbr"}
WORD = re.compile(r"[A-Za-zÀ-ÿ]{4,}")

src = open(sys.argv[1], encoding="utf-8").read()
start = src.index('<div class="app">')
end = src.index("<script>", start)
body = src[start:end]

line_starts = [0] + [m.end() for m in re.finditer("\n", body)]
off = lambda pos: line_starts[pos[0] - 1] + pos[1]

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack, self.found = [], []
    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        a = dict(attrs)
        o = off(self.getpos())
        self.stack.append({"tag": tag, "start": o, "inner": o + len(self.get_starttag_text()), "has_block": False,
                           "skip": "study" in (a.get("class") or ""), "dyn": "data-g" in a or "data-t" in a})
    def handle_endtag(self, tag):
        while self.stack and self.stack[-1]["tag"] != tag:
            self.stack.pop()
        if not self.stack:
            return
        e = self.stack.pop()
        if tag in BLOCK:
            if not e["has_block"] and not e["skip"] and not e["dyn"] and not any(s["dyn"] for s in self.stack):
                inner = body[e["inner"]:off(self.getpos())]
                if WORD.search(re.sub(r"<[^>]+>", " ", inner)):
                    self.found.append((e["start"], e["inner"], inner))
            for s in self.stack:
                s["has_block"] = True

p = P(); p.feed(body)
out, blocks, last = [], {}, 0
for n, (s, i, inner) in enumerate(sorted(p.found)):
    out.append(body[last:s]); out.append(body[s:i][:-1].rstrip("/") + f' data-i="{n}">'); last = i
    blocks[n] = inner
out.append(body[last:])
open(sys.argv[2], "w", encoding="utf-8").write(src[:start] + "".join(out) + src[end:])
json.dump(blocks, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(blocks), "blocks")
