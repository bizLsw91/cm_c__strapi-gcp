/**
 * DOC 컬렉션 전용 PDF 업로드 검증
 * doc 컬렉션에서 파일 업로드 시 .pdf 확장자가 아니면 업로드를 차단하고 알림을 표시합니다.
 */
export const setupPdfValidation = () => {
    // 1. 파일 선택창을 통한 업로드 (change 이벤트)
    document.addEventListener('change', (e: Event) => {
        const isDocCollection = window.location.pathname.includes('api::doc.doc');
        if (!isDocCollection) return;

        const input = e.target as HTMLInputElement;
        if (input.type !== 'file' || !input.files?.length) return;

        const files = Array.from(input.files);
        const hasNonPdf = files.some((f) => !f.name.toLowerCase().endsWith('.pdf'));

        if (hasNonPdf) {
            alert('.pdf 형식만 업로드 가능합니다.');
            input.value = ''; // 입력값 초기화
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    // 2. 드래그 앤 드롭을 통한 업로드 (drop 이벤트)
    document.addEventListener('drop', (e: DragEvent) => {
        const isDocCollection = window.location.pathname.includes('api::doc.doc');
        if (!isDocCollection) return;

        if (!e.dataTransfer?.files?.length) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const hasNonPdf = files.some((f) => !f.name.toLowerCase().endsWith('.pdf'));

        if (hasNonPdf) {
            alert('.pdf 형식만 업로드 가능합니다.');
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
};
