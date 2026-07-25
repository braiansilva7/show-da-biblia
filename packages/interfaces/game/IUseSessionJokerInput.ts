export type JokerTypeCode =
  | 'ELIMINATE_1'
  | 'ELIMINATE_2'
  | 'ELIMINATE_3'
  | 'REVEAL_ANSWER';

export interface IUseSessionJokerInput {
  sessionId: string;
  sessionQuestionId: string;
  jokerTypeCode: JokerTypeCode;
  userId: string;
}

export interface IInitializeSessionJokersInput {
  sessionId: string;
  eliminationQuantity: number;
  revealQuantity: number;
}
