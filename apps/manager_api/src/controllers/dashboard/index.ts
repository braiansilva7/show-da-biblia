import { inject, injectable } from 'tsyringe';
import { DashboardSummaryUseCase } from '@core/useCases/dashboard/DashboardSummary.usecase.js';

@injectable()
export class DashboardController {
  constructor(
    @inject(DashboardSummaryUseCase)
    private readonly summaryUseCase: DashboardSummaryUseCase
  ) {}

  summary = async () => ({ summary: await this.summaryUseCase.execute() });
}
