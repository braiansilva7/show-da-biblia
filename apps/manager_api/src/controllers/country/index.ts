import { inject, injectable } from 'tsyringe';
import { CountryListerUseCase } from '@core/useCases/country/CountryLister.usecase.js';

@injectable()
export class CountryController {
  constructor(
    @inject(CountryListerUseCase) private readonly lister: CountryListerUseCase
  ) {}

  public list = async () => ({ countries: await this.lister.execute() });
}
