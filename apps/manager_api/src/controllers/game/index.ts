import type { FastifyReply, FastifyRequest } from 'fastify';
import { inject, injectable } from 'tsyringe';
import { SkipSessionQuestionUseCase } from '@core/useCases/game/SkipSessionQuestion.usecase.js';
import { UseSessionJokerUseCase } from '@core/useCases/game/UseSessionJoker.usecase.js';
import type { SkipQuestionRequest } from '@core/schema/game/skipQuestion/index.js';
import type { UseJokerRequest } from '@core/schema/game/useJoker/index.js';
import { GameplayUseCase } from '@core/useCases/game/Gameplay.usecase.js';
import type { AnswerBody } from '@core/schema/game/gameplay/index.js';

@injectable()
export class GameController {
  constructor(
    @inject(SkipSessionQuestionUseCase)
    private readonly skipSessionQuestion: SkipSessionQuestionUseCase,
    @inject(UseSessionJokerUseCase)
    private readonly useSessionJoker: UseSessionJokerUseCase,
    @inject(GameplayUseCase) private readonly gameplay: GameplayUseCase
  ) {}

  skipQuestion = async (
    request: FastifyRequest<{
      Params: { sessionId: string };
      Body: SkipQuestionRequest;
    }>,
    reply: FastifyReply
  ) => {
    try {
      return await this.skipSessionQuestion.execute({
        sessionId: request.params.sessionId,
        sessionQuestionId: request.body.session_question_id,
        userId: request.authenticatedUser!.id,
      });
    } catch (error) {
      if (error instanceof Error) {
        const errors: Record<string, [number, string]> = {
          GAME_SESSION_NOT_FOUND: [404, 'game_session_not_found'],
          GAME_SESSION_NOT_IN_PROGRESS: [409, 'game_session_not_in_progress'],
          GAME_SESSION_SKIPS_EXHAUSTED: [409, 'game_session_skips_exhausted'],
          GAME_SESSION_QUESTION_NOT_FOUND: [404, 'game_session_question_not_found'],
          GAME_SESSION_QUESTION_NOT_PENDING: [409, 'game_session_question_not_pending'],
          GAME_SESSION_NO_NEXT_QUESTION: [409, 'game_session_no_next_question'],
        };
        const mapped = errors[error.message];
        if (mapped)
          return reply.code(mapped[0]).send({ message: request.t(mapped[1]) });
      }
      throw error;
    }
  };

  useJoker = async (
    request: FastifyRequest<{
      Params: { sessionId: string };
      Body: UseJokerRequest;
    }>,
    reply: FastifyReply
  ) => {
    try {
      return await this.useSessionJoker.execute({
        sessionId: request.params.sessionId,
        sessionQuestionId: request.body.session_question_id,
        jokerTypeCode: request.body.joker_type_code,
        userId: request.authenticatedUser!.id,
      });
    } catch (error) {
      if (error instanceof Error) {
        const errors: Record<string, [number, string]> = {
          GAME_SESSION_NOT_FOUND: [404, 'game_session_not_found'],
          GAME_SESSION_NOT_IN_PROGRESS: [409, 'game_session_not_in_progress'],
          GAME_SESSION_QUESTION_NOT_FOUND: [404, 'game_session_question_not_found'],
          GAME_SESSION_QUESTION_NOT_PENDING: [409, 'game_session_question_not_pending'],
          GAME_JOKER_TYPE_NOT_FOUND: [400, 'game_joker_type_not_found'],
          GAME_JOKER_NOT_AVAILABLE: [409, 'game_joker_not_available'],
          GAME_JOKER_ALREADY_USED: [409, 'game_joker_already_used'],
          GAME_JOKER_INSUFFICIENT_OPTIONS: [409, 'game_joker_insufficient_options'],
        };
        const mapped = errors[error.message];
        if (mapped)
          return reply.code(mapped[0]).send({ message: request.t(mapped[1]) });
      }
      throw error;
    }
  };

  private gameError(error:unknown, request:FastifyRequest, reply:FastifyReply){ if(error instanceof Error){const map:Record<string,[number,string]>={GAME_SESSION_NOT_FOUND:[404,'game_session_not_found'],GAME_SESSION_NOT_IN_PROGRESS:[409,'game_session_not_in_progress'],GAME_SESSION_QUESTION_NOT_FOUND:[404,'game_session_question_not_found'],GAME_SESSION_QUESTION_NOT_PENDING:[409,'game_session_question_not_pending'],GAME_SESSION_ALREADY_ACTIVE:[409,'game_session_already_active'],GAME_SESSION_NOT_FINISHABLE:[409,'game_session_not_finishable'],GAME_SESSION_NO_NEXT_QUESTION:[409,'game_session_no_next_question'],GAME_ANSWER_INVALID:[400,'game_answer_invalid']};const m=map[error.message];if(m)return reply.code(m[0]).send({message:request.t(m[1])});}throw error; }
  start = async(request:FastifyRequest,reply:FastifyReply)=>{try{return reply.code(201).send(await this.gameplay.start(request.authenticatedUser!.id))}catch(e){return this.gameError(e,request,reply)}};
  answer = async(request:FastifyRequest<{Params:{sessionId:string};Body:AnswerBody}>,reply:FastifyReply)=>{try{return await this.gameplay.answer({userId:request.authenticatedUser!.id,sessionId:request.params.sessionId,sessionQuestionId:request.body.session_question_id,answerOptionId:request.body.answer_option_id})}catch(e){return this.gameError(e,request,reply)}};
  finish = async(request:FastifyRequest<{Params:{sessionId:string}}>,reply:FastifyReply)=>{try{return await this.gameplay.finish({userId:request.authenticatedUser!.id,sessionId:request.params.sessionId})}catch(e){return this.gameError(e,request,reply)}};
  ranking = async(request:FastifyRequest<{Querystring:{page?:number;page_size?:number}}>,reply:FastifyReply,national=false)=>{try{return await this.gameplay.ranking({userId:request.authenticatedUser!.id,page:request.query.page??1,pageSize:request.query.page_size??20,national})}catch(e){return this.gameError(e,request,reply)}};
  internationalRanking = (r:FastifyRequest<any>,p:FastifyReply)=>this.ranking(r,p,false);
  nationalRanking = (r:FastifyRequest<any>,p:FastifyReply)=>this.ranking(r,p,true);
  myRanking = async(request:FastifyRequest,reply:FastifyReply)=>{try{return await this.gameplay.myRanking(request.authenticatedUser!.id)}catch(e){return this.gameError(e,request,reply)}};
}
