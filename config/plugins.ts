import path from 'path';

// ✅ JSON.parse를 런타임에만 실행되도록 헬퍼 함수로 분리
const getFirebaseServiceAccount = (env) => {
    const raw = env('FIREBASE_SERVICE_ACCOUNT');
    if (!raw || raw === 'build-placeholder') {
        return {}; // 빌드 타임엔 빈 객체 반환 (파싱 에러 방지)
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT JSON 파싱 실패');
        return {};
    }
};

export default ({ env }) => ({
    'users-permissions': {
        config: {
            jwt: {
                expiresIn: '30d',
            },
            register: {
                allowedFields: [
                    "full_name",
                    "contact",
                    "today_login",
                    "login_ip",
                    "ip",
                    "nationality",
                    "lang",
                ],
            },
        },
    },
    email: {
        config: {
            provider: 'nodemailer',
            providerOptions: {
                host: env('SMTP_HOST', 'smtp.gmail.com'),
                port: env('SMTP_PORT', 587),
                auth: {
                    user: env('SMTP_USERNAME'),
                    pass: env('SMTP_PASSWORD'),
                },
            },
            settings: {
                defaultFrom: 'dev.lsw91@gmail.com',
                defaultReplyTo: 'dev.lsw91@gmail.com',
            },
        },
    },
    upload: {
        config: {
            provider: path.resolve(__dirname, '../src/providers/upload-firebase-custom'),
            providerOptions: {
                // ✅ 함수 호출로 변경 → import 시점에 실행 안됨
                serviceAccount: getFirebaseServiceAccount(env),
                bucket: env('FIREBASE_STORAGE_BUCKET'),
                sortInStorage: true,
                debug: false,
                directoryPaths: {
                    base: 'portfolio',
                    thumb: false,
                },
                // ✅ 개량 버전 이미지 변환 옵션
                maxFileSize: 800 * 1024, // 512KB (압축 목표치)
                resizeOptions: {
                    height: 900,         // 세로 900px 기준 리사이징
                },
                initialQuality: 80,      // 초기 품질
                qualityDecrement: 10,    // 압축 시 화질 감소폭
                minQuality: 10,          // 최소 보장 품질
                maxServerFileSizeBytes: 10 * 1024 * 1024, // 서버 수신 최대 허용 (10MB)
            },
        },
    },
});
