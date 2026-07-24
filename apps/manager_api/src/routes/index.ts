import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';

export default function routes(server: FastifyInstance) {
  server.register(authRoutes);
  server.register(userRoutes);
}
