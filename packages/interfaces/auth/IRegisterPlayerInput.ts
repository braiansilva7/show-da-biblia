import type { LanguageCode } from '@core/common/types/user.js';
import type { IProfilePicture } from '@core/interfaces/user/IProfilePicture.js';

export interface IRegisterPlayerInput {
  username: string;
  email: string;
  password: string;
  languageCode: LanguageCode;
  countryId: string;
  profilePicture?: IProfilePicture | null;
}
