export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1338),
  url: env('URL', `http://localhost:${env('PORT', 1338)}`),
  app: {
    keys: env.array('APP_KEYS'),
  },
  proxy: true,
  watchIgnoreFiles: [
    '.idea/**',
    './test/*.http',  // HTTP 테스트 파일 경로 지정
    '**/*.http'       // 모든 .http 파일 무시
  ]
});
