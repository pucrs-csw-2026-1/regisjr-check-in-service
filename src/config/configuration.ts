export interface AppConfiguration {
  port: number;
  authJwtSecret: string;
  qrJwtSecret: string;
  qrJwtTtlSeconds: number;
  registrationServiceUrl: string;
}

export function configuration(): AppConfiguration {
  return {
    port: Number(process.env.PORT ?? 3000),
    authJwtSecret: process.env.AUTH_JWT_SECRET ?? '',
    qrJwtSecret: process.env.QR_JWT_SECRET ?? '',
    qrJwtTtlSeconds: Number(process.env.QR_JWT_TTL_SECONDS ?? 300),
    registrationServiceUrl: process.env.REGISTRATION_SERVICE_URL ?? '',
  };
}