import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CountryController } from '@/controllers/country/index.js';
import { countryViewPermissions } from '@/permissions/index.js';
import { listCountriesSchema } from '@core/schema/country/listCountries/index.js';

export default function countryRoutes(server: FastifyInstance) {
  const controller = container.resolve(CountryController);
  server.get('/public/countries', {
    schema: {
      ...listCountriesSchema,
      description: 'Lista países ativos para o cadastro público de jogadores',
      security: [],
      response: { 200: listCountriesSchema.response[200] },
    },
    handler: controller.list,
  });
  server.get('/countries', {
    schema: listCountriesSchema,
    handler: controller.list,
    preHandler: [
      (request, reply) =>
        server.authenticateJwt(request, reply, countryViewPermissions),
    ],
  });
}
