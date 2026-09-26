// 우리 아이 루틴 유형 테스트 — 문항 진행·채점·결과 공유
// 답변은 이 페이지 메모리에만 두고 어디에도 보내지 않는다 (PRD §7).
(function () {
    "use strict";

    const CFG = window.RTT_CONFIG || {};
    const body = document.body;
    const PAGE = body.dataset.page;
    const ROOT = body.dataset.root || "./";
    const params = new URLSearchParams(location.search);
    const IN_APP = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(navigator.userAgent);
    const IS_IOS =
        /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    const IS_ANDROID = /Android/i.test(navigator.userAgent);

    let DATA = null;

    // ---------- 분석 (GA4 분석 쿠키만 사용, 광고 쿠키 차단) ----------
    // client_storage: "none"은 GA4 gtag에서 무시되어 _ga 쿠키가 생긴다 (2026-09-26 확인).
    // 분석 쿠키는 고지 후 사용하고, 광고용 저장(_gcl_au 등)은 동의 모드로 막는다.
    function initAnalytics() {
        if (!CFG.GA_ID) return;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag("consent", "default", {
            analytics_storage: "granted",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
        });
        window.gtag("js", new Date());
        window.gtag("config", CFG.GA_ID);
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${CFG.GA_ID}`;
        document.head.appendChild(s);
    }

    function track(name, data) {
        if (window.gtag) window.gtag("event", name, data || {});
    }

    function entrySource() {
        return params.get("from") || params.get("utm_source") || "direct";
    }

    // ---------- 공통 UI ----------
    const $ = (id) => document.getElementById(id);

    function show(el, visible) {
        el.classList.toggle("hidden", !visible);
    }

    let toastTimer = null;
    function toast(message) {
        let el = $("toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "toast";
            el.className = "toast t-caption";
            el.setAttribute("role", "status");
            body.appendChild(el);
        }
        el.textContent = message;
        show(el, true);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => show(el, false), 2200);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // ---------- 채점 ----------
    function scoreAnswers(answers) {
        const counts = {};
        DATA.questions.forEach((q, i) => {
            const pole = answers[i] === "a" ? q.a[1] : q.b[1];
            counts[pole] = (counts[pole] || 0) + 1;
        });
        // 축마다 5문항 → 3개 이상인 극으로 결정 (동점 없음)
        return ["R", "C", "A"]
            .map((axis) => {
                const { first, second } = DATA.axes[axis];
                return (counts[first] || 0) >= (counts[second] || 0) ? first : second;
            })
            .join("");
    }

    // ---------- 문항 화면 ----------
    function initQuiz() {
        const total = DATA.questions.length;
        const answers = new Array(total).fill(null);
        let index = 0;
        let busy = false;

        function render() {
            const q = DATA.questions[index];
            $("q-count").textContent = `${index + 1} / ${total}`;
            $("progress-bar").style.width = `${(index / total) * 100}%`;
            $("progress").setAttribute("aria-valuenow", String(index + 1));
            $("q-text").textContent = q.q;
            ["a", "b"].forEach((key) => {
                const btn = $(`opt-${key}`);
                btn.textContent = q[key][0];
                btn.classList.toggle("selected", answers[index] === key);
                btn.setAttribute("aria-pressed", String(answers[index] === key));
            });
            $("prev-btn").disabled = index === 0;
            $("q-text").focus({ preventScroll: true });
        }

        function choose(key) {
            if (busy) return; // 빠른 연타 방지
            busy = true;
            answers[index] = key;
            $(`opt-${key}`).classList.add("selected");
            track("rtt_answer", { q_index: index + 1 });
            setTimeout(() => {
                busy = false;
                if (index < total - 1) {
                    index += 1;
                    render();
                } else {
                    finish();
                }
            }, 180);
        }

        function finish() {
            const code = scoreAnswers(answers);
            $("progress-bar").style.width = "100%";
            show($("quiz"), false);
            show($("loading"), true);
            track("rtt_complete", { type_code: code });
            setTimeout(() => {
                location.href = `${ROOT}r/${code}.html`;
            }, 900);
        }

        $("start-btn").addEventListener("click", () => {
            track("rtt_start", { from: entrySource() });
            show($("start"), false);
            show($("quiz"), true);
            render();
        });
        $("opt-a").addEventListener("click", () => choose("a"));
        $("opt-b").addEventListener("click", () => choose("b"));
        $("prev-btn").addEventListener("click", () => {
            if (busy || index === 0) return;
            index -= 1;
            render();
        });

        // 뒤로 가기로 돌아왔을 때 이전 상태가 남지 않게 시작 화면으로
        window.addEventListener("pageshow", (e) => {
            if (e.persisted) {
                answers.fill(null);
                index = 0;
                show($("start"), true);
                show($("quiz"), false);
                show($("loading"), false);
            }
        });
    }

    // ---------- 결과 화면 ----------
    function resultUrl(code) {
        return `${DATA.baseUrl}r/${code}.html?from=share`;
    }

    function storeLink(platform, code) {
        const campaign = `rtt_${code}`;
        if (platform === "ios") {
            return `${DATA.store.ios}?ct=${campaign}&mt=8`;
        }
        const referrer = encodeURIComponent(
            `utm_source=routine_type_test&utm_medium=web&utm_campaign=${campaign}`
        );
        return `${DATA.store.android}&referrer=${referrer}`;
    }

    function renderStoreButtons(code) {
        const area = $("store-area");
        const platforms = IS_IOS ? ["ios"] : IS_ANDROID ? ["android"] : ["ios", "android"];
        const label = {
            ios: platforms.length > 1 ? "App Store에서 받기" : "아이루틴 앱에서 루틴 만들기",
            android: platforms.length > 1 ? "Google Play에서 받기" : "아이루틴 앱에서 루틴 만들기",
        };
        area.innerHTML = "";
        platforms.forEach((p) => {
            const a = document.createElement("a");
            a.className = "btn btn-primary t-button";
            a.href = storeLink(p, code);
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = label[p];
            a.addEventListener("click", () =>
                track("rtt_store_click", { type_code: code, platform: p })
            );
            area.appendChild(a);
        });
        area.classList.toggle("btn-row", platforms.length > 1);
    }

    async function shareLink(code) {
        const t = DATA.types[code];
        const url = resultUrl(code);
        if (navigator.share && !IN_APP) {
            try {
                await navigator.share({
                    title: `우리 아이는 '${t.name}'`,
                    text: `${t.oneLiner} — 우리 아이 루틴 유형 테스트`,
                    url,
                });
                track("rtt_share", { type_code: code, method: "web_share" });
            } catch (e) {
                if (e && e.name !== "AbortError") copyLink(code, url);
            }
            return;
        }
        copyLink(code, url);
    }

    async function copyLink(code, url) {
        try {
            await navigator.clipboard.writeText(url);
        } catch (e) {
            const ta = document.createElement("textarea");
            ta.value = url;
            body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
        }
        toast("링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.");
        track("rtt_share", { type_code: code, method: "copy_link" });
    }

    async function shareKakao(code) {
        const t = DATA.types[code];
        try {
            if (!window.Kakao) await loadScript(CFG.KAKAO_SDK_URL);
            if (!window.Kakao.isInitialized()) window.Kakao.init(CFG.KAKAO_JS_KEY);
            const shared = { mobileWebUrl: resultUrl(code), webUrl: resultUrl(code) };
            const start = { mobileWebUrl: DATA.baseUrl, webUrl: DATA.baseUrl };
            window.Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                    title: `우리 아이는 '${t.name}'`,
                    description: t.oneLiner,
                    imageUrl: `${DATA.baseUrl}assets/og/${code}.jpg`,
                    link: shared,
                },
                buttons: [
                    { title: "결과 보기", link: shared },
                    { title: "나도 해보기", link: start },
                ],
            });
            track("rtt_share", { type_code: code, method: "kakao" });
        } catch (e) {
            // 도메인 미등록·SDK 로드 실패 시 링크 복사로 대체
            copyLink(code, resultUrl(code));
        }
    }

    // ---------- 결과 이미지 (canvas) ----------
    // 이미지 안의 글자 크기는 출력 해상도(1080px) 기준 픽셀값이다.
    const CANVAS = {
        story: { w: 1080, h: 1920, char: 640, charY: 300, nameY: 1080, nameSize: 76, lineSize: 44, listY: 1300, footY: 1800 },
        square: { w: 1080, h: 1080, char: 500, charY: 90, nameY: 700, nameSize: 64, lineSize: 38, listY: 0, footY: 1010 },
    };

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function wrapLines(ctx, text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let line = "";
        words.forEach((w) => {
            const next = line ? `${line} ${w}` : w;
            if (ctx.measureText(next).width > maxWidth && line) {
                lines.push(line);
                line = w;
            } else {
                line = next;
            }
        });
        if (line) lines.push(line);
        return lines;
    }

    async function drawResultImage(code, layout) {
        const L = CANVAS[layout];
        const t = DATA.types[code];
        const key = code.toLowerCase();
        const family = cssVar("--font-family");
        await Promise.all([
            document.fonts.load(`800 ${L.nameSize}px Pretendard`),
            document.fonts.load(`400 ${L.lineSize}px Pretendard`),
        ]).catch(() => {});
        const img = new Image();
        img.src = `${ROOT}assets/char/${code}.webp`;
        await img.decode();

        const canvas = document.createElement("canvas");
        canvas.width = L.w;
        canvas.height = L.h;
        const ctx = canvas.getContext("2d");
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";

        ctx.fillStyle = cssVar(`--type-${key}-soft`);
        ctx.fillRect(0, 0, L.w, L.h);

        if (layout === "story") {
            ctx.fillStyle = cssVar("--color-text-sub");
            ctx.font = `600 ${L.lineSize}px ${family}`;
            ctx.fillText("우리 아이 루틴 유형은", L.w / 2, 220);
        }

        const cx = (L.w - L.char) / 2;
        ctx.save();
        roundRect(ctx, cx, L.charY, L.char, L.char, 48);
        ctx.clip();
        ctx.fillStyle = cssVar("--color-surface");
        ctx.fillRect(cx, L.charY, L.char, L.char);
        ctx.drawImage(img, cx, L.charY, L.char, L.char);
        ctx.restore();

        ctx.fillStyle = cssVar("--color-text");
        ctx.font = `800 ${L.nameSize}px ${family}`;
        let y = L.nameY;
        wrapLines(ctx, t.name, L.w - 160).forEach((line) => {
            ctx.fillText(line, L.w / 2, y);
            y += L.nameSize * 1.25;
        });

        ctx.fillStyle = cssVar("--color-text-sub-strong");
        ctx.font = `400 ${L.lineSize}px ${family}`;
        wrapLines(ctx, t.oneLiner, L.w - 200).forEach((line) => {
            ctx.fillText(line, L.w / 2, y + 10);
            y += L.lineSize * 1.4;
        });

        if (layout === "story") {
            const boxX = 90;
            const boxY = Math.max(L.listY, y + 40);
            const boxH = 3 * L.lineSize * 1.9 + 60;
            ctx.fillStyle = cssVar("--color-surface");
            roundRect(ctx, boxX, boxY, L.w - boxX * 2, boxH, 36);
            ctx.fill();
            ctx.textAlign = "left";
            ctx.font = `600 ${L.lineSize}px ${family}`;
            t.strengths.forEach((s, i) => {
                const ly = boxY + 60 + L.lineSize + i * L.lineSize * 1.9;
                ctx.fillStyle = cssVar(`--type-${key}-accent`);
                ctx.beginPath();
                ctx.arc(boxX + 70, ly - L.lineSize / 3, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = cssVar("--color-text");
                ctx.fillText(s, boxX + 110, ly);
            });
            ctx.textAlign = "center";
        }

        ctx.fillStyle = cssVar("--color-text-muted");
        ctx.font = `600 ${Math.round(L.lineSize * 0.8)}px ${family}`;
        ctx.fillText("아이루틴 · 우리 아이 루틴 유형 테스트", L.w / 2, L.footY);

        return canvas;
    }

    function openSaveModal(dataUrl) {
        const modal = $("save-modal");
        $("save-modal-img").src = dataUrl;
        show(modal, true);
        $("save-modal-close").focus();
    }

    async function saveImage(code, layout) {
        const btn = layout === "story" ? $("save-btn") : $("save-square-btn");
        btn.disabled = true;
        try {
            const canvas = await drawResultImage(code, layout);
            const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
            const filename = `routine-type-${code}-${layout}.png`;
            const file = new File([blob], filename, { type: "image/png" });
            if (IN_APP) {
                openSaveModal(canvas.toDataURL("image/png"));
            } else if ((IS_IOS || IS_ANDROID) && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                } catch (e) {
                    if (e && e.name !== "AbortError") openSaveModal(canvas.toDataURL("image/png"));
                }
            } else {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }
            track("rtt_share", { type_code: code, method: "save_image" });
        } catch (e) {
            toast("이미지를 만들지 못했어요. 화면을 캡처해 주세요.");
        } finally {
            btn.disabled = false;
        }
    }

    function initResult() {
        const code = body.dataset.type;
        if (params.get("from") === "share") {
            show($("shared-banner"), true);
            track("rtt_view_shared", { type_code: code });
        }
        renderStoreButtons(code);

        const kakaoBtn = $("kakao-btn");
        if (CFG.KAKAO_JS_KEY) {
            show(kakaoBtn, true);
            kakaoBtn.addEventListener("click", () => shareKakao(code));
        }
        $("share-btn").addEventListener("click", () => shareLink(code));
        $("save-btn").addEventListener("click", () => saveImage(code, "story"));
        $("save-square-btn").addEventListener("click", () => saveImage(code, "square"));
        $("retry-btn").addEventListener("click", () => track("rtt_retry", { type_code: code }));
        $("save-modal-close").addEventListener("click", () => show($("save-modal"), false));
    }

    // ---------- 시작 ----------
    initAnalytics();
    if (PAGE !== "quiz" && PAGE !== "result") return;
    fetch(`${ROOT}assets/data.json`)
        .then((r) => r.json())
        .then((d) => {
            DATA = d;
            if (PAGE === "quiz") initQuiz();
            else initResult();
        })
        .catch(() => toast("문항을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."));
})();
