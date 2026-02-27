export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('URL'),
  app: {
    keys: env.array('APP_KEYS'),
  },
  watchIgnoreFiles: [
    '.idea/**',
    './test/*.http',  // HTTP 테스트 파일 경로 지정
    '**/*.http'       // 모든 .http 파일 무시
  ]
});
