import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { QuestionController } from './index.js';

function createReply() {
  let statusCode = 200;
  let body: unknown;
  const reply = {
    code: (code: number) => {
      statusCode = code;
      return reply;
    },
    send: (value: unknown) => {
      body = value;
      return value;
    },
  };
  return {
    reply,
    result: () => ({ statusCode, body }),
  };
}

function createController(create: (input: unknown, userId: string) => unknown) {
  return new QuestionController(
    {} as never,
    { execute: create } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
}

const input = {
  category_id: 'category-1',
  difficulty_level: 1,
  options: [],
  translations: {},
};

test('only the system administrator can create questions', async () => {
  const calls: string[] = [];
  const controller = createController((_input, userId) => {
    calls.push(userId);
    return {
      question: {
        id: 'question-1',
        category_id: 'category-1',
        difficulty_level: 1,
        status: 'DRAFT',
        created_by_user_id: userId,
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
        published_at: null,
      },
      translations: [],
      options: [],
      optionTranslations: [],
    };
  });

  for (const code of ['PLAYER', 'EDITOR']) {
    const response = createReply();
    await controller.create(
      {
        authenticatedUser: { id: `${code.toLowerCase()}-1`, permissionRole: { code } },
        body: input,
        t: (key: string) => key,
      } as never,
      response.reply as never
    );
    assert.deepEqual(response.result(), {
      statusCode: 403,
      body: { message: 'auth_permission_denied' },
    });
  }
  assert.deepEqual(calls, []);

  const response = createReply();
  await controller.create(
    {
      authenticatedUser: {
        id: 'administrator-1',
        permissionRole: { code: 'ADMINISTRATOR' },
      },
      body: input,
      t: (key: string) => key,
    } as never,
    response.reply as never
  );
  assert.equal(response.result().statusCode, 201);
  assert.deepEqual(calls, ['administrator-1']);
});
