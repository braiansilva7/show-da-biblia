import { inject, injectable } from 'tsyringe';
import {
  hashPassword,
  verifyPassword,
} from '@core/common/functions/password.js';
import type { User, UserListItem } from '@core/common/types/user.js';
import type { ICreateUserInput } from '@core/interfaces/user/ICreateUserInput.js';
import type { IUpdateUserInput } from '@core/interfaces/user/IUpdateUserInput.js';
import type { IListUsersInput } from '@core/interfaces/user/IListUsersInput.js';
import { UserRepository } from '@core/repositories/user/user.repository.js';
import { StorageService } from '@core/services/storage.service.js';
import { CountryService } from '@core/services/country.service.js';
import { PermissionRepository } from '@core/repositories/permission/permission.repository.js';
import type { IRegisterPlayerInput } from '@core/interfaces/auth/IRegisterPlayerInput.js';

@injectable()
export class UserService {
  constructor(
    @inject(UserRepository) private readonly userRepository: UserRepository,
    @inject(StorageService) private readonly storageService: StorageService,
    @inject(CountryService) private readonly countryService: CountryService,
    @inject(PermissionRepository)
    private readonly permissionRepository: PermissionRepository
  ) {}

  list(input: IListUsersInput) {
    return this.userRepository.list(input);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  usernameExists(username: string): Promise<boolean> {
    return this.userRepository.existsByUsername(username.trim());
  }

  async create(input: ICreateUserInput): Promise<UserListItem> {
    if (await this.userRepository.existsByUsername(input.username)) {
      throw new Error('USERNAME_ALREADY_EXISTS');
    }
    if (!(await this.countryService.existsActiveById(input.countryId))) {
      throw new Error('COUNTRY_NOT_FOUND');
    }
    let profilePictureUrl: string | null = null;
    if (input.profilePicture) {
      profilePictureUrl = await this.storageService.uploadProfilePicture(
        input.profilePicture
      );
    }

    return this.userRepository.create({
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      permissionRoleId: input.permissionRoleId,
      languageCode: input.languageCode,
      countryId: input.countryId ?? null,
      profilePictureUrl,
      active: input.active,
    });
  }

  async registerPlayer(input: IRegisterPlayerInput): Promise<UserListItem> {
    if (await this.userRepository.findByEmail(input.email))
      throw new Error('EMAIL_ALREADY_EXISTS');
    const playerRole = await this.permissionRepository.findByCode('PLAYER');
    if (!playerRole || !playerRole.active)
      throw new Error('PLAYER_ROLE_NOT_FOUND');

    return this.create({
      ...input,
      permissionRoleId: playerRole.id,
      active: true,
    });
  }

  async update(id: string, input: IUpdateUserInput, authenticatedUser: User) {
    const current = await this.userRepository.findById(id);
    if (!current) return { user: null };
    if (
      input.username !== undefined &&
      (await this.userRepository.existsByUsername(input.username, id))
    ) {
      throw new Error('USERNAME_ALREADY_EXISTS');
    }
    if (
      id === authenticatedUser.id &&
      (input.active === false ||
        (input.permissionRoleId !== undefined &&
          input.permissionRoleId !== current.permissionRoleId))
    ) {
      return { error: 'SELF_ADMIN_CHANGE' as const };
    }
    if (
      input.countryId !== undefined &&
      !(await this.countryService.existsActiveById(input.countryId))
    ) {
      throw new Error('COUNTRY_NOT_FOUND');
    }

    let profilePictureUrl: string | null | undefined;
    let uploadedProfilePictureUrl: string | null = null;
    if (input.profilePicture) {
      uploadedProfilePictureUrl =
        await this.storageService.uploadProfilePicture(input.profilePicture);
      profilePictureUrl = uploadedProfilePictureUrl;
    } else if (input.removeProfilePicture) {
      profilePictureUrl = null;
    }

    let user: UserListItem | null;
    try {
      user = await this.userRepository.update(id, {
        username: input.username,
        email: input.email,
        passwordHash: input.password
          ? await hashPassword(input.password)
          : undefined,
        permissionRoleId: input.permissionRoleId,
        languageCode: input.languageCode,
        countryId: input.countryId,
        profilePictureUrl,
        active: input.active,
      });
    } catch (error) {
      if (uploadedProfilePictureUrl)
        await this.storageService.deleteByUrl(uploadedProfilePictureUrl);
      throw error;
    }

    if (!user && uploadedProfilePictureUrl)
      await this.storageService.deleteByUrl(uploadedProfilePictureUrl);
    if (user && (input.profilePicture || input.removeProfilePicture))
      await this.storageService.deleteByUrl(current.profilePictureUrl);

    return { user };
  }

  async delete(id: string, authenticatedUser: User) {
    if (id === authenticatedUser.id) return { error: 'SELF_DELETE' as const };
    const current = await this.userRepository.findById(id);
    if (!current) return { deleted: false };
    const deleted = await this.userRepository.delete(id);
    if (deleted)
      await this.storageService.deleteByUrl(current.profilePictureUrl);
    return { deleted };
  }

  async resetPassword(id: string, password: string): Promise<User | null> {
    return this.userRepository.resetPassword(id, await hashPassword(password));
  }
}

@injectable()
export class AuthService {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  async login(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : false;
    return user && user.active && passwordMatches ? user : null;
  }
}
