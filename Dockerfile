# 1단계: 의존성 설치
FROM node:20-slim AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# 2단계: 빌드
FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
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
ENV URL=http://localhost:1337
ENV PUBLIC_URL=http://localhost:1337

RUN npm run build

# 3단계: 실행 이미지
FROM node:20-slim AS runner
WORKDIR /usr/src/app

RUN mkdir -p /etc/ssl/aiven

# ✅ dist/ 만 복사 (dist/config, dist/src .js 컴파일본 포함)
# ✅ 원본 config/*.ts 절대 복사 안함
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package*.json ./

# ✅ 커스텀 Firebase provider (dist에 포함 안될 수 있어서 별도 복사)
COPY --from=builder /usr/src/app/src/providers ./src/providers

# ✅ node_modules는 builder에서 그대로 복사 (재설치 시간 절약)
COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 1337

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
