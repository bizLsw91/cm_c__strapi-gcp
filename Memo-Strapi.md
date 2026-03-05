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
| CDN 연동 | ``     |

---

## 📦 주요 플러그인 / 패키지

| 패키지명 | 버전 | 용도 |
|----------|------|------|
| `@strapi/plugin-users-permissions` | `5.9.0` | 사용자 권한 관리 및 커스텀 필드 확장 |
| `@strapi/plugin-i18n` | `5.0.0` | 다국어 지원 (ko/en) |
| `@dev.w-strapi/sharp-lsw-provider-firebase-storage` | `1.0.6` | Firebase Storage 업로드 및 리사이징 |
| `@_sh/strapi-plugin-ckeditor` | `5.0.1` | 에디터 활용 및 한글 툴팁 지원 |
| `@strapi/provider-email-nodemailer` | `5.9.0` | Gmail SMTP 기반 이메일 발송 |

---

## 📝 커스텀 주요 로직 (Admin)

### 1. 한글화 및 로그 관리
- **Admin UI**: 한글(`ko`) Locale 적용 및 주요 플러그인/컬렉션 이름 번역 (`app.ts`)
- **로그 최적화**: `MISSING_TRANSLATION` 콘솔 에러 강제 억제 처리

### 2. 미디어 처리 및 검증
- **이미지 최적화**: 브라우저 사이드에서 WebP 변환 및 리사이징 수행 (`imageProcessor.ts`)
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
