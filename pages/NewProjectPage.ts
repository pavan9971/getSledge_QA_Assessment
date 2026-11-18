import { expect, type Locator, type Page } from '@playwright/test';
import { DatePicker } from './components/DatePicker';

export interface ProjectInput {
  name?: string;
  address?: string;
  client?: string;
  contractAmount?: string;
  gc?: string;
  gcEmail?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Projects > Add > Create Manually.
 * The page is a list of field rows. Clicking a row opens a step dialog ("1 of 8") for that field.
 */
export class NewProjectPage {
  readonly createProject: Locator;
  readonly wizard: Locator;
  readonly next: Locator;
  private readonly datePicker: DatePicker;

  constructor(private readonly page: Page) {
    this.createProject = page.getByRole('button', { name: 'Create project' });
    this.wizard = page.getByRole('dialog').filter({ hasText: /of 8/ });
    this.next = this.wizard.getByRole('button', { name: 'Next' });
    this.datePicker = new DatePicker(page, this.wizard);
  }

  async open() {
    await this.page.goto('/projects/new');
    await this.page.getByRole('button', { name: 'Create Manually' }).click();
    await expect(this.createProject).toBeVisible();
  }

  row(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // "General contractor" must not match the "General contractor email" row too
    return this.page.locator('main').getByRole('button', { name: new RegExp(`^${escaped}(?!\\s+email)\\b`) });
  }

  async rowValue(label: string): Promise<string> {
    return (await this.row(label).innerText()).replace(/\s+/g, ' ').trim();
  }

  rowError(label: string, message: string | RegExp): Locator {
    return this.row(label).getByText(message);
  }

  async openField(label: string) {
    await this.row(label).click();
    await expect(this.wizard).toBeVisible();
  }

  async typeInWizard(value: string) {
    const input = this.wizard.locator('input').first();
    await input.click();
    await input.fill(value);
  }

  async setText(label: string, value: string) {
    await this.openField(label);
    await this.typeInWizard(value);
    await this.closeWizard();
  }

  /** Types the address and goes Next without choosing from the suggestions. */
  async typeAddress(address: string) {
    await this.openField('Address');
    await this.typeInWizard(address);
    // give the suggestions a moment to show up, same as a real user would see
    await this.page.getByRole('option').first().waitFor({ timeout: 5_000 }).catch(() => {});
    await this.next.click();
    await this.closeWizard();
  }

  async setDate(label: 'Start date' | 'End date', date: Date) {
    await this.openField(label);
    await this.datePicker.pick(date);
    await this.closeWizard();
  }

  async fill(input: ProjectInput) {
    if (input.name !== undefined) await this.setText('Project name', input.name);
    if (input.address !== undefined) await this.typeAddress(input.address);
    if (input.client !== undefined) await this.setText('Client', input.client);
    if (input.contractAmount !== undefined) await this.setText('Contract amount', input.contractAmount);
    if (input.gc !== undefined) await this.setText('General contractor', input.gc);
    if (input.gcEmail !== undefined) await this.setText('General contractor email', input.gcEmail);
    if (input.startDate) await this.setDate('Start date', input.startDate);
    if (input.endDate) await this.setDate('End date', input.endDate);
  }

  /** Clicks Create project and returns the id of the new project. */
  async submit(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse(r => /\/api\/v1\/projects$/.test(r.url()) && r.request().method() === 'POST'),
      this.createProject.click(),
    ]);
    expect(response.status(), await response.text()).toBe(201);
    await this.page.waitForURL(/\/projects\/\d+$/);
    return Number(/projects\/(\d+)/.exec(this.page.url())![1]);
  }

  private async closeWizard() {
    await this.page.keyboard.press('Escape');
  }
}
