import { request } from './client';
import type { Country } from '../types/auth';

type ApiCountry = { id: string; iso_code: string; name: string };
export const countryApi = {
  async list(): Promise<Country[]> {
    const response = await request<{ countries: ApiCountry[] }>(
      '/public/countries',
      { authenticated: false }
    );
    return response.countries.map((country) => ({
      id: country.id,
      isoCode: country.iso_code,
      name: country.name,
    }));
  },
};
