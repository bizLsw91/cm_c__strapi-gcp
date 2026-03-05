/* ──────────────────────────────────────────────────────────────
   📸 브라우저 사이드 이미지 처리 (Canvas API → WebP 변환)
   이미지를 서버로 보내기 전에 브라우저에서 리사이징 + WebP 변환을 수행합니다.
   서버(Firebase Storage 프로바이더)는 검증 및 업로드만 담당합니다.
   ────────────────────────────────────────────────────────────── */
const WEBP_MAX_WIDTH = 1921;       // 최대 가로 픽셀 (초과 시 비율 유지하며 축소)
const WEBP_INIT_QUALITY = 0.85;       // 첫 인코딩 품질
const WEBP_QUALITY_STEP = 0.15;       // 크기 초과 시 품질 감소 단위
const WEBP_MIN_QUALITY = 0.40;       // 품질 하한선
const WEBP_MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB 상한
const WEBP_PROCESSED_FLAG = '__webp_converted__';

/**
 * Canvas API 를 이용해 이미지 File 을 WebP 로 리사이징·변환합니다.
 * 크기가 WEBP_MAX_BYTES 를 초과하면 품질을 단계적으로 낮춥니다.
 */
const convertImageToWebP = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // 1. 리사이징 계산
            let { width, height } = img;
            if (width > WEBP_MAX_WIDTH) {
                height = Math.round((height * WEBP_MAX_WIDTH) / width);
                width = WEBP_MAX_WIDTH;
            }

            // 2. Canvas 드로잉
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('[MediaWebP] Canvas 2D context 취득 실패'));
            ctx.drawImage(img, 0, 0, width, height);

            const baseName = file.name.replace(/\.[^.]+$/, '') + '.webp';

            // 3. 품질 단계적 인코딩
            const encode = (quality: number) => {
                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('[MediaWebP] toBlob 실패'));
                    const nextQ = +(quality - WEBP_QUALITY_STEP).toFixed(2);
                    if (blob.size > WEBP_MAX_BYTES && nextQ >= WEBP_MIN_QUALITY) {
                        encode(nextQ);
                    } else {
                        console.log(
                            `[MediaWebP] ${file.name} → ${baseName}`,
                            `Q=${quality.toFixed(2)}`,
                            `${(blob.size / 1024).toFixed(1)} KB`,
                        );
                        resolve(new File([blob], baseName, { type: 'image/webp' }));
                    }
                }, 'image/webp', quality);
            };
            encode(WEBP_INIT_QUALITY);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('[MediaWebP] 이미지 로드 실패'));
        };

        img.src = objectUrl;
    });

/** 업로드 변환 오버레이 표시/제거 */
const showConvertingOverlay = () => {
    const el = document.createElement('div');
    el.id = '__webp_overlay__';
    el.textContent = '이미지 변환 중…';
    el.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%',
        'transform:translate(-50%,-50%)',
        'background:rgba(0,0,0,.7)', 'color:#fff',
        'padding:12px 28px', 'border-radius:10px',
        'z-index:99999', 'font-size:14px', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
};
const hideConvertingOverlay = () =>
    document.getElementById('__webp_overlay__')?.remove();

/**
 * document 전체에서 <input type="file"> 의 change 이벤트를 캡처 페이즈에서
 * 가로채서 이미지 파일을 WebP 로 변환한 뒤 React 에 재전달합니다.
 */
export const setupUploadInterceptor = () => {
    document.addEventListener('change', async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.type !== 'file' || !input.files?.length) return;
        if ((input as any)[WEBP_PROCESSED_FLAG]) return; // 재진입 방지

        const files = Array.from(input.files);
        const hasImages = files.some((f) => f.type.startsWith('image/'));
        if (!hasImages) return; // 이미지 없으면 통과

        // React 이벤트 핸들러가 원본 이벤트를 보지 못하도록 차단
        e.stopImmediatePropagation();

        showConvertingOverlay();
        try {
            const converted = await Promise.all(
                files.map((f) =>
                    f.type.startsWith('image/') ? convertImageToWebP(f) : Promise.resolve(f),
                ),
            );

            const dt = new DataTransfer();
            converted.forEach((f) => dt.items.add(f));
            // input.files 를 변환된 WebP 파일로 교체
            Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
        } catch (err) {
            console.warn('[MediaWebP] 변환 실패, 원본 파일로 대체:', err);
            // 실패해도 원본 파일은 그대로 사용하도록 files 를 건드리지 않음
        } finally {
            hideConvertingOverlay();
            // 変換 후(또는 실패 후) React 에 change 이벤트 재전달
            (input as any)[WEBP_PROCESSED_FLAG] = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            delete (input as any)[WEBP_PROCESSED_FLAG];
        }
    }, true /* 캡처 페이즈: React 이전에 가로챔 */);
};
