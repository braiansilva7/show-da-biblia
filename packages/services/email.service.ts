import { injectable } from 'tsyringe';
import net from 'node:net';
import tls from 'node:tls';
import { smtpEnvironment } from '@core/config/environments.js';

const subjectByLocale = {
  'pt-BR': 'Código para recuperar sua senha',
  en: 'Password recovery code',
  es: 'Código para recuperar tu contraseña',
} as const;

@injectable()
export class EmailService {
  private async connect(
    host: string,
    port: number,
    secure: boolean
  ): Promise<net.Socket | tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = secure
        ? tls.connect({ host, port, servername: host })
        : net.connect({ host, port });
      socket.once('error', reject);
      socket.once(secure ? 'secureConnect' : 'connect', () => resolve(socket));
    });
  }

  private async response(socket: net.Socket | tls.TLSSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      let value = '';
      const onData = (chunk: Buffer) => {
        value += chunk.toString('utf8');
        const lines = value.trimEnd().split(/\r?\n/);
        if (lines.length && /^\d{3} /.test(lines[lines.length - 1]))
          cleanup(resolve, value);
      };
      const onError = (error: Error) => cleanup(reject, error);
      const cleanup = (done: (value: never) => void, result: unknown) => {
        socket.off('data', onData);
        socket.off('error', onError);
        done(result as never);
      };
      socket.on('data', onData);
      socket.on('error', onError);
    });
  }

  private async command(
    socket: net.Socket | tls.TLSSocket,
    value: string,
    expected = 250
  ) {
    socket.write(`${value}\r\n`);
    const result = await this.response(socket);
    if (!result.startsWith(String(expected)))
      throw new Error(`SMTP command failed: ${result.trim()}`);
    return result;
  }

  private async upgrade(
    socket: net.Socket,
    host: string
  ): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const encrypted = tls.connect({ socket, servername: host });
      encrypted.once('error', reject);
      encrypted.once('secureConnect', () => resolve(encrypted));
    });
  }

  async sendPasswordResetCode(input: {
    to: string;
    code: string;
    locale: 'pt-BR' | 'en' | 'es';
  }): Promise<void> {
    const config = smtpEnvironment();
    const text =
      input.locale === 'pt-BR'
        ? `Use o código ${input.code} para redefinir sua senha. Ele expira em 10 minutos.`
        : input.locale === 'es'
          ? `Usa el código ${input.code} para restablecer tu contraseña. Caduca en 10 minutos.`
          : `Use code ${input.code} to reset your password. It expires in 10 minutes.`;
    let socket = await this.connect(config.host, config.port, config.secure);
    try {
      const greeting = await this.response(socket);
      if (!greeting.startsWith('220'))
        throw new Error(`SMTP greeting failed: ${greeting.trim()}`);
      const capabilities = await this.command(socket, 'EHLO show-da-biblia');
      if (!config.secure && /(^|\n)250[ -]STARTTLS/i.test(capabilities)) {
        await this.command(socket, 'STARTTLS', 220);
        socket = await this.upgrade(socket as net.Socket, config.host);
        await this.command(socket, 'EHLO show-da-biblia');
      } else if (!config.secure) {
        throw new Error('SMTP server does not support STARTTLS');
      }
      await this.command(socket, 'AUTH LOGIN', 334);
      await this.command(
        socket,
        Buffer.from(config.user).toString('base64'),
        334
      );
      await this.command(
        socket,
        Buffer.from(config.password).toString('base64'),
        235
      );
      await this.command(
        socket,
        `MAIL FROM:<${config.from.match(/<([^>]+)>/)?.[1] ?? config.from}>`
      );
      await this.command(socket, `RCPT TO:<${input.to}>`);
      await this.command(socket, 'DATA', 354);
      const payload = [
        `From: ${config.from}`,
        `To: ${input.to}`,
        `Subject: ${subjectByLocale[input.locale]}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
        '.',
      ].join('\r\n');
      await this.command(socket, payload);
      await this.command(socket, 'QUIT', 221);
    } finally {
      socket.destroy();
    }
  }
}
