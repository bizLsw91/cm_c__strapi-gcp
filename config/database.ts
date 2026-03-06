import path from 'path';
import fs from 'fs';

// ✅ fs.readFileSync를 런타임에만 실행되도록 헬퍼 함수로 분리
const getSslCa = (env) => {
  if (!env.bool('DATABASE_SSL', true)) return undefined;
  const caPath = env('DATABASE_SSL_CA', '/etc/ssl/aiven/ca.pem');
  try {
    return fs.readFileSync(caPath);
  } catch (e) {
    console.warn(`⚠️  SSL CA 파일 읽기 실패: ${caPath} (빌드 타임이면 정상)`);
    return undefined;
  }
};

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', undefined),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', undefined),
        user: env('DATABASE_USERNAME', undefined),
        password: env('DATABASE_PASSWORD', undefined),
        ssl: env.bool('DATABASE_SSL', true) && {
          // ✅ 함수 호출로 변경
          ca: getSslCa(env),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', 'data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
