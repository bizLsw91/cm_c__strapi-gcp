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
                serviceAccount: getFirebaseServiceAccount(env),
                bucket: env('FIREBASE_STORAGE_BUCKET'),
                sortInStorage: true,
                debug: false,
                maxServerFileSizeBytes: 50 * 1024 * 1024, // 서버 수신 최대 허용 (50MB)
            },
        },
    },
});
