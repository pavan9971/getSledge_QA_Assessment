import type { Locator, Page } from '@playwright/test';
import { dayLabel, monthsFromNow } from '../../utils/dates';

/** The calendar popup inside the date step of the wizard. It always opens on the current month. */
export class DatePicker {
  private readonly apply: Locator;

  constructor(private readonly page: Page, private readonly wizard: Locator) {
    this.apply = page.getByRole('button', { name: 'Apply' });
  }

  async pick(date: Date) {
    await this.wizard.getByRole('button', { name: 'Select date' }).click();

    const target = this.page.getByRole('button', { name: dayLabel(date), exact: true });
    const calendar = this.page
      .locator('div')
      .filter({ hasText: /[A-Z][a-z]+ - \d{4}/ })
      .filter({ has: this.apply })
      .last();

    // the first two buttons in the calendar are "previous month" and "next month"
    const distance = monthsFromNow(date);
    const arrow = distance > 0 ? 1 : 0;
    for (let i = 0; i < Math.abs(distance) && !(await target.isVisible()); i++) {
      await calendar.getByRole('button').nth(arrow).click();
    }

    await target.click();
    await this.apply.click();
  }
}
