import { and, asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'tsyringe';
import type { Country } from '@core/common/types/country.js';
import { countries } from '@core/models/country/country.model.js';
import type { AppDatabase } from '@core/plugins/database/index.js';

@injectable()
export class CountryRepository {
  constructor(@inject('DatabaseRo') private readonly db: AppDatabase) {}

  async listActive(): Promise<Country[]> {
    return this.db
      .select({
        id: countries.id,
        iso_code: countries.iso_code,
        name: countries.name,
      })
      .from(countries)
      .where(eq(countries.active, true))
      .orderBy(asc(countries.name));
  }

  async existsActiveById(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: countries.id })
      .from(countries)
      .where(and(eq(countries.id, id), eq(countries.active, true)))
      .limit(1);
    return result.length === 1;
  }
}
