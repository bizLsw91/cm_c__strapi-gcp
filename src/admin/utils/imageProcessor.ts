/* ──────────────────────────────────────────────────────────────
   📸 브라우저 사이드 이미지 처리 (Canvas API → WebP 변환)
   업로드 전 브라우저에서 리사이징 + WebP 변환을 수행합니다.
   ────────────────────────────────────────────────────────────── */

const WEBP_MAX_WIDTH = 1921;
const WEBP_INIT_QUALITY = 0.80;       // 서버 설정(80)과 동기화
const WEBP_QUALITY_STEP = 0.10;
const WEBP_MIN_QUALITY = 0.30;
const WEBP_MAX_BYTES = 300 * 1024;
const WEBP_PROCESSED_FLAG = '__webp_converted__';

/**
 * Canvas API 를 이용해 이미지 File 을 WebP 로 리사이징·변환합니다.
 */
const convertImageToWebP = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let { width, height } = img;
            if (width > WEBP_MAX_WIDTH) {
                height = Math.round((height * WEBP_MAX_WIDTH) / width);
                width = WEBP_MAX_WIDTH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('[MediaWebP] Canvas 2D context 취득 실패'));
            ctx.drawImage(img, 0, 0, width, height);

            const baseName = file.name.replace(/\.[^.]+$/, '') + '.webp';

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

/* ──────── 변환 중 오버레이 ──────── */
const showConvertingOverlay = () => {
    if (document.getElementById('__webp_overlay__')) return;

    const backdrop = document.createElement('div');
    backdrop.id = '__webp_overlay__';
    backdrop.style.cssText = [
        'position:fixed', 'inset:0',
        'background:rgba(0,0,0,0.6)',
        'z-index:99999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'pointer-events:none',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
        'background:#1a1a2e',
        'border:1px solid rgba(255,255,255,0.12)',
        'border-radius:14px',
        'padding:28px 36px',
        'min-width:240px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
        'text-align:center',
        'font-family:system-ui,sans-serif',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = '이미지 변환 중…';
    title.style.cssText = 'color:#fff;font-size:15px;font-weight:600;margin-bottom:18px;';

    const barBg = document.createElement('div');
    barBg.style.cssText = [
        'width:100%', 'height:6px',
        'background:rgba(255,255,255,0.12)',
        'border-radius:99px',
        'overflow:hidden',
        'margin-bottom:12px',
    ].join(';');

    // 애니메이션 바 (CSS animation)
    const bar = document.createElement('div');
    bar.id = '__webp_overlay_bar__';
    bar.style.cssText = [
        'height:100%', 'width:0%',
        'background:linear-gradient(90deg,#6366f1,#a855f7)',
        'border-radius:99px',
        'transition:width 0.3s ease',
    ].join(';');
    barBg.appendChild(bar);

    const pct = document.createElement('span');
    pct.id = '__webp_overlay_pct__';
    pct.textContent = '0%';
    pct.style.cssText = 'color:rgba(255,255,255,0.6);font-size:13px;';

    const sub = document.createElement('div');
    sub.textContent = 'WebP 포맷으로 최적화하는 중…';
    sub.style.cssText = 'color:rgba(255,255,255,0.35);font-size:11px;margin-top:6px;';

    card.append(title, barBg, pct, sub);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // 간단한 fake 진행바 (변환 중 시각적 피드백용)
    let v = 0;
    const timer = setInterval(() => {
        v = v < 85 ? v + (85 - v) * 0.04 : v;
        const el = document.getElementById('__webp_overlay_bar__');
        const pt = document.getElementById('__webp_overlay_pct__');
        if (el) el.style.width = `${v.toFixed(1)}%`;
        if (pt) pt.textContent = `${Math.round(v)}%`;
    }, 100);
    (backdrop as any).__timer__ = timer;
};

const hideConvertingOverlay = () => {
    const el = document.getElementById('__webp_overlay__');
    if (!el) return;
    clearInterval((el as any).__timer__);
    el.remove();
};

/* ──────── 공통 파일 처리기 ──────── */
const processFiles = async (
    files: File[],
    eventToStop: Event,
    reDispatchFn: (dt: DataTransfer) => void
) => {
    const hasImages = files.some((f) => f.type.startsWith('image/'));
    if (!hasImages) return;

    eventToStop.stopImmediatePropagation();
    eventToStop.preventDefault();

    showConvertingOverlay();
    try {
        const converted = await Promise.all(
            files.map((f) =>
                f.type.startsWith('image/') ? convertImageToWebP(f) : Promise.resolve(f),
            ),
        );
        console.log('[MediaWebP] ✨ WebP 변환 성공!', converted.map(f => f.name));
        const dt = new DataTransfer();
        converted.forEach((f) => dt.items.add(f));
        reDispatchFn(dt);
    } catch (err) {
        console.warn('[MediaWebP] ❌ 변환 실패, 원본으로 대체:', err);
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        reDispatchFn(dt);
    } finally {
        hideConvertingOverlay();
    }
};

/* ──────── 이벤트 인터셉터 ──────── */
export const setupUploadInterceptor = () => {
    // 1. INPUT change
    document.addEventListener('change', async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.type !== 'file' || !input.files?.length) return;
        if ((input as any)[WEBP_PROCESSED_FLAG]) return;

        console.log('[MediaWebP] 파일 선택 (INPUT) 감지');
        const files = Array.from(input.files);
        await processFiles(files, e, (newDt) => {
            Object.defineProperty(input, 'files', { value: newDt.files, configurable: true });
            (input as any)[WEBP_PROCESSED_FLAG] = true;
            input.dispatchEvent(new Event('change', { bubbles: e.bubbles }));
            delete (input as any)[WEBP_PROCESSED_FLAG];
        });
    }, true);

    // 2. DROP
    document.addEventListener('drop', async (e: DragEvent) => {
        if (!e.dataTransfer?.files?.length) return;
        if ((e as any)[WEBP_PROCESSED_FLAG]) return;

        console.log('[MediaWebP] 🖱️ DROP 감지');
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files, e, (newDt) => {
            const dropEvent = new DragEvent('drop', {
                bubbles: e.bubbles,
                cancelable: e.cancelable,
                clientX: e.clientX,
                clientY: e.clientY,
                dataTransfer: new DataTransfer(),
            });
            Object.defineProperty(dropEvent, 'dataTransfer', {
                value: { files: newDt.files, items: newDt.items, types: newDt.types },
            });
            (dropEvent as any)[WEBP_PROCESSED_FLAG] = true;
            e.target?.dispatchEvent(dropEvent);
        });
    }, true);

    // 3. PASTE
    document.addEventListener('paste', async (e: ClipboardEvent) => {
        if (!e.clipboardData?.files?.length) return;
        if ((e as any)[WEBP_PROCESSED_FLAG]) return;

        const files = Array.from(e.clipboardData.files);
        await processFiles(files, e, (newDt) => {
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: e.bubbles,
                cancelable: e.cancelable,
                clipboardData: new DataTransfer(),
            });
            Object.defineProperty(pasteEvent, 'clipboardData', {
                value: { files: newDt.files, items: newDt.items, types: newDt.types },
            });
            (pasteEvent as any)[WEBP_PROCESSED_FLAG] = true;
            e.target?.dispatchEvent(pasteEvent);
        });
    }, true);
};
