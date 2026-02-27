export default ({ env }) => ({
    // ...
    'users-permissions': {
        config: {
            jwt: {
                expiresIn: '30d',
            },
            register: {
                allowedFields: [ // ✅ 커스텀 필드 추가
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
            provider: '@dev.w-strapi/sharp-lsw-provider-firebase-storage',
            providerOptions: {
                serviceAccount: JSON.parse(env('FIREBASE_SERVICE_ACCOUNT')), // Firebase 서비스 계정
                bucket: env('FIREBASE_STORAGE_BUCKET'),
                sortInStorage: true, // 폴더 구조 자동 정렬
                debug: false,
                directoryPaths: {
                    base: 'portfolio',
                    thumb: false
                }
            }
        }
    }
    // ...
});
