# Usage: npx expo export --platform web --output-dir dist && python3 scripts/package-web-artifact.py dist dist-artifact
"""Turn an `expo export --platform web` folder into a relocatable artifact bundle."""
import os, re, shutil, sys
src, out = sys.argv[1], sys.argv[2]
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
os.remove(os.path.join(out, "index.html"))
renames = {}
jsdir = os.path.join(out, "_expo/static/js/web")
for f in os.listdir(jsdir):
    if "[" in f:
        nf = f.replace("[", "").replace("]", "")
        os.rename(os.path.join(jsdir, f), os.path.join(jsdir, nf)); renames[f] = nf
for root, _, files in os.walk(out):
    for f in files:
        if not f.endswith((".js", ".css")): continue
        p = os.path.join(root, f); s = open(p, encoding="utf-8").read(); o = s
        for a, b in renames.items(): s = s.replace(a, b)
        s = re.sub(r'(["\'(])/(_expo|assets)/', r'\1\2/', s)
        # Lazy route chunks: Expo keeps full URLs as-is, so prefix them with the page's folder.
        s = re.sub(r'("\d+"):"(_expo/static/js/web/[^"]+)"', r'\1:globalThis.__GFF_BASE__+"\2"', s)
        if s != o: open(p, "w", encoding="utf-8").write(s)
orig = open(os.path.join(src, "index.html")).read()
css = re.findall(r'href="/(_expo/static/css/[^"]+)"', orig)
js = [renames.get(os.path.basename(j), os.path.basename(j)) for j in re.findall(r'src="/_expo/static/js/web/([^"]+)"', orig)]
page = f"""<title>Games For Fun</title>
<meta name="description" content="Twelve arcade games and a daily puzzle with bright mascots.">
<style>
  html, body {{ height: 100%; }}
  body {{ overflow: hidden; background: #5EB6FF; color: #141414; }}
  #root {{ display: flex; height: 100%; flex: 1; }}
</style>
<script>
  // Resolve the bundle's files next to this page, then start the router at "/".
  (function () {{
    var dir = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    var base = document.createElement("base");
    base.href = dir;
    window.__GFF_BASE__ = dir;
    document.head.appendChild(base);
    try {{ history.replaceState(null, "", "/"); }} catch (e) {{}}
  }})();
</script>
{"".join(f"<link rel=\"stylesheet\" href=\"{c}\">" for c in dict.fromkeys(css))}
<div id="root"></div>
{''.join(f'<script src="_expo/static/js/web/{j}" defer></script>' for j in js)}
"""
open(os.path.join(out, "index.html"), "w").write(page)
left = 0
for root, _, files in os.walk(out):
    for f in files:
        if f.endswith(".js"):
            left += len(re.findall(r'["\']/(?:_expo|assets)/', open(os.path.join(root, f), encoding="utf-8").read()))
print("absolute refs left:", left, "| renamed:", renames, "| files:", sum(len(f) for _, _, f in os.walk(out)))
# The artifact host reserves top-level names starting with "_": move _expo/ to expo/.
os.rename(os.path.join(out, "_expo"), os.path.join(out, "expo"))
for root, _, files in os.walk(out):
    for f in files:
        if f.endswith((".js", ".css", ".html")):
            p = os.path.join(root, f); s = open(p, encoding="utf-8").read()
            if "_expo/static/" in s: open(p, "w", encoding="utf-8").write(s.replace("_expo/static/", "expo/static/"))
