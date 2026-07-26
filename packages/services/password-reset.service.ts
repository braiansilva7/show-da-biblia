import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { inject, injectable } from 'tsyringe';
import { passwordResetEnvironment } from '@core/config/environments.js';
import { PasswordResetCodeRepository } from '@core/repositories/auth/password-reset-code.repository.js';
import { UserService } from '@core/services/user.service.js';
import { EmailService } from '@core/services/email.service.js';
import type { LanguageCode, User } from '@core/common/types/user.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

@injectable()
export class PasswordResetService {
  private readonly origins = new Map<string, number[]>();

  constructor(
    @inject(PasswordResetCodeRepository)
    private readonly codes: PasswordResetCodeRepository,
    @inject(UserService) private readonly users: UserService,
    @inject(EmailService) private readonly email: EmailService
  ) {}

  private hash(userId: string, code: string) {
    return createHmac('sha256', passwordResetEnvironment().codeSecret)
      .update(`${userId}:${code}`)
      .digest('hex');
  }

  private allowOrigin(origin: string) {
    const now = Date.now();
    const recent = (this.origins.get(origin) ?? []).filter(
      (time) => now - time < 60 * 60 * 1000
    );
    if (recent.length >= 5) throw new Error('RESET_RATE_LIMITED');
    recent.push(now);
    this.origins.set(origin, recent);
  }

  async sendCode(email: string, origin: string): Promise<void> {
    this.allowOrigin(origin);
    const user = await this.users.findByEmail(email);
    if (!user || !user.active) return;
    const active = await this.codes.findLatestActiveByUserId(user.id);
    if (
      active &&
      Date.now() - new Date(active.createdAt).getTime() < RESEND_DELAY_MS
    )
      return;
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.codes.invalidateActiveForUser(user.id);
    await this.codes.create(
      user.id,
      this.hash(user.id, code),
      new Date(Date.now() + CODE_TTL_MS).toISOString()
    );
    try {
      await this.email.sendPasswordResetCode({
        to: user.email,
        code,
        locale: user.languageCode,
      });
    } catch (error) {
      await this.codes.invalidateActiveForUser(user.id);
      throw error;
    }
  }

  async verifyCode(email: string, code: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.active) throw new Error('RESET_CODE_INVALID');
    const active = await this.codes.findLatestActiveByUserId(user.id);
    if (!active || Date.now() > new Date(active.expiresAt).getTime())
      throw new Error('RESET_CODE_EXPIRED');
    if (active.attempts >= MAX_ATTEMPTS)
      throw new Error('RESET_CODE_TOO_MANY_ATTEMPTS');
    const expected = Buffer.from(active.codeHash, 'hex');
    const received = Buffer.from(this.hash(user.id, code), 'hex');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      await this.codes.incrementAttempts(active.id);
      throw new Error('RESET_CODE_INVALID');
    }
    await this.codes.consume(active.id);
    return user;
  }

  async resetPassword(userId: string, password: string): Promise<User> {
    const user = await this.users.resetPassword(userId, password);
    if (!user) throw new Error('RESET_USER_NOT_FOUND');
    await this.codes.invalidateActiveForUser(userId);
    return user;
  }
}
