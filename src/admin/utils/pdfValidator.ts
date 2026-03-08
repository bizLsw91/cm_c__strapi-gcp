/**
 * DOC 컬렉션 전용 PDF 업로드 검증 및 파일명 자동 주입
 * doc 컬렉션에서 파일 업로드 시 .pdf 확장자가 아니면 업로드를 차단하고,
 * PDF 파일인 경우 파일명을 PDF_FILE_NAME 필드에 자동으로 입력합니다.
 */
export const setupPdfValidation = () => {
    const handleFileAction = (files: File[]) => {
        const isDocCollection = window.location.pathname.includes('api::doc.doc');
        if (!isDocCollection) return true;

        if (files.length === 0) return true;

        const file = files[0];
        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        if (!isPdf) {
            alert('.pdf 형식만 업로드 가능합니다.');
            return false;
        }

        // PDF 파일명 자동 주입 (확장자 제외)
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        
        // Strapi Admin UI의 입력 필드를 찾아 값을 주입합니다.
        // 약간의 지연 시간을 주어 필드가 렌더링된 후 주입되도록 합니다.
        setTimeout(() => {
            const fileNameInput = document.querySelector('input[name="PDF_FILE_NAME"]') as HTMLInputElement;
            if (fileNameInput) {
                // 기존 값과 다를 때만 업데이트
                if (fileNameInput.value !== nameWithoutExt) {
                    fileNameInput.value = nameWithoutExt;
                    // React/Strapi의 상태 반영을 위해 input 이벤트를 강제로 발생시킵니다.
                    fileNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`[pdfValidator] PDF_FILE_NAME 필드에 "${nameWithoutExt}" 주입 완료`);
                }
            } else {
                console.warn('[pdfValidator] PDF_FILE_NAME 입력 필드를 찾을 수 없습니다.');
            }
        }, 500);

        return true;
    };

    // 1. 파일 선택창을 통한 업로드 (change 이벤트)
    document.addEventListener('change', (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.type !== 'file' || !input.files?.length) return;

        const files = Array.from(input.files);
        if (!handleFileAction(files)) {
            input.value = ''; // 입력값 초기화
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    // 2. 드래그 앤 드롭을 통한 업로드 (drop 이벤트)
    document.addEventListener('drop', (e: DragEvent) => {
        if (!e.dataTransfer?.files?.length) return;

        const files = Array.from(e.dataTransfer.files);
        if (!handleFileAction(files)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
};
