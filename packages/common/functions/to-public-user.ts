import type { User, PublicUser } from '@core/common/types/user.js';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    country_id: user.countryId,
    language_code: user.languageCode,
    profile_picture_url: user.profilePictureUrl,
    total_score: user.totalScore,
    active: user.active,
    created_at: user.createdAt,
  };
}
