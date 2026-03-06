#!/bin/sh
set -e

echo "��� Strapi 컨테이너 시작 중..."

if [ -n "$DATABASE_SSL_CA_CONTENT" ] && [ "$DATABASE_SSL_CA_CONTENT" != "build-placeholder" ]; then
  echo "��� Aiven SSL 인증서 생성 중..."
  echo "$DATABASE_SSL_CA_CONTENT" | base64 -d > /etc/ssl/aiven/ca.pem
  echo "✅ SSL 인증서 생성 완료"
else
  echo "⚠️  SSL 인증서 생략"
fi

exec "$@"
