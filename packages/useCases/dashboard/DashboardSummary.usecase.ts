import { inject, injectable } from 'tsyringe';
import { DashboardRepository } from '@core/repositories/dashboard/dashboard.repository.js';

@injectable()
export class DashboardSummaryUseCase {
  constructor(
    @inject(DashboardRepository)
    private readonly dashboardRepository: DashboardRepository
  ) {}

  execute() {
    return this.dashboardRepository.summary();
  }
}
