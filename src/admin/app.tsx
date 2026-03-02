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
    'Last edited entries': '최근 편집 항목',
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
        locales: ['ko'],
        // translations: {
        //     en: {
        //         // ─── 공통 버튼 ───────────────────────────────────────────────
        //         'global.back': '뒤로',
        //         'global.cancel': '취소',
        //         'global.save': '저장',
        //         'global.delete': '삭제',
        //         'global.delete-target': '{target} 삭제',
        //         'global.close': '닫기',
        //         'global.search': '검색',
        //         'global.select': '선택',
        //         'global.select-all-entries': '모두 선택',
        //         'global.new': '새로 만들기',
        //         'global.error': '오류가 발생했습니다',
        //         'global.prompt.unsaved': '이 페이지를 떠나시겠습니까? 변경 사항이 저장되지 않습니다.',
        //
        //         'app.components.Button.cancel': '취소',
        //         'app.components.Button.confirm': '확인',
        //         'app.components.Button.reset': '초기화',
        //
        //         // ─── 확인 다이얼로그 ─────────────────────────────────────────
        //         'app.components.ConfirmDialog.title': '확인',
        //         'app.confirm.body': '계속하시겠습니까?',
        //         'components.popUpWarning.button.cancel': '아니오, 취소',
        //         'components.popUpWarning.button.confirm': '예, 확인',
        //         'components.popUpWarning.message': '삭제하시겠습니까?',
        //         'components.popUpWarning.title': '확인 필요',
        //
        //         // ─── 필터 ────────────────────────────────────────────────────
        //         'app.utils.filters': '필터',
        //         'app.utils.add-filter': '필터 추가',
        //         'app.utils.filter-value': '필터 값',
        //         'app.utils.select-filter': '필터 선택',
        //         'app.utils.select-field': '필드 선택',
        //         'components.AddFilterCTA.add': '필터',
        //         'components.AddFilterCTA.hide': '필터',
        //         'components.FiltersPickWrapper.PluginHeader.title.filter': '필터',
        //         'components.FiltersPickWrapper.PluginHeader.actions.apply': '적용',
        //         'components.FiltersPickWrapper.PluginHeader.actions.clearAll': '전체 초기화',
        //         'components.FiltersPickWrapper.PluginHeader.description': '항목을 필터링할 조건을 설정하세요',
        //         'components.FiltersPickWrapper.hide': '숨기기',
        //         'components.InputSelect.option.placeholder': '선택하세요',
        //         'components.Search.placeholder': '항목 검색...',
        //         'components.Filters.usersSelect.label': '사용자 검색 및 선택',
        //
        //         // ─── 필터 연산자 ─────────────────────────────────────────────
        //         'components.FilterOptions.FILTER_TYPES.$eq': '같음',
        //         'components.FilterOptions.FILTER_TYPES.$eqi': '같음 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$ne': '같지 않음',
        //         'components.FilterOptions.FILTER_TYPES.$nei': '같지 않음 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$contains': '포함',
        //         'components.FilterOptions.FILTER_TYPES.$containsi': '포함 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$notContains': '포함하지 않음',
        //         'components.FilterOptions.FILTER_TYPES.$notContainsi': '포함하지 않음 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$startsWith': '시작하는',
        //         'components.FilterOptions.FILTER_TYPES.$startsWithi': '시작하는 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$endsWith': '끝나는',
        //         'components.FilterOptions.FILTER_TYPES.$endsWithi': '끝나는 (대소문자 무시)',
        //         'components.FilterOptions.FILTER_TYPES.$null': '값 없음',
        //         'components.FilterOptions.FILTER_TYPES.$notNull': '값 있음',
        //         'components.FilterOptions.FILTER_TYPES.$gt': '보다 큰',
        //         'components.FilterOptions.FILTER_TYPES.$gte': '이상',
        //         'components.FilterOptions.FILTER_TYPES.$lt': '보다 작은',
        //         'components.FilterOptions.FILTER_TYPES.$lte': '이하',
        //
        //         // ─── 콘텐츠 목록 표시 (content-manager.*) ────────────────────────
        //         'content-manager.HeaderLayout.button.label-add-entry': '새 항목 만들기',
        //         'content-manager.pages.ListView.header-subtitle':
        //             '{number, plural, =0 {# 개 항목} one {# 개 항목} other {# 개 항목}} 찾음',
        //         'content-manager.containers.list.items':
        //             '{number} {number, plural, =0 {개} one {개} other {개}} 항목',
        //         'content-manager.components.LimitSelect.itemsPerPage': '페이지당 항목 수',
        //         'content-manager.form.Input.pageEntries': '페이지당 항목 수',
        //         'components.PageFooter.select': '페이지당 항목 수',
        //         'content-manager.containers.List.draft': '초안',
        //         'content-manager.containers.List.published': '게시됨',
        //         'content-manager.containers.List.modified': '수정됨',
        //         'content-manager.containers.list.table.row-actions': '행 작업',
        //         'content-manager.components.Search.placeholder': '항목 검색...',
        //         'content-manager.components.Filters.usersSelect.label': '사용자 검색 및 선택',
        //         'content-manager.containers.list.displayedFields': '표시 필드',
        //         'content-manager.select.currently.selected': '{count}개 선택됨',
        //
        //         // ─── 필터 (content-manager.*) ────────────────────────────────
        //         'content-manager.components.AddFilterCTA.add': '필터',
        //         'content-manager.components.AddFilterCTA.hide': '필터',
        //         'content-manager.components.FiltersPickWrapper.PluginHeader.title.filter': '필터',
        //         'content-manager.components.FiltersPickWrapper.PluginHeader.actions.apply': '적용',
        //         'content-manager.components.FiltersPickWrapper.PluginHeader.actions.clearAll': '전체 초기화',
        //         'content-manager.components.FiltersPickWrapper.PluginHeader.description': '항목을 필터링할 조건을 설정하세요',
        //         'content-manager.components.FiltersPickWrapper.hide': '숨기기',
        //
        //         // ─── 항목 삭제 (content-manager.*) ──────────────────────────
        //         'content-manager.actions.delete.label':
        //             '항목 삭제{isLocalized, select, true { (모든 언어)} other {}}',
        //         'content-manager.actions.delete.dialog.body': '이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        //         'content-manager.actions.delete.error': '항목 삭제 중 오류가 발생했습니다.',
        //         'content-manager.components.TableDelete.delete': '모두 삭제',
        //         'content-manager.components.TableDelete.deleteSelected': '선택 삭제',
        //         'content-manager.components.TableDelete.label':
        //             '{number, plural, one {# 개 항목} other {# 개 항목}} 선택됨',
        //         'content-manager.popUpWarning.bodyMessage.contentType.delete': '이 컨텐츠 타입을 삭제하시겠습니까?',
        //         'content-manager.popUpWarning.bodyMessage.contentType.delete.all': '선택한 항목들을 삭제하시겠습니까?',
        //         'content-manager.popUpWarning.bodyMessage.contentType.publish.all': '선택한 항목들을 게시하시겠습니까?',
        //         'content-manager.popUpWarning.bodyMessage.contentType.unpublish.all': '선택한 항목들의 게시를 취소하시겠습니까?',
        //
        //         // ─── 항목 게시 / 게시 취소 (content-manager.*) ──────────────
        //         'app.utils.publish': '게시',
        //         'app.utils.unpublish': '게시 취소',
        //         'app.utils.published': '게시됨',
        //         'app.utils.ready-to-publish': '게시 준비됨',
        //         'app.utils.already-published': '이미 게시됨',
        //         'app.utils.ready-to-publish-changes': '변경 사항 게시 준비됨',
        //         'app.utils.ready-to-unpublish-changes': '게시 취소 준비됨',
        //         'content-manager.actions.unpublish.dialog.body': '게시를 취소하시겠습니까?',
        //         'content-manager.actions.unpublish.dialog.option.keep-draft': '게시 취소 후 초안 유지',
        //         'content-manager.actions.unpublish.dialog.option.replace-draft': '게시 취소 후 초안 교체',
        //         'content-manager.popUpWarning.warning.publish-question': '그래도 게시하시겠습니까?',
        //         'content-manager.popUpWarning.warning.unpublish': '이 콘텐츠를 게시하지 않으면 초안으로 전환됩니다.',
        //
        //         // ─── 항목 편집 표시 (content-manager.*) ───────────────────────
        //         'content-manager.containers.edit.title.new': '새 항목 만들기',
        //         'content-manager.containers.edit.header.more-actions': '더 보기',
        //         'content-manager.containers.edit.panels.default.more-actions': '더 보기',
        //         'content-manager.containers.edit.tabs.draft': '초안',
        //         'content-manager.containers.edit.tabs.published': '게시됨',
        //         'content-manager.containers.edit.information.last-published.label': '게시됨',
        //         'content-manager.containers.edit.information.last-draft.label': '수정됨',
        //         'content-manager.containers.edit.information.document.label': '생성됨',
        //         'content-manager.containers.Edit.delete': '삭제',
        //         'content-manager.containers.EditView.add.new-entry': '항목 추가',
        //         'content-manager.containers.edit.panels.default.title': '항목',
        //         'content-manager.containers.untitled': '제목 없음',
        //         'content-manager.containers.EditView.notification.errors': '양식에 오류가 있습니다',
        //
        //         // ─── 변경 사항 취소 (content-manager.*) ─────────────────────
        //         'content-manager.actions.discard.label': '변경 사항 취소',
        //         'content-manager.actions.discard.dialog.body': '변경 사항을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        //
        //         // ─── 복제 (content-manager.*) ───────────────────────────────
        //         'content-manager.actions.clone.label': '복제',
        //         'content-manager.containers.list.autoCloneModal.header': '복제',
        //         'content-manager.containers.list.autoCloneModal.title': '이 항목은 바로 복제할 수 없습니다.',
        //         'content-manager.containers.list.autoCloneModal.description': '동일한 내용으로 새 항목이 생성되지만, 다음 필드를 변경해야 저장할 수 있습니다.',
        //         'content-manager.containers.list.autoCloneModal.create': '생성',
        //
        //         // ─── 성공/오류 알림 (content-manager.*) ─────────────────────
        //         'content-manager.success.record.save': '저장되었습니다',
        //         'content-manager.success.record.delete': '삭제되었습니다',
        //         'content-manager.success.record.publish': '게시되었습니다',
        //         'content-manager.success.record.unpublish': '게시가 취소되었습니다',
        //         'content-manager.success.record.clone': '복제되었습니다',
        //         'content-manager.success.record.discard': '변경 사항이 취소되었습니다',
        //         'content-manager.success.records.delete': '성공적으로 삭제되었습니다.',
        //         'content-manager.success.records.publish': '성공적으로 게시되었습니다.',
        //         'content-manager.success.records.unpublish': '성공적으로 게시 취소되었습니다.',
        //         'notification.success.delete': '항목이 삭제되었습니다',
        //         'notification.success.saved': '저장되었습니다',
        //         'notification.form.success.fields': '변경 사항이 저장되었습니다',
        //
        //         // ─── 오류 알림 ───────────────────────────────────────────────
        //         'notification.error': '오류가 발생했습니다',
        //         'notification.form.error.fields': '양식에 오류가 있습니다',
        //
        //         // ─── 관계(Relation) (content-manager.*) ─────────────────────
        //         'content-manager.relation.add': '관계 추가',
        //         'content-manager.relation.disconnect': '제거',
        //         'content-manager.relation.loadMore': '더 보기',
        //         'content-manager.relation.notAvailable': '이용 가능한 관계 없음',
        //         'content-manager.relation.publicationState.draft': '초안',
        //         'content-manager.relation.publicationState.published': '게시됨',
        //
        //         // ─── 빈 상태 (content-manager.*) ────────────────────────────
        //         'content-manager.components.TableEmpty.withFilters': '적용된 필터에 해당하는 {contentType}이(가) 없습니다...',
        //         'content-manager.components.TableEmpty.withSearch': '검색({search})에 해당하는 {contentType}이(가) 없습니다...',
        //         'content-manager.components.TableEmpty.withoutFilter': '{contentType}이(가) 없습니다...',
        //         'content-manager.components.empty-repeatable': '항목이 없습니다. 클릭하여 추가하세요.',
        //         'app.components.EmptyStateLayout.content-document': '콘텐츠 없음',
        //         'app.components.EmptyStateLayout.content-permissions': '해당 콘텐츠에 접근 권한이 없습니다',
        //
        //         // ─── 페이지네이션 ────────────────────────────────────────────
        //         'components.pagination.go-to': '{page} 페이지로 이동',
        //         'components.pagination.go-to-next': '다음 페이지',
        //         'components.pagination.go-to-previous': '이전 페이지',
        //
        //         // ─── 기타 공통 ───────────────────────────────────────────────
        //         'app.utils.delete': '삭제',
        //         'app.utils.edit': '수정',
        //         'app.utils.duplicate': '복제',
        //         'app.utils.refresh': '새로 고침',
        //         'app.utils.close-label': '닫기',
        //         'app.utils.select-all': '모두 선택',
        //         'containers.list.displayedFields': '표시 필드',
        //         'select.currently.selected': '{count}개 선택됨',
        //
        //         // ─── 모델/레이아웃 수정 링크 ─────────────────────────────────
        //         'content-manager.link-to-ctb': '모델 수정',
        //         'content-manager.edit-settings-view.link-to-ctb.content-types': '콘텐츠 타입 수정',
        //         'content-manager.edit-settings-view.link-to-ctb.components': '컴포넌트 수정',
        //
        //         // ─── 정보 패널 작성자/시간 (content-manager.*) ──────────────
        //         'content-manager.containers.edit.information.last-draft.value':
        //             '{time}{isAnonymous, select, true {} other { by {author}}}',
        //         'content-manager.containers.edit.information.last-published.value':
        //             '{time}{isAnonymous, select, true {} other { by {author}}}',
        //         'content-manager.containers.edit.information.document.value':
        //             '{time}{isAnonymous, select, true {} other { by {author}}}',
        //
        //         // ─── 표시 설정 버튼 ────────────────────────────────────────────
        //         'app.links.configure-view': '표시 설정',
        //
        //         // ─── 표시 설정 페이지 (content-manager.*) ─────────────────────
        //         'content-manager.components.SettingsViewWrapper.pluginHeader.title': '표시 설정 — {name}',
        //         'content-manager.components.SettingsViewWrapper.pluginHeader.description.list-settings': '목록 표시 설정을 정의합니다.',
        //         'content-manager.components.SettingsViewWrapper.pluginHeader.description.edit-settings': '편집 표시 레이아웃을 커스터마이징합니다.',
        //         'content-manager.containers.SettingPage.settings': '설정',
        //         'content-manager.containers.SettingPage.view': '표시',
        //         'content-manager.containers.SettingPage.layout': '레이아웃',
        //         'content-manager.containers.SettingPage.listSettings.title': '목록 표시 (설정)',
        //         'content-manager.containers.SettingPage.listSettings.description': '이 컬렉션 타입의 옵션을 설정합니다',
        //         'content-manager.containers.SettingPage.editSettings.title': '편집 표시 (설정)',
        //         'content-manager.containers.SettingPage.pluginHeaderDescription': '이 컬렉션 타입의 특정 설정을 구성합니다',
        //         'content-manager.containers.SettingPage.attributes': '속성 필드',
        //         'content-manager.containers.SettingPage.relations': '관련 필드',
        //
        //         // ─── 설정 폼 입력 (content-manager.*) ───────────────────────
        //         'content-manager.form.Input.search': '검색 활성화',
        //         'content-manager.form.Input.filters': '필터 활성화',
        //         'content-manager.form.Input.bulkActions': '일괄 작업 활성화',
        //         'content-manager.form.Input.defaultSort': '기본 정렬 속성',
        //         'content-manager.form.Input.sort.order': '기본 정렬 순서',
        //         'content-manager.form.Input.sort.field': '이 필드에서 정렬 활성화',
        //         'content-manager.form.Input.pageEntries.inputDescription': '컬렉션 타입 설정 페이지에서 이 값을 재정의할 수 있습니다.',
        //     },
        // },
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

        // ─── 홈 대시보드 불필요 섹션 숨기기 (CSS injection) ──────────
        const style = document.createElement('style');
        style.textContent = `
            /* 1. "3 steps to get started" 섹션 숨기기
                 main > 2번째자식 > 첫번째자식 > 첫번째자식 (클래스 불필요, 구조 기반) */
            main[aria-labelledby="main-content-title"] > :nth-child(2) > :first-child > :first-child {
                display: none !important;
            }

            /* 2. "Last published entries" 패널 래퍼(두 번째 형제) 숨기기 */
            main[aria-labelledby="main-content-title"] > :nth-child(2) > :nth-child(1) > :nth-child(2) > :nth-child(2) {
                display: none !important;
            }

            /* 3. "Last edited entries" 패널을 전체 너비로 확장 (부모가 grid) */
            main[aria-labelledby="main-content-title"] > :nth-child(2) > :nth-child(1) > :nth-child(2) {
                display: block;
            }

            /* 4. 테이블 첫 번째 열 span max-width 확장 */
            main[aria-labelledby="main-content-title"] > :nth-child(2) > :nth-child(1) > :nth-child(2) table td:first-child span {
                max-width: 40rem !important;
            }
        `;
        document.head.appendChild(style);

    },
};
