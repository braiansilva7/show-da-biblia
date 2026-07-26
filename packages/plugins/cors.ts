import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { managerApiEnvironment } from '@core/config/environments.js';

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      isPrivateIpv4(url.hostname)
    );
  } catch {
    return false;
  }
}

async function corsPlugin(server: FastifyInstance) {
  const environment = managerApiEnvironment();
  const allowedOrigins = environment.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  await server.register(cors, {
    origin(origin, callback) {
      const isAllowed =
        !origin ||
        allowedOrigins.includes(origin) ||
        (environment.appEnvironment === 'LOCAL' &&
          isLocalDevelopmentOrigin(origin));
      callback(null, isAllowed);
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
}

export const registerCors = fp(corsPlugin, { name: 'cors' });
export default registerCors;
