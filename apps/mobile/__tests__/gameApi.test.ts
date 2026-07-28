import { gameApi } from '../api/gameApi';
import { request } from '../api/client';

jest.mock('../api/client', () => ({ request: jest.fn() }));
const mockedRequest = request as jest.MockedFunction<typeof request>;

describe('gameApi', () => {
  it('maps a start response without exposing answer correctness', async () => {
    mockedRequest.mockResolvedValueOnce({
      session: { id: 'session-1', status: 'IN_PROGRESS', score: 0, skips_remaining: 3, current_level: 1 },
      question: { session_question_id: 'question-1', order_number: 1, difficulty_level: 1, presented_at: '2026-01-01T00:00:00.000Z', statement: 'Question?', answers: [{ id: 'a', position: 1, content: 'A' }, { id: 'b', position: 2, content: 'B' }, { id: 'c', position: 3, content: 'C' }, { id: 'd', position: 4, content: 'D' }] },
      jokers: [{ code: 'ELIMINATE_2', quantity_available: 1, quantity_used: 0 }],
    });
    const result = await gameApi.start();
    expect(result.question.answers).toHaveLength(4);
    expect(result.question.answers[0]).not.toHaveProperty('isCorrect');
    expect(mockedRequest).toHaveBeenCalledWith('/game-sessions', { method: 'POST' });
  });

  it('sends only the selected answer and maps a consolidated result', async () => {
    mockedRequest.mockResolvedValueOnce({ finished: true, feedback: { correct_answer_option_id: 'answer-1', explanation: 'Because it is written.' }, summary: { id: 'session-1', status: 'FINISHED', end_reason: 'WRONG_ANSWER', score: 4, correct_answers: 4, answered_questions: 5, skips_used: 1, jokers: [{ code: 'REVEAL_ANSWER', quantity_available: 0, quantity_used: 1 }], highest_unlocked_level: 1, duration_seconds: 42 } });
    const result = await gameApi.answer('session-1', 'question-1', 'answer-2');
    expect(mockedRequest).toHaveBeenCalledWith('/game-sessions/session-1/answers', expect.objectContaining({ body: JSON.stringify({ session_question_id: 'question-1', answer_option_id: 'answer-2' }) }));
    expect(result).toMatchObject({ finished: true, feedback: { correctAnswerOptionId: 'answer-1', explanation: 'Because it is written.' }, summary: { skipsUsed: 1, highestUnlockedLevel: 1 } });
  });

  it('abandons an in-progress session when the player leaves the game', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    await gameApi.abandon('session-1');
    expect(mockedRequest).toHaveBeenCalledWith('/game-sessions/session-1/abandon', { method: 'POST' });
  });

  it('maps timeout feedback without navigating away from the question', async () => {
    mockedRequest.mockResolvedValueOnce({
      summary: { id: 'session-1', status: 'FINISHED', end_reason: 'TIMEOUT', score: 4, correct_answers: 4, answered_questions: 4, skips_used: 0, jokers: [], highest_unlocked_level: 1, duration_seconds: 60 },
      feedback: { correct_answer_option_id: 'answer-3', explanation: 'The correct answer is explained here.' },
    });
    await expect(gameApi.finish('session-1')).resolves.toMatchObject({
      summary: { endReason: 'TIMEOUT' },
      feedback: { correctAnswerOptionId: 'answer-3' },
    });
  });
});
