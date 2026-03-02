import type { StrapiApp } from '@strapi/strapi/admin';
import { setPluginConfig, defaultHtmlPreset, defaultMarkdownPreset } from '@_sh/strapi-plugin-ckeditor';

/**
 * 날짜 문자열을 "yyyy-mm-dd HH:mm" 형식으로 변환
 * Strapi 어드민이 표시하는 날짜 형식: "Monday, January 12, 2026 at 6:08 PM"
 */
const reformatDate = (text: string): string | null => {
    const trimmed = text.trim();
    const match = trimmed.match(
        /^[A-Za-z]+,\s+([A-Za-z]+ \d{1,2}, \d{4})\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)$/
    );
    if (!match) return null;

    try {
        const parsed = new Date(`${match[1]} ${match[2]}`);
        if (isNaN(parsed.getTime())) return null;

        const y = parsed.getFullYear();
        const mo = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        const h = String(parsed.getHours()).padStart(2, '0');
        const mi = String(parsed.getMinutes()).padStart(2, '0');

        return `${y}-${mo}-${d} ${h}:${mi}`;
    } catch {
        return null;
    }
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

        // ─── CSS injection: span max-width 확장 ──────────────────────
        const style = document.createElement('style');
        style.textContent = `
            /* 테이블 첫 번째 열 span max-width 확장 */
            main[aria-labelledby="main-content-title"] > :nth-child(2) > :nth-child(1) > :nth-child(2) table td:first-child span {
                max-width: 40rem !important;
            }
        `;
        document.head.appendChild(style);

        // ─── 홈 페이지 DOM 조작 헬퍼 ─────────────────────────────────
        // 텍스트로 요소를 찾아 N단계 상위 조상의 스타일을 변경
        const findAncestor = (
            searchText: string,
            levels: number,
        ): HTMLElement | null => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
            );
            let node: Text | null;
            while ((node = walker.nextNode() as Text | null)) {
                if (node.textContent?.trim() === searchText) {
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

            // 2. "Last published entries" → 3단계 상위 숨기기
            const published = findAncestor('Last published entries', 3);
            if (published) { published.style.display = 'none'; done++; }

            // 3. "Last edited entries" → 4단계 상위 display:block + 텍스트 교체
            const editedEl = findAncestor('Last edited entries', 1);
            if (editedEl) {
                editedEl.textContent = '최근 편집항목';
                const ancestor = findAncestor('최근 편집항목', 5);
                if (ancestor) { ancestor.style.display = 'block'; }
                done++;
            }

            return done === 3;
        };

        let homeAttempts = 0;
        const tryApplyHomeLayout = () => {
            if (!applyHomeLayout() && homeAttempts < 30) {
                homeAttempts++;
                setTimeout(tryApplyHomeLayout, 300);
            }
        };
        setTimeout(tryApplyHomeLayout, 500);

    },
};
