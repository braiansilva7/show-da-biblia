import { inject, injectable } from 'tsyringe';
import type { User } from '@core/common/types/user.js';
import type { IUpdateUserInput } from '@core/interfaces/user/IUpdateUserInput.js';
import { UserService } from '@core/services/user.service.js';

@injectable()
export class UpdateOwnProfileUseCase {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  execute(user: User, input: IUpdateUserInput) {
    return this.userService.update(user.id, input, user);
  }
}
