import type { StrapiApp } from '@strapi/strapi/admin';

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
        // dynamic import: 실패해도 나머지 app.tsx 코드에 영향 없음
        import('@_sh/strapi-plugin-ckeditor').then(({ setPluginConfig, defaultHtmlPreset, defaultMarkdownPreset }) => {
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
        }).catch((e) => {
            console.warn('[app.tsx] CKEditor 플러그인 설정 실패 (무시됨):', e);
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

        // ─── 각 작업 완료 여부를 독립적으로 추적 ─────────────────────
        let task1Done = false; // 작업1: 3 steps 패널 숨기기
        let task2Done = false; // 작업2: Last published entries 패널 숨기기
        let task3Done = false; // 작업3: editedEl 4번째 상위 부모 display:block
        let task4Done = false; // 작업4: Last edited entries 테이블 첫 열 넓히기

        const showContent = () => getContentArea()?.classList.add('layout-ready');
        const hideContent = () => getContentArea()?.classList.remove('layout-ready');

        // ─── 안전장치: 최대 1초 후 무조건 showContent ─────────────────
        let showContentTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleForceShow = () => {
            if (showContentTimer) clearTimeout(showContentTimer);
            showContentTimer = setTimeout(showContent, 1000);
        };

        // ─── 작업1, 2: 패널 숨기기 ────────────────────────────────────
        let layoutAttempts = 0;
        const applyPanelHide = () => {
            if (!task1Done) {
                const tour = findAncestor('3 steps to get started', 3);
                if (tour) { tour.style.display = 'none'; task1Done = true; }
            }
            if (!task2Done) {
                const published = findAncestor('last published entries', 3);
                if (published) { published.style.display = 'none'; task2Done = true; }
            }

            if (task1Done && task2Done) {
                showContent(); // 둘 다 완료 → 즉시 표시
                if (showContentTimer) clearTimeout(showContentTimer);
                return;
            }
            if (layoutAttempts < 40) {
                layoutAttempts++;
                setTimeout(applyPanelHide, 100);
            } else {
                showContent();
            }
        };

        // ─── 작업3: editedEl 4번째 상위 부모 display:block ────────────
        let task3Attempts = 0;
        const applyDisplayBlock = () => {
            if (task3Done) return;

            const editedEl = findAncestor('last edited entries', 1);
            if (editedEl) {
                // editedEl 텍스트 교체
                editedEl.textContent = '최근 편집항목';

                // editedEl 기준 4단계 상위 → display:block
                let ancestor: HTMLElement | null = editedEl;
                for (let i = 0; i < 4 && ancestor; i++) {
                    ancestor = ancestor.parentElement;
                }
                if (ancestor) {
                    ancestor.style.display = 'block';
                    task3Done = true;
                    return;
                }
            }

            if (task3Attempts < 40) {
                task3Attempts++;
                setTimeout(applyDisplayBlock, 200);
            }
        };

        // ─── 작업4: 테이블 첫 열 span 넓히기 (독립 루프) ─────────────
        let tableAttempts = 0;
        const applyTableWidth = () => {
            if (task4Done) return;

            const editedEl = findAncestor('최근 편집항목', 1)
                ?? findAncestor('last edited entries', 1);
            if (editedEl) {
                // editedEl의 부모의 부모의 2번째 자식에서 table 탐색
                const grandParent = editedEl.parentElement?.parentElement;
                const tableSection = grandParent?.children[1] as HTMLElement | undefined;
                const table = tableSection?.querySelector('table');
                if (table) {
                    table.querySelectorAll('td:first-child span').forEach((span) => {
                        (span as HTMLElement).style.maxWidth = '40rem';
                        (span as HTMLElement).style.minWidth = '40rem';
                        (span as HTMLElement).style.width = '40rem';
                        (span as HTMLElement).style.display = 'inline-block';
                    });
                    task4Done = true;
                    return;
                }
            }

            if (tableAttempts < 40) {
                tableAttempts++;
                setTimeout(applyTableWidth, 300);
            }
        };

        const tryApplyHomeLayout = () => {
            layoutAttempts = 0;
            task3Attempts = 0;
            tableAttempts = 0;
            scheduleForceShow(); // 1초 안전장치 시작
            applyPanelHide();
            applyDisplayBlock();
            applyTableWidth();
        };

        // ─── MutationObserver: DOM 변화 시 즉시 재시도 ────────────────
        let mutationThrottle: ReturnType<typeof setTimeout> | null = null;
        const domObserver = new MutationObserver(() => {
            if (!task1Done || !task2Done) {
                if (mutationThrottle) return;
                mutationThrottle = setTimeout(() => {
                    mutationThrottle = null;
                    applyPanelHide();
                }, 50);
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });

        // ─── SPA 라우팅 대응: 대시보드 홈 재진입 시 재실행 ────────────
        const isDashboardHome = (path: string) =>
            /\/dashboard\/?$/.test(path);

        const onNavigate = () => {
            if (isDashboardHome(window.location.pathname)) {
                hideContent();
                task1Done = false;
                task2Done = false;
                task3Done = false;
                task4Done = false;
                setTimeout(tryApplyHomeLayout, 100);
            }
        };

        const origPushState = history.pushState.bind(history);
        history.pushState = (...args) => {
            origPushState(...args);
            onNavigate();
        };
        window.addEventListener('popstate', onNavigate);

        setTimeout(tryApplyHomeLayout, 50);

    },
};
