import { inject, injectable } from 'tsyringe';
import { UserService } from '@core/services/user.service.js';
import type { IListUsersInput } from '@core/interfaces/user/IListUsersInput.js';

@injectable()
export class UserListerUseCase {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  execute(input: IListUsersInput) {
    return this.userService.list(input);
  }
}
