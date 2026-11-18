import type { Page } from '@playwright/test';

export interface LoggedResponse {
  method: string;
  url: string;
  status: number;
}

/** Remembers every response the page receives so tests can assert on network behaviour. */
export class NetworkLog {
  private readonly entries: LoggedResponse[] = [];

  constructor(page: Page) {
    page.on('response', r =>
      this.entries.push({ method: r.request().method(), url: r.url(), status: r.status() }),
    );
  }

  matching(url: RegExp): LoggedResponse[] {
    return this.entries.filter(e => url.test(e.url));
  }

  projectPosts(): LoggedResponse[] {
    return this.entries.filter(e => e.method === 'POST' && /\/projects$/.test(e.url));
  }

  projectCreated(): boolean {
    return this.projectPosts().some(e => e.status === 201);
  }
}
