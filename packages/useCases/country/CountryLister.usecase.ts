import { inject, injectable } from 'tsyringe';
import { CountryService } from '@core/services/country.service.js';

@injectable()
export class CountryListerUseCase {
  constructor(
    @inject(CountryService) private readonly countryService: CountryService
  ) {}

  execute() {
    return this.countryService.listActive();
  }
}
