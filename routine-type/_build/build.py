"""
루틴 유형 테스트 빌드 스크립트.

assets/data.json 한 곳을 기준으로 다음을 만든다.
  - r/{코드}.html        결과 페이지 8개 (OG 메타 포함, JS 없이도 내용이 보임)
  - assets/char/{코드}.webp  캐릭터 512px (--chars 로 원본 폴더를 줄 때만)
  - assets/og/{코드}.jpg, main.jpg  링크 미리보기 1200x630 (--chars 를 줄 때만)

사용법 (routine-type 폴더에서):
  python3 _build/build.py
  python3 _build/build.py --chars /Volumes/realtek_1tb/Projects/iroutine/docs/assets/routine-type/characters

이미지는 전역 gitignore(*.png) 때문에 WebP/JPG로 만든다.
필요: Pillow, Pretendard 글꼴(설치된 글꼴 또는 --font).
"""

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "assets" / "data.json").read_text(encoding="utf-8"))
TOKENS = (ROOT / "assets" / "tokens.css").read_text(encoding="utf-8")
PRETENDARD_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
FONT_DIRS = [Path.home() / "Library" / "Fonts", Path("/Library/Fonts")]


def token(name: str) -> str:
    m = re.search(rf"--{re.escape(name)}:\s*([^;]+);", TOKENS)
    if not m:
        raise SystemExit(f"tokens.css에 --{name} 이 없습니다")
    return m.group(1).strip()


def esc(s: str) -> str:
    return html.escape(s, quote=True)


# ---------- 결과 페이지 ----------
def tip_html(pole: str) -> str:
    tip = DATA["tips"][pole]
    app = f'<span class="app-chip t-caption">아이루틴에서는: {esc(tip["app"])}</span>' if tip.get("app") else ""
    return (
        f'<div class="tip"><h3 class="t-body-strong">{esc(tip["title"])}</h3>'
        f'<p class="t-body sub">{esc(tip["body"])}</p>{app}</div>'
    )


def result_page(code: str) -> str:
    t = DATA["types"][code]
    base = DATA["baseUrl"]
    txt = DATA["text"]
    title = f"우리 아이는 '{t['name']}'"
    strengths = "".join(f"<li>{esc(s)}</li>" for s in t["strengths"])
    tips = "".join(tip_html(p) for p in code)
    morning = "".join(f"<li>{esc(s)}</li>" for s in t["morning"])
    note = f'<p class="t-caption muted">{esc(t["note"])}</p>' if t.get("note") else ""
    evening = ""
    if t.get("evening"):
        items = "".join(f"<li>{esc(s)}</li>" for s in t["evening"])
        evening = f'<h3 class="t-body-strong mt-4">저녁에 미리</h3><ol class="list t-body">{items}</ol>'
    rhythm = "아침형 종달새" if code[0] == "L" else "저녁형 부엉이"

    return f"""<!doctype html>
<html lang="ko">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{esc(title)} | 우리 아이 루틴 유형 테스트</title>
        <meta name="description" content="{esc(t['oneLiner'])}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="아이루틴" />
        <meta property="og:title" content="{esc(title)}" />
        <meta property="og:description" content="{esc(t['oneLiner'])} — 우리 아이는 어떤 유형일까요?" />
        <meta property="og:image" content="{base}assets/og/{code}.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="{base}r/{code}.html" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="stylesheet" href="{PRETENDARD_CSS}" />
        <link rel="stylesheet" href="../assets/tokens.css" />
        <link rel="stylesheet" href="../assets/app.css" />
    </head>
    <body data-page="result" data-root="../" data-type="{code}">
        <main class="page">
            <header class="brand t-caption">
                <span>아이루틴</span>
                <a href="../about.html">근거 자료</a>
            </header>

            <div id="shared-banner" class="shared-banner hidden">
                <p class="t-body-strong">친구가 공유한 결과예요. 우리 아이는 어떤 유형일까요?</p>
                <a class="btn btn-primary t-button" href="../?from=share">나도 해보기</a>
            </div>

            <section class="result-hero">
                <img class="char" src="../assets/char/{code}.webp" alt="{esc(t['name'])} 캐릭터" width="220" height="220" />
                <span class="badge t-caption">{rhythm}</span>
                <h1 class="t-display">{esc(t['name'])}</h1>
                <p class="t-body sub-strong">{esc(t['oneLiner'])}</p>
            </section>

            <section class="card">
                <h2 class="t-subtitle">이런 강점이 있어요</h2>
                <ul class="list t-body">{strengths}</ul>
            </section>

            <section class="card">
                <h2 class="t-subtitle">이런 루틴이 잘 맞아요</h2>
                {tips}
            </section>

            <section class="card">
                <h2 class="t-subtitle">추천 아침 루틴</h2>
                <ol class="list t-body">{morning}</ol>
                {note}
                {evening}
            </section>

            <section class="card">
                <p class="t-body sub">{esc(txt['noBetter'])}</p>
                <p class="t-body sub mt-3">{esc(txt['habit'])}</p>
            </section>

            <div class="btn-stack">
                <button id="kakao-btn" class="btn btn-kakao t-button hidden" type="button">카카오톡으로 공유하기</button>
                <div class="btn-row">
                    <button id="save-btn" class="btn btn-outline t-button" type="button">이미지 저장</button>
                    <button id="share-btn" class="btn btn-outline t-button" type="button">링크 공유</button>
                </div>
                <button id="save-square-btn" class="link-btn t-caption" type="button">정사각형 이미지로 저장</button>
                <div id="store-area" class="btn-stack"></div>
                <a id="retry-btn" class="btn btn-outline t-button" href="../">다시 하기</a>
            </div>

            <footer class="footer t-caption">
                <p>{esc(txt['disclaimer'])}</p>
                <p>{esc(txt['privacy'])}</p>
                <p><a href="../about.html">근거 자료 · 안내</a></p>
            </footer>
        </main>

        <div id="save-modal" class="modal hidden" role="dialog" aria-modal="true" aria-label="이미지 저장">
            <div class="modal-body">
                <p class="t-body-strong">이미지를 길게 눌러 저장해 주세요</p>
                <img id="save-modal-img" alt="결과 이미지" />
                <button id="save-modal-close" class="btn btn-outline t-button" type="button">닫기</button>
            </div>
        </div>

        <script src="../assets/config.js"></script>
        <script src="../assets/app.js"></script>
    </body>
</html>
"""


# ---------- 이미지 ----------
def find_font(weight: str, override: str | None):
    if override:
        return override
    for d in FONT_DIRS:
        p = d / f"Pretendard-{weight}.otf"
        if p.exists():
            return str(p)
    raise SystemExit("Pretendard 글꼴을 찾지 못했습니다. --font 로 경로를 지정하세요.")


def build_images(src: Path, font_dir: str | None):
    from PIL import Image, ImageDraw, ImageFont

    bold = find_font("ExtraBold", font_dir and f"{font_dir}/Pretendard-ExtraBold.otf")
    regular = find_font("Medium", font_dir and f"{font_dir}/Pretendard-Medium.otf")
    char_dir = ROOT / "assets" / "char"
    og_dir = ROOT / "assets" / "og"
    char_dir.mkdir(parents=True, exist_ok=True)
    og_dir.mkdir(parents=True, exist_ok=True)

    def rounded(img, radius):
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), radius, fill=255)
        out = Image.new("RGBA", img.size)
        out.paste(img, (0, 0), mask)
        return out

    def fit_text(draw, text, font_path, size, max_w):
        while size > 20:
            f = ImageFont.truetype(font_path, size)
            if draw.textlength(text, font=f) <= max_w:
                return f
            size -= 2
        return ImageFont.truetype(font_path, size)

    text_color = token("color-text")
    sub_color = token("color-text-sub")
    muted = token("color-text-muted")

    for code, t in DATA["types"].items():
        original = Image.open(src / f"{code}.png").convert("RGB")
        original.resize((512, 512), Image.LANCZOS).save(char_dir / f"{code}.webp", "WEBP", quality=86)

        key = code.lower()
        og = Image.new("RGB", (1200, 630), token(f"type-{key}-soft"))
        char = rounded(original.resize((470, 470), Image.LANCZOS).convert("RGBA"), 40)
        og.paste(char, (80, 80), char)
        d = ImageDraw.Draw(og)
        x, w = 600, 540
        d.text((x, 150), "우리 아이 루틴 유형은", font=ImageFont.truetype(regular, 34), fill=sub_color)
        name_font = fit_text(d, t["name"], bold, 60, w)
        # 긴 이름은 두 줄로
        words = t["name"].split(" ")
        if d.textlength(t["name"], font=ImageFont.truetype(bold, 56)) > w and len(words) > 1:
            half = (len(words) + 1) // 2
            lines = [" ".join(words[:half]), " ".join(words[half:])]
            name_font = ImageFont.truetype(bold, 56)
        else:
            lines = [t["name"]]
        y = 210
        for line in lines:
            d.text((x, y), line, font=name_font, fill=text_color)
            y += 76
        line_font = ImageFont.truetype(regular, 30)
        one = t["oneLiner"]
        # 한 줄 설명 줄바꿈
        cur, out_lines = "", []
        for word in one.split(" "):
            nxt = f"{cur} {word}".strip()
            if d.textlength(nxt, font=line_font) > w and cur:
                out_lines.append(cur)
                cur = word
            else:
                cur = nxt
        out_lines.append(cur)
        y += 20
        for line in out_lines:
            d.text((x, y), line, font=line_font, fill=sub_color)
            y += 44
        d.text((x, 520), "아이루틴 · 우리 아이 루틴 유형 테스트", font=ImageFont.truetype(regular, 26), fill=muted)
        og.save(og_dir / f"{code}.jpg", "JPEG", quality=88)

    # 시작 페이지용 대표 이미지 (종달새 + 부엉이)
    main = Image.new("RGB", (1200, 630), token("color-primary-soft"))
    for i, code in enumerate(["LSE", "OTK"]):
        img = rounded(Image.open(src / f"{code}.png").convert("RGB").resize((330, 330), Image.LANCZOS).convert("RGBA"), 36)
        main.paste(img, (70 + i * 350, 150), img)
    d = ImageDraw.Draw(main)
    d.text((790, 200), "우리 아이는", font=ImageFont.truetype(bold, 52), fill=text_color)
    d.text((790, 268), "어떤 루틴", font=ImageFont.truetype(bold, 52), fill=text_color)
    d.text((790, 336), "유형일까?", font=ImageFont.truetype(bold, 52), fill=text_color)
    d.text((790, 430), "15개 질문 · 3분", font=ImageFont.truetype(regular, 30), fill=sub_color)
    main.save(og_dir / "main.jpg", "JPEG", quality=88)
    print("이미지 생성:", len(DATA["types"]) * 2 + 1, "개")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chars", help="캐릭터 원본 PNG 폴더 ({코드}.png)")
    ap.add_argument("--font", help="Pretendard OTF 폴더 (없으면 설치된 글꼴 사용)")
    args = ap.parse_args()

    out = ROOT / "r"
    out.mkdir(exist_ok=True)
    for code in DATA["types"]:
        (out / f"{code}.html").write_text(result_page(code), encoding="utf-8")
    print("결과 페이지 생성:", len(DATA["types"]), "개")

    if args.chars:
        build_images(Path(args.chars), args.font)


if __name__ == "__main__":
    main()
