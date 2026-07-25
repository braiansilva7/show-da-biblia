export interface IStartGameInput { userId: string; eliminationQuantity: number; revealQuantity: number }
export interface IAnswerQuestionInput { userId: string; sessionId: string; sessionQuestionId: string; answerOptionId: string }
export interface IFinishGameInput { userId: string; sessionId: string }
export interface IRankingInput { userId: string; page: number; pageSize: number; national: boolean }
