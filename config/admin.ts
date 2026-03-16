export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    options: {
      expiresIn: '1d',
    },
  },
  autoReload: {
    enabled: false,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  adminUrl: {
    // ✅ undefined 연산 방지
    domain: env('PUBLIC_URL') || `localhost:${env('PORT', '1338')}`,
  },
  preview: {
    enabled: false,
  },
  url: '/dashboard',
});
