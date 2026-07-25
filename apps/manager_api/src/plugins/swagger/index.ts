import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ETagSwagger } from '@core/common/enums/ETagSwagger.js';

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Manager Show da Bíblia API',
        description: 'Documentação da API de administração do Show da Bíblia.',
        version: '0.1.0',
      },
      components: {
        securitySchemes: {
          authenticateJwt: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            description: 'Token JWT no formato Bearer <token>.',
          },
        },
      },
      tags: [
        {
          name: ETagSwagger.auth,
          description: 'Endpoints relacionados à autenticação.',
        },
        {
          name: ETagSwagger.health,
          description: 'Endpoints relacionados à saúde da aplicação.',
        },
        {
          name: ETagSwagger.user,
          description: 'Endpoints relacionados ao gerenciamento de usuários.',
        },
        {
          name: ETagSwagger.role,
          description: 'Endpoints relacionados ao gerenciamento de roles.',
        },
        {
          name: ETagSwagger.country,
          description:
            'Endpoints de consulta dos países disponíveis no cadastro.',
        },
        {
          name: ETagSwagger.dashboard,
          description: 'Indicadores administrativos do jogo.',
        },
      ],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/swagger',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false,
    },
    staticCSP: false,
  });
}

export default fp(swaggerPlugin, { name: 'swagger' });
