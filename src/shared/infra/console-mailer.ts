import type { EmailMessage, Mailer } from '../application/mailer';

export class ConsoleMailer implements Mailer {
  async send({ to, subject, body }: EmailMessage): Promise<void> {
    console.log(`[EMAIL] para: ${to} | assunto: ${subject}\n        ${body}`);
  }
}
