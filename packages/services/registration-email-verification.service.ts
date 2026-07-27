import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { inject, injectable } from 'tsyringe';
import { registrationEmailVerificationEnvironment } from '@core/config/environments.js';
import { RegistrationEmailCodeRepository } from '@core/repositories/auth/registration-email-code.repository.js';
import { UserService } from '@core/services/user.service.js';
import { EmailService } from '@core/services/email.service.js';
import type { LanguageCode } from '@core/common/types/user.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_ORIGIN = 5;

@injectable()
export class RegistrationEmailVerificationService {
  private readonly origins = new Map<string, number[]>();

  constructor(
    @inject(RegistrationEmailCodeRepository) private readonly codes: RegistrationEmailCodeRepository,
    @inject(UserService) private readonly users: UserService,
    @inject(EmailService) private readonly email: EmailService
  ) {}

  private normalize(email: string) { return email.trim().toLowerCase(); }
  private hash(email: string, code: string) {
    return createHmac('sha256', registrationEmailVerificationEnvironment().codeSecret).update(`${email}:${code}`).digest('hex');
  }
  private allowOrigin(origin: string) {
    const now = Date.now();
    const recent = (this.origins.get(origin) ?? []).filter((time) => now - time < 60 * 60 * 1000);
    if (recent.length >= MAX_REQUESTS_PER_ORIGIN) throw new Error('REGISTRATION_CODE_RATE_LIMITED');
    recent.push(now);
    this.origins.set(origin, recent);
  }

  async sendCode(email: string, locale: LanguageCode, origin: string): Promise<void> {
    const normalizedEmail = this.normalize(email);
    this.allowOrigin(origin);
    if (await this.users.findByEmail(normalizedEmail)) throw new Error('REGISTRATION_EMAIL_ALREADY_EXISTS');
    const active = await this.codes.findLatestActiveByEmail(normalizedEmail);
    if (active && Date.now() - new Date(active.createdAt).getTime() < RESEND_DELAY_MS) throw new Error('REGISTRATION_CODE_RESEND_TOO_SOON');
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.codes.invalidateActiveForEmail(normalizedEmail);
    await this.codes.create(normalizedEmail, this.hash(normalizedEmail, code), new Date(Date.now() + CODE_TTL_MS).toISOString());
    try {
      await this.email.sendRegistrationVerificationCode({ to: normalizedEmail, code, locale });
    } catch (error) {
      await this.codes.invalidateActiveForEmail(normalizedEmail);
      throw error;
    }
  }

  async verifyCode(email: string, code: string): Promise<string> {
    const normalizedEmail = this.normalize(email);
    if (await this.users.findByEmail(normalizedEmail)) throw new Error('REGISTRATION_EMAIL_ALREADY_EXISTS');
    const active = await this.codes.findLatestActiveByEmail(normalizedEmail);
    if (!active || Date.now() > new Date(active.expiresAt).getTime()) throw new Error('REGISTRATION_CODE_EXPIRED');
    if (active.attempts >= MAX_ATTEMPTS) throw new Error('REGISTRATION_CODE_TOO_MANY_ATTEMPTS');
    const expected = Buffer.from(active.codeHash, 'hex');
    const received = Buffer.from(this.hash(normalizedEmail, code), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      await this.codes.incrementAttempts(active.id);
      throw new Error('REGISTRATION_CODE_INVALID');
    }
    await this.codes.consume(active.id);
    return normalizedEmail;
  }
}
