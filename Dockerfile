# ✅ 1단계: 의존성 설치 (캐시 레이어 독립 분리)
FROM node:20-slim AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# ✅ 2단계: 빌드 (시크릿 전혀 불필요)
FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    GENERATE_SOURCEMAP=false \
    HOST=0.0.0.0 \
    PORT=1337 \
    DATABASE_CLIENT=mysql \
    DATABASE_HOST=build-placeholder \
    DATABASE_PORT=3306 \
    DATABASE_NAME=build-placeholder \
    DATABASE_USERNAME=build-placeholder \
    DATABASE_PASSWORD=build-placeholder \
    DATABASE_SSL=false \
    JWT_SECRET=build-placeholder-jwt-secret-minimum32chars!! \
    ADMIN_JWT_SECRET=build-placeholder-adminjwt-minimum32chars! \
    APP_KEYS=build-placeholder-key1,build-placeholder-key2 \
    API_TOKEN_SALT=build-placeholder-api-salt-32chars!!! \
    TRANSFER_TOKEN_SALT=build-placeholder-transfer-32chars! \
    FIREBASE_STORAGE_BUCKET=build-placeholder \
    FIREBASE_SERVICE_ACCOUNT=build-placeholder \
    SMTP_HOST=smtp.gmail.com \
    SMTP_PORT=587 \
    SMTP_USERNAME=build-placeholder \
    SMTP_PASSWORD=build-placeholder \
    URL=http://localhost:1337 \
    PUBLIC_URL=http://localhost:1337

RUN npm run build

# ✅ 3단계: 실행 이미지 (경량화)
FROM node:20-slim AS runner
WORKDIR /usr/src/app

RUN mkdir -p /etc/ssl/aiven

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/config ./config
COPY --from=builder /usr/src/app/database ./database
COPY --from=builder /usr/src/app/package*.json ./

RUN npm ci --omit=dev

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 1337

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]