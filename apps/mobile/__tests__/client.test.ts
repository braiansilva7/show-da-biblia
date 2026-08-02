jest.mock('../config', () => ({ API_URL: 'http://api.example.test/api/v1' }));

import { request } from '../api/client';

describe('API client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps network failures to an actionable connection error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(request('/auth/login', { authenticated: false })).rejects.toEqual(
      expect.objectContaining({
        status: 0,
        message:
          'Não foi possível conectar à API. Verifique se a API está em execução, se a URL configurada está correta e se o celular está na mesma rede.',
      })
    );
  });
});
