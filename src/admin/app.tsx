import type { StrapiApp } from '@strapi/strapi/admin';
import { setPluginConfig, defaultHtmlPreset, defaultMarkdownPreset } from '@_sh/strapi-plugin-ckeditor';

/**
 * 날짜 문자열을 "yyyy-mm-dd HH:mm" 형식으로 변환
 * Strapi 어드민이 표시하는 날짜 형식: "Monday, January 12, 2026 at 6:08 PM"
 */
const reformatDate = (text: string): string | null => {
    const trimmed = text.trim();

    // ── 영어 형식: "Monday, January 12, 2026 at 6:08 PM" ──────────
    const enMatch = trimmed.match(
        /^[A-Za-z]+,\s+([A-Za-z]+ \d{1,2}, \d{4})\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)$/
    );
    if (enMatch) {
        try {
            const parsed = new Date(`${enMatch[1]} ${enMatch[2]}`);
            if (isNaN(parsed.getTime())) return null;
            const y = parsed.getFullYear();
            const mo = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            const h = String(parsed.getHours()).padStart(2, '0');
            const mi = String(parsed.getMinutes()).padStart(2, '0');
            return `${y}-${mo}-${d} ${h}:${mi}`;
        } catch { return null; }
    }

    // ── 한국어 형식: "2026년 1월 12일 월요일 오전/오후 6:08" ────────
    const koMatch = trimmed.match(
        /^(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일.*?(오전|오후)\s+(\d{1,2}):(\d{2})$/
    );
    if (koMatch) {
        const [, year, month, day, ampm, hourStr, minute] = koMatch;
        let h = parseInt(hourStr, 10);
        if (ampm === '오후' && h !== 12) h += 12;
        if (ampm === '오전' && h === 12) h = 0;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${String(h).padStart(2, '0')}:${minute}`;
    }

    return null;
};


// 홈 대시보드 고정 텍스트 한글 치환 맵
const TEXT_REPLACEMENTS: Record<string, string> = {
    'Welcome to your administration panel': '어드민 패널에 오신 것을 환영합니다',
};

const processNode = (node: Element) => {
    // ── 날짜 형식 변환 ──────────────────────────────────────────
    const candidates = node.querySelectorAll('td span, td p, td div, td');
    candidates.forEach((el) => {
        if (el.children.length === 0) {
            const text = el.textContent || '';
            const formatted = reformatDate(text);
            if (formatted) {
                el.textContent = formatted;
            }
        }
    });

    // ── 고정 텍스트 한글 치환 ────────────────────────────────────
    node.querySelectorAll('*').forEach((el) => {
        if (el.children.length === 0) {
            const text = el.textContent?.trim() ?? '';
            if (TEXT_REPLACEMENTS[text]) {
                el.textContent = TEXT_REPLACEMENTS[text];
            }
        }
    });
};

export default {
    config: {
        locales: ['ko']
    },
    register() {
        // CKEditor 툴바 툴팁 한글화
        // 공식 문서: setPluginConfig는 bootstrap 이전(register)에서 호출해야 함
        const koLanguage = { ui: 'ko', content: 'en' };
        setPluginConfig({
            presets: [
                {
                    ...defaultHtmlPreset,
                    editorConfig: {
                        ...defaultHtmlPreset.editorConfig,
                        language: koLanguage,
                    },
                },
                {
                    ...defaultMarkdownPreset,
                    editorConfig: {
                        ...defaultMarkdownPreset.editorConfig,
                        language: koLanguage,
                    },
                },
            ],
        });
    },
    bootstrap(app: StrapiApp) {
        // ─── 날짜 형식 자동 변환 ────────────────────────────────────
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processNode(node as Element);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // ─── FOUC 방지: 콘텐츠 영역 즉시 숨김 ──────────────────────────
        const style = document.createElement('style');
        style.textContent = `
            main[aria-labelledby="main-content-title"] > :nth-child(2) { opacity: 0; }
            main[aria-labelledby="main-content-title"] > :nth-child(2).layout-ready {
                opacity: 1;
                transition: opacity 0.15s ease;
            }
        `;
        document.head.appendChild(style);

        const getContentArea = () =>
            document.querySelector(
                'main[aria-labelledby="main-content-title"] > :nth-child(2)'
            ) as HTMLElement | null;

        // ─── 홈 페이지 DOM 조작 헬퍼 ─────────────────────────────────
        // 텍스트로 요소를 찾아 N단계 상위 조상의 스타일을 변경 (대소문자 무시)
        const findAncestor = (
            searchText: string,
            levels: number,
        ): HTMLElement | null => {
            const keyword = searchText.toLowerCase();
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
            );
            let node: Text | null;
            while ((node = walker.nextNode() as Text | null)) {
                if (node.textContent?.trim().toLowerCase() === keyword) {
                    let el: HTMLElement | null = node.parentElement;
                    for (let i = 1; i < levels && el; i++) {
                        el = el.parentElement;
                    }
                    return el ?? null;
                }
            }
            return null;
        };

        const applyHomeLayout = (): boolean => {
            let done = 0;

            // 1. "3 steps to get started" → 3단계 상위 숨기기
            const tour = findAncestor('3 steps to get started', 3);
            if (tour) { tour.style.display = 'none'; done++; }

            // 2. "Last published entries" → 3단계 상위 숨기기 (대소문자 무시)
            const published = findAncestor('last published entries', 3);
            if (published) { published.style.display = 'none'; done++; }

            // 3. "Last edited entries" → 5단계 상위 display:block + 텍스트 교체
            const editedEl = findAncestor('last edited entries', 1);
            if (editedEl) {
                editedEl.textContent = '최근 편집항목';
                const sectionContainer = findAncestor('최근 편집항목', 5);
                if (sectionContainer) {
                    sectionContainer.style.display = 'block';
                    // '최근 편집항목' 기준 2단계 상위 컨테이너의 하위 테이블 첫 열 span에 max-width 적용
                    const tableContainer = findAncestor('최근 편집항목', 2);
                    tableContainer
                        ?.querySelectorAll('table td:first-child span')
                        .forEach((span) => {
                            (span as HTMLElement).style.maxWidth = '40rem';
                        });
                }
                done++;
            }

            return done === 3;
        };

        const showContent = () => getContentArea()?.classList.add('layout-ready');
        const hideContent = () => getContentArea()?.classList.remove('layout-ready');


        let homeAttempts = 0;
        const tryApplyHomeLayout = () => {
            if (applyHomeLayout()) {
                showContent();
            } else if (homeAttempts < 30) {
                homeAttempts++;
                setTimeout(tryApplyHomeLayout, 300);
            } else {
                showContent(); // 타임아웃 시 강제 표시(무한 숨김 방지)
            }
        };

        // ─── SPA 라우팅 대응: 대시보드 홈 재진입 시 재실행 ────────────
        const isDashboardHome = (path: string) =>
            /\/dashboard\/?$/.test(path);

        const onNavigate = () => {
            if (isDashboardHome(window.location.pathname)) {
                hideContent();
                homeAttempts = 0;
                setTimeout(tryApplyHomeLayout, 500);
            }
        };

        const origPushState = history.pushState.bind(history);
        history.pushState = (...args) => {
            origPushState(...args);
            onNavigate();
        };
        window.addEventListener('popstate', onNavigate);

        setTimeout(tryApplyHomeLayout, 500);

    },
};
