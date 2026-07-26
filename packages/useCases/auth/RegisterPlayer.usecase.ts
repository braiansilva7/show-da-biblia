import { inject, injectable } from 'tsyringe';
import type { IRegisterPlayerInput } from '@core/interfaces/auth/IRegisterPlayerInput.js';
import { UserService } from '@core/services/user.service.js';

@injectable()
export class RegisterPlayerUseCase {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  execute(input: IRegisterPlayerInput) {
    return this.userService.registerPlayer(input);
  }
}
