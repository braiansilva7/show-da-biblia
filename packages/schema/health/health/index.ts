import { Type } from '@sinclair/typebox';

export const healthSchema = {
  description: 'Health check',
  tags: ['health'],
  response: {
    200: Type.Object({
      status: Type.Literal('ok'),
    }),
  },
};
