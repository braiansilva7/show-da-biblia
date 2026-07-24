import { inject, injectable } from 'tsyringe';
import { UserService, type CreateUserInput } from '@core/services/user.service.js';

@injectable()
export class UserCreatorUseCase {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  execute(input: CreateUserInput) {
    return this.userService.create(input);
  }
}
