import type { StrapiApp } from '@strapi/strapi/admin';
import { setupUploadInterceptor } from './utils/imageProcessor';
import { setupPdfValidation } from './utils/pdfValidator';
import { applyDashboardCustomizations } from './utils/dashboardModifier';
import MediaAutoFill from './extensions/MediaAutoFill';

export default {
    config: {
        locales: ['ko'],
        translations: {
            ko: {
                // ── 플러그인 이름 번역 (콘솔 에러 제거) ──
                'content-manager.plugin.name': '콘텐츠 관리자',
                'cloud.plugin.name': '배포',
                'upload.plugin.name': '미디어 라이브러리',
                'i18n.plugin.name': '다국어',
                'content-type-builder.plugin.name': '콘텐츠 타입 빌더',
                'users-permissions.plugin.name': '사용자 & 권한',
                // ── 콜렉션 & 싱글 타입 번역 (콘솔 에러 제거) ──
                '공지사항': '공지사항',
                '공지사항_영문': '공지사항_영문',
                '문의사항': '문의사항',
                '카테고리': '카테고리',
                '카테고리_영문': '카테고리_영문',
                '포트폴리오': '포트폴리오',
                '문서': '문서',
                // ── 필드 등 커스텀 번역 ──
                'content-manager.content-types.api::notice.notice.category_ko': '카테고리',
                'content-manager.content-types.api::notice.notice.title': '제목',
                'content-manager.content-types.api::notice.notice.author': '작성자',
                'content-manager.content-types.api::notice.notice.view_cnt': '조회수',
                'content-manager.content-types.api::notice.notice.createdAt': '작성일',
            },
        },
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
        console.log('[app.tsx] bootstrap 실행됨. URL:', window.location.pathname);

        // ── MISSING_TRANSLATION 콘솔 에러 강제 억제 ──
        // React Intl 라이브러리가 뱉어내는 에러 로그를 가로채서 숨깁니다.
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            // Error 객체 혹은 문자열 내에 MISSING_TRANSLATION 내용이 포함되어 있다면 무시
            if (args.some(arg =>
                (typeof arg === 'string' && arg.includes('MISSING_TRANSLATION')) ||
                (arg instanceof Error && arg.message.includes('MISSING_TRANSLATION')) ||
                (arg && typeof arg === 'object' && arg.stack?.includes('MISSING_TRANSLATION')) ||
                // ── React: `value` prop on `input` should not be null 경고 억제 ──
                (typeof arg === 'string' && arg.includes('`value` prop on `input` should not be null'))
            )) {
                return;
            }
            originalConsoleError.apply(console, args);
        };

        // 1. 대시보드 UI 및 날짜 형식 커스텀
        applyDashboardCustomizations();

        // 2. DOC 컬렉션 PDF 업로드 검증
        setupPdfValidation();
        console.log('[app.tsx] PDF 전용 업로드 검증 인터셉터 등록됨');

        // 3. addEditViewSidePanel 사용
        const apis = app.getPlugin('content-manager').apis as any;
        apis.addEditViewSidePanel([MediaAutoFill]);
        console.log('[app.tsx] MediaAutoFill 커스텀 컴포넌트 주입 완료');

        // 4. 업로드 진행률 오버레이 (XHR 인터셉터)
        // /api/upload 요청을 감지해 커스텀 진행률 오버레이를 표시합니다.
        // 서버에서 sharp 변환 + Firebase 업로드 중 Strapi UI가 0%에 고착되는 문제를 해결합니다.
        setupUploadInterceptor();
        console.log('[app.tsx] 업로드 진행률 XHR 인터셉터 등록됨');
    },
};
