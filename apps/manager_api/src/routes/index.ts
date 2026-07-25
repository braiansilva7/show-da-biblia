import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import permissionRoleRoutes from './permission-role.route.js';
import countryRoutes from './country.route.js';
import dashboardRoutes from './dashboard.route.js';
import categoryRoutes from './category.route.js';
import questionRoutes from './question.route.js';
import gameSessionRoutes from './game-session.route.js';

export default function routes(server: FastifyInstance) {
  server.register(authRoutes);
  server.register(userRoutes);
  server.register(countryRoutes);
  server.register(dashboardRoutes);
  server.register(categoryRoutes);
  server.register(questionRoutes);
  server.register(gameSessionRoutes);
  server.register(permissionRoleRoutes);
}
