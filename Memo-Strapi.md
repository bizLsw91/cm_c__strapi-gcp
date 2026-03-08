# 🚀 Strapi 프로젝트 배포 정보

## 📋 프로젝트 개요

| 항목 | 내용                                   |
|------|--------------------------------------|
| 프로젝트명 | `cm_c__strapi-gcp`                  |
| Strapi 버전 | `v5.9.0`                             |
| Node.js 버전 | `v20.20.0`                           |
| npm 버전 | `v11.1.0`                           |
| 최초 배포일 | `2026-02-27`                         |

---

## 🌐 배포 환경

| 항목         | 내용                                      |
|------------|-----------------------------------------|
| 배포 플랫폼     | `GCP`                                   |
| 서버 리전      | `us-west1-b (미국서부 오리건)`             |
| 외부 접속 IP | `http://136.109.215.204:1337`           |
| 관리자 패널 URL | `https://admin.culturemarketing.co.kr/` |
| 배포 방식      | `Docker + Github Action`                |

---

## 🛠️ 개발용 외부 노출 (BE:dev)

`BE:dev`는 로컬 개발 서버(`BE:local`)를 `cloudflared` 터널을 사용하여 임시로 외부로 노출하는 방식입니다.

### 🏃 실행 단계

1. **로컬 서버 구동**: `npm run dev` 등을 통해 로컬에서 서비스를 실행합니다.
2. **터널 생성**: 터미널(cmd)에서 아래 명령어를 실행합니다.
   ```bash
   cloudflared tunnel --url http://localhost:1338
   ```
3. **URL 생성 확인**: 실행 결과로 생성된 `https://*.trycloudflare.com` 형태의 임시 URL을 복사합니다.

### 🔧 적용 및 설정

생성된 임시 URL이 정상 작동하려면 아래 항목들에 해당 URL을 적용해야 합니다.

1. **FE:dev (프론트엔드)**: `Strapi-API-URL` 설정에 새 URL 적용.
2. **Firebase Cloud Shell**: `cors.json` 파일의 `origin` 목록에 새 URL 추가 후 적용 (`gsutil cors set ...`).
3. **BE .env**: 백엔드 로컬 `.env` 파일의 `URL` 변수에 새 URL 적용.

---

## 💻 컴퓨팅 자원 (서버)

| 항목              | 내용                       |
|-----------------|--------------------------|
| 인스턴스 유형         | `e2-micro`               |
| vCPU            | `0.25vCpu (공유) 2 Core`   |
| 메모리 (RAM)       | `1 GB`                   |
| 스토리지            | `20 GB 표준디스크`            |
| OS              | `Ubuntu 22.04 LTS`       |
| 프로세스 매니저  | `Docker`                 |
| Swap            | `2GB`                    |
| 마이그레이션      | `AWS EC2 -> GCP Compute` |

---

## 🗄️ 데이터베이스

| 항목       | 내용                                     |
|----------|----------------------------------------|
| DB 서비스   | `Aiven 무료티어`                           |
| DB 종류    | `MySQL`                                |
| DB 버전    | `8.0.45`                               |
| DB Method | `Session pooler`                       |
| 호스팅 위치   | `Digital Ocean`                        |
| 리전       | `미국 캘리포니아주 샌프란시스코 및 인근 산타클라라(실리콘밸리)` |
| DB 인스턴스  | `Free-1-1gb`                           |
| 메모리/스토리지 | `1 GB / 1 GB`                          |
| 백업 주기    | `1일`                                   |
| 마이그레이션   | `AWS RDS: mysql -> Aiven: mysql` |
| --참고     | `DB-Migration-Guide(결론적).md`           |
| 저장되는 내용 | `Strapi 대시보드의 메타데이터와 대시보드에서 작성한 데이터 (이미지는 Firebase Storage 저장하고 url 받아와서 Aiven DB에 저장)` |

---

## 🗂️ 이미지 파일 스토리지

| 항목 | 내용                                 |
|------|------------------------------------|
| 스토리지 서비스 | `Firebase Storage` |
| 리전 | `asia-northeast3 (서울)` |
| PROD 버킷 | `store-892ea.firebasestorage.app`  |
| DEV 버킷 | `store-892ea-firebasestorage-app-dev (PROD 260305 5PM 복제 버전)` |
| CDN 연동 | `없음` |

### 🛠️ Firebase Storage 필수 설정 (중요)
새로운 버킷을 생성하거나 초기화할 때 반드시 아래 두 가지 설정을 완료해야 기능이 정상 작동합니다.

#### 1. 보안 규칙 (Security Rules)
Firebase 콘솔 -> Storage -> 규칙 탭에서 수정:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;   // 누구나 조회 가능 (public)
      allow write: if false;  // 업로드는 서버 권한(IAM)으로만
    }
  }
}
```

#### 2. CORS 설정 (다운로드 및 대시보드 노출용)
Google Cloud Shell에서 아래 명령어 실행 (도메인 소유자만 가능):
```bash
# 1. 설정 파일 생성
cat <<EOF > cors.json
[
  {
    "origin": ["https://admin.culturemarketing.co.kr", "https://attendance-well-timber-formula.trycloudflare.com"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
EOF

# 2. 버킷에 적용
gsutil cors set cors.json gs://store-892ea-firebasestorage-app-dev
```

#### 3. 프로바이더 코드 내 필수 옵션 (이미지 노출 핵심)
업로드 로직(`src/providers/upload-firebase-custom/index.ts`)에서 파일을 저장할 때, 반드시 `public: true` 옵션이 포함되어야 브라우저에서 접근 가능한 공개 URL이 생성됩니다.

```typescript
await fileRef.save(file.buffer!, {
    public: true,      // 👈 매우 중요: 공용 읽기 권한을 개체별로 부여
    contentType: file.mime,
    resumable: false,  // 메모리 절약
});
```

1-

## 📦 주요 플러그인 / 패키지

| 패키지명 | 버전 | 용도 |
|----------|------|------|
| `@strapi/plugin-users-permissions` | `5.9.0` | 사용자 권한 관리 및 커스텀 필드 확장 |
| `@strapi/plugin-i18n` | `5.0.0` | 다국어 지원 (ko/en) |
| `src/providers/upload-firebase-custom` | `로컬` | **[커스텀]** 백엔드 sharp 기반 WebP 변환 및 다이내믹 압축 (900px, 800KB) |
| `@_sh/strapi-plugin-ckeditor` | `5.0.1` | 에디터 활용 및 한글 툴팁 지원 |
| `@strapi/provider-email-nodemailer` | `5.9.0` | Gmail SMTP 기반 이메일 발송 |

---

## 📝 커스텀 주요 로직 (Admin)

### 1. 한글화 및 로그 관리
- **Admin UI**: 한글(`ko`) Locale 적용 및 주요 플러그인/컬렉션 이름 번역 (`app.ts`)
- **로그 최적화**: `MISSING_TRANSLATION` 콘솔 에러 강제 억제 처리

### 2. 미디어 처리 및 검증
- **이미지 최적화**: **백엔드(upload-provider)**에서 `sharp`를 이용해 WebP 변환, 세로 900px 리사이징 및 800KB 목표 다이내믹 압축 루프 수행
- **파일 검증**: `DOC` 컬렉션의 PDF 업로드 시 확장자 검증 (`pdfValidator.ts`)

### 3. UI/UX 커스텀
- **대시보드 수정**: 불필요한 섹션 숨기기 및 "최근 수정 항목" 너비 최적화 (`dashboardModifier.ts`)
- **CKEditor**: 한글 메뉴 적용 및 커스텀 프리셋 설정

---

## 📝 환경 변수 및 보안
- **일반변수**: .github/workflows/deploy.yml
- **민감변수**: GitHub Secrets
- **CSP 설정**: Firebase, CKEditor, Google API 등 외부 도메인 허용 (`middlewares.ts`)

---

## 📝 기타 메모
- **GitHub Token**: 만료일 `2027-02-27` (Settings → Developer settings → Personal access tokens (classic))
- **배포 이력**: AWS EC2 -> GCP Compute Engine 마이그레이션 완료 (2026-03 초)
