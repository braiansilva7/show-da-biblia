import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import permissionRoleRoutes from './permission-role.route.js';
import countryRoutes from './country.route.js';
import dashboardRoutes from './dashboard.route.js';

export default function routes(server: FastifyInstance) {
  server.register(authRoutes);
  server.register(userRoutes);
  server.register(countryRoutes);
  server.register(dashboardRoutes);
  server.register(permissionRoleRoutes);
}
