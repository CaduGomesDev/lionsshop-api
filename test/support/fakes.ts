import type { Clock } from '../../src/shared/application/clock';
import type { EmailMessage, Mailer } from '../../src/shared/application/mailer';

export class FakeMailer implements Mailer {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }

  subjects(): string[] {
    return this.sent.map((m) => m.subject);
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date = new Date('2026-11-20T12:00:00Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date | string): void {
    this.current = new Date(date);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}
