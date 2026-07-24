import type { LanguageCode, UserRole } from '@core/common/types/user.js';
import type { IProfilePicture } from '@core/interfaces/user/IProfilePicture.js';

export interface IUpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  languageCode?: LanguageCode;
  countryId?: string | null;
  active?: boolean;
  profilePicture?: IProfilePicture | null;
}
