# 1단계: 빌드
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ENV GENERATE_SOURCEMAP=false
ENV HOST=0.0.0.0
ENV PORT=1337
ENV DATABASE_CLIENT=mysql
ENV DATABASE_HOST=build-placeholder
ENV DATABASE_PORT=3306
ENV DATABASE_NAME=build-placeholder
ENV DATABASE_USERNAME=build-placeholder
ENV DATABASE_PASSWORD=build-placeholder
ENV DATABASE_SSL=false
ENV JWT_SECRET=build-placeholder-jwt-secret-minimum32chars
ENV ADMIN_JWT_SECRET=build-placeholder-adminjwt-minimum32chars
ENV APP_KEYS=build-placeholder-key1,build-placeholder-key2
ENV API_TOKEN_SALT=build-placeholder-api-salt-32chars
ENV TRANSFER_TOKEN_SALT=build-placeholder-transfer-32chars
ENV FIREBASE_STORAGE_BUCKET=build-placeholder
ENV FIREBASE_SERVICE_ACCOUNT=build-placeholder
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587
ENV SMTP_USERNAME=build-placeholder
ENV SMTP_PASSWORD=build-placeholder
ENV URL=https://admin.culturemarketing.co.kr
ENV PUBLIC_URL=https://admin.culturemarketing.co.kr

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2단계: 실행 이미지
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production

# ✅ 빌드된 전체 앱 복사 (공식 방식)
COPY --from=builder /usr/src/app ./

# ✅ production 의존성만 재설치
RUN npm ci --omit=dev

RUN mkdir -p /etc/ssl/aiven

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 1337

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
