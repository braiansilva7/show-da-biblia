import { profileForm } from '../api/authApi';

describe('profile form', () => {
  it('keeps the browser-selected photo as a multipart file', async () => {
    const file = new Blob(['profile image'], { type: 'image/png' });
    const form = await profileForm({
      username: 'Maria Antonnella',
      email: 'maria@example.test',
      password: 'safe-password',
      countryId: '019f9749-5b00-7000-8000-000000000019',
      languageCode: 'pt-BR',
      profilePicture: {
        uri: 'blob:profile-picture',
        name: 'profile.png',
        type: 'image/png',
        file,
      },
    });

    expect(form.get('profile_picture')).toBeInstanceOf(Blob);
  });
});
