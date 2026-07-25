import { inject, injectable } from 'tsyringe';
import type { Country } from '@core/common/types/country.js';
import { CountryRepository } from '@core/repositories/country/country.repository.js';

@injectable()
export class CountryService {
  constructor(
    @inject(CountryRepository)
    private readonly countryRepository: CountryRepository
  ) {}

  listActive(): Promise<Country[]> {
    return this.countryRepository.listActive();
  }

  existsActiveById(id: string): Promise<boolean> {
    return this.countryRepository.existsActiveById(id);
  }
}
