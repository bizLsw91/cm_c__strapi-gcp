/**
 * @dev.w-strapi/strapi-provider-firebase-storage--custom
 *
 * [아키텍처 변경]
 * 이미지 리사이징·WebP 변환은 브라우저(Canvas API)에서 처리합니다.
 * 서버(이 파일)는 아래만 담당합니다:
 *   1. 파일 수신 (stream → buffer)
 *   2. 이미지: webp 포맷 검증 + 크기 검증
 *   3. Firebase Storage 업로드
 *
 * sharp 의존성이 완전히 제거되어 서버 컴퓨트 자원을 절약합니다.
 */

import * as admin from "firebase-admin";
import * as path from "path";
import { ReadStream } from "fs";
import type { ServiceAccount } from "firebase-admin";
import { Readable } from "stream";

/* ---------- 유틸리티 ---------- */
const streamToBuffer = (stream: Readable): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });

const isImageMime = (mime: string) => mime.startsWith("image/");

/* ---------- 파일 인터페이스 ---------- */
interface File {
    name: string;
    alternativeText?: string;
    caption?: string;
    width?: number;
    height?: number;
    formats?: Record<string, unknown>;
    hash: string;
    ext?: string;
    mime: string;
    size: number; // KB 기준
    url: string;
    previewUrl?: string;
    path?: string;
    provider?: string;
    provider_metadata?: Record<string, unknown>;
    stream?: ReadStream;
    buffer?: Buffer | null;
}

/* ---------- 플러그인 옵션 ---------- */
interface InitOptions {
    serviceAccount: string | ServiceAccount;
    bucket: string;
    sortInStorage?: boolean;
    debug?: boolean;
    defaultDirPath?: string;
    // 브라우저에서 이미 변환했으므로 sharp 관련 옵션은 제거됨
    // (하위 호환을 위해 타입만 남기고 무시)
    defaultQuality?: number;
    qualityDecrement?: number;
    minQuality?: number;
    maxFileSize?: number;
    resizeOptions?: object;
    /** 서버에서 허용할 WebP 최대 크기 (바이트). 기본값 3MB */
    maxServerFileSizeBytes?: number;
}

/* ---------- 메인 로직 ---------- */
module.exports = {
    init(config: InitOptions) {
        console.log('[upload-provider] 초기화 (브라우저 사이드 이미지 처리 모드)');

        /* [핵심] 업로드 작업을 순차적으로 처리하기 위한 큐 */
        let uploadQueue = Promise.resolve();

        /* ----- Firebase 초기화 ----- */
        if (!admin.apps.length) {
            let serviceAccount = config.serviceAccount;

            if (
                !serviceAccount ||
                (typeof serviceAccount === 'string' && serviceAccount.length === 0) ||
                (typeof serviceAccount === 'object' && Object.keys(serviceAccount).length === 0)
            ) {
                const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
                if (!base64ServiceAccount) {
                    throw new Error('<Upload Provider> Service Account not found.');
                }
                try {
                    const json = Buffer.from(base64ServiceAccount, 'base64').toString('utf8');
                    serviceAccount = JSON.parse(json);
                } catch (e) {
                    throw new Error('<Upload Provider> Invalid Firebase Service Account JSON.');
                }
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as ServiceAccount),
                storageBucket: config.bucket,
            });
        }

        const bucket = admin.storage().bucket();

        // 서버 측 파일 크기 상한 (브라우저 변환 후 기준, 기본 3 MB)
        const MAX_SERVER_BYTES = config.maxServerFileSizeBytes ?? 3 * 1024 * 1024;

        /* ----- 디버그 헬퍼 ----- */
        const print = (msg?: any, ...opt: any[]) => {
            if (config.debug) console.log(msg, ...opt);
        };

        /* ----- 폴더/경로 헬퍼 ----- */
        const getFileFolder = (fileName: string) => {
            const tagRgx = /thumbnail_|large_|small_|medium_/gi;
            const name = path.parse(fileName).name;
            return name.split(tagRgx).find((x) => !!x);
        };

        const mimeTypeFolderGenerator = (mime: string) => {
            const matches = mime.match(/image|video|pdf|font|javascript|html/gi);
            if (!matches?.length) return '';
            const s = matches[0].toLocaleLowerCase();
            return s[0].toUpperCase() + s.slice(1);
        };

        const getFileRef = (file: File) => {
            const fileName = `${file.hash}${file.ext}`;
            const basePath = mimeTypeFolderGenerator(file.mime);
            const folderName = getFileFolder(file.hash);
            const fullPath = `${basePath ? `${basePath}/` : ''}${folderName}/${fileName}`;
            print('FULL FILE PATH:', fullPath);
            return bucket.file(config.sortInStorage ? fullPath : fileName);
        };

        /* ---------- 처리 및 업로드 ---------- */
        const processAndUpload = async (file: File): Promise<void> => {
            console.log(`--⬆️ Upload Start <${file.name}> (${file.mime})`);

            // 1. 버퍼 확보
            let rawBuffer: Buffer | null = null;
            if (file.buffer) {
                rawBuffer = file.buffer;
            } else if (file.stream) {
                rawBuffer = await streamToBuffer(file.stream);
            } else {
                throw new Error('File stream/buffer missing');
            }

            // 2. 이미지 검증 (브라우저에서 이미 WebP 변환 완료 상태여야 함)
            if (isImageMime(file.mime)) {
                // 서버 크기 검증
                if (rawBuffer.length > MAX_SERVER_BYTES) {
                    throw new Error(
                        `[upload-provider] 이미지 크기(${(rawBuffer.length / 1024).toFixed(1)} KB)가 ` +
                        `허용 상한(${(MAX_SERVER_BYTES / 1024).toFixed(0)} KB)을 초과합니다.`
                    );
                }

                // 브라우저 변환 여부 경고 (WebP가 아닌 경우)
                if (file.mime !== 'image/webp') {
                    console.warn(
                        `[upload-provider] ⚠️ 이미지가 WebP가 아닙니다 (${file.mime}). ` +
                        `브라우저 인터셉터가 동작하지 않았습니다. 원본 파일로 업로드합니다.`
                    );
                }

                file.buffer = rawBuffer;
                file.size = rawBuffer.length / 1024;
                delete file.stream;
            } else {
                // 비이미지(PDF, 동영상 등)는 원본 그대로
                file.buffer = rawBuffer;
                file.size = rawBuffer.length / 1024;
                delete file.stream;
            }

            // 3. Firebase 업로드
            const fileRef = getFileRef(file);
            const fileURL = `https://storage.googleapis.com/${config.bucket}/${fileRef.name}`;

            await fileRef.save(file.buffer!, {
                public: true,
                contentType: file.mime,
                resumable: false, // 메모리 절약
            });

            file.url = fileURL;
            file.buffer = null; // GC 힌트
            print('✅ Uploaded:', file.name);
        };

        /* ---------- 업로드 큐 ---------- */
        const upload = (file: File): Promise<void> => {
            const previousJob = uploadQueue;
            const newJob = previousJob.then(() => processAndUpload(file));
            uploadQueue = newJob.catch((err) => {
                console.error(`Upload failed for ${file.name} (Continuing queue):`, err);
            });
            return newJob;
        };

        /* ---------- 삭제 ---------- */
        const deleteFile = async (file: File): Promise<void> => {
            try {
                const fileRef = getFileRef(file);
                const [exists] = await fileRef.exists();
                if (!exists) return;
                await fileRef.delete();
                print('Deleted:', file.name);
            } catch (err) {
                if (config.debug) console.error(err);
                throw err;
            }
        };

        /* ---------- 플러그인 API 반환 ---------- */
        return {
            upload: (file: File) => upload(file),
            uploadStream: (file: File) => upload(file),
            delete: (file: File) => deleteFile(file),
        };
    },
};
