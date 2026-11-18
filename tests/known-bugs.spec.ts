import { expect, test } from '@playwright/test';
import { NetworkLog } from '../api/NetworkLog';
import { ProjectsApi } from '../api/ProjectsApi';
import { CAN_CREATE_DATA } from '../config/env';
import { NewProjectPage } from '../pages/NewProjectPage';
import { contrastRatio } from '../utils/contrast';
import { daysFromNow, mdy } from '../utils/dates';
import { knownBug } from '../utils/knownBug';
import { SAFE_ADDRESS, uniqueName } from '../utils/testData';

// One test per bug in bug-reports/BUG-REPORT.md. Each asserts the behaviour we expect,
// and knownBug() flips it to "expected to fail" until the product is fixed.

const needsData = 'creates a project while the bug is still open';

test.describe('Known defects @known-bug', () => {
  test('SLG-01: a typed address is kept when no suggestion is picked', async ({ page }) => {
    knownBug('SLG-01', 'typed address replaced by the first autocomplete suggestion');
    const form = new NewProjectPage(page);
    await form.open();

    const typed = '123 QA Test Street, Austin, TX 78701';
    await form.typeAddress(typed);

    // today this shows "123 Vale Street, Austin, TX 78746"
    expect(await form.rowValue('Address')).toContain(typed);
  });

  test('SLG-02: end date before start date is rejected', async ({ page }) => {
    test.skip(!CAN_CREATE_DATA, needsData);
    knownBug('SLG-02', 'end date before start date is accepted');
    const form = new NewProjectPage(page);
    const network = new NetworkLog(page);
    await form.open();

    await form.fill({
      name: uniqueName('QA-AUTO SLG-02'),
      address: SAFE_ADDRESS,
      startDate: daysFromNow(20),
      endDate: daysFromNow(5),
    });
    await form.createProject.click();

    await expect(form.row('End date').getByText(/after|before|later|start/i)).toBeVisible({ timeout: 5_000 });
    expect(network.projectCreated()).toBe(false);
  });

  test('SLG-02b: project header shows the stored end date', async ({ page }) => {
    test.skip(!CAN_CREATE_DATA, needsData);
    knownBug('SLG-02', 'header shows start + 30 days instead of the stored end date');
    const form = new NewProjectPage(page);
    await form.open();

    await form.fill({
      name: uniqueName('QA-AUTO SLG-02b'),
      address: SAFE_ADDRESS,
      startDate: daysFromNow(20),
      endDate: daysFromNow(5),
    });
    const id = await form.submit();

    const { project } = await new ProjectsApi(page.request).get(id);
    const stored = new Date(project.projectEndDate);
    const storedLocal = new Date(stored.getUTCFullYear(), stored.getUTCMonth(), stored.getUTCDate());

    await expect(page.getByText(/Projected Timeline:/)).toContainText(mdy(storedLocal));
  });

  test('SLG-03: negative contract amount is rejected', async ({ page }) => {
    test.skip(!CAN_CREATE_DATA, needsData);
    knownBug('SLG-03', 'negative contract amount is accepted');
    const form = new NewProjectPage(page);
    const network = new NetworkLog(page);
    await form.open();

    await form.fill({ name: uniqueName('QA-AUTO SLG-03'), address: SAFE_ADDRESS, contractAmount: '-5000' });
    await form.createProject.click();

    // wait for the create call to be answered, if it is ever sent
    await page.waitForResponse(r => r.request().method() === 'POST' && /\/projects$/.test(r.url()), { timeout: 5_000 }).catch(() => {});
    expect(network.projectCreated()).toBe(false);
  });

  test('SLG-04: read-aloud request is not rate limited', async ({ page }) => {
    knownBug('SLG-04', 'POST /speech/say returns 429 on every load');
    const network = new NetworkLog(page);

    await page.goto('/projects/new');
    await page.waitForResponse(r => r.url().includes('/speech/say'), { timeout: 20_000 });

    const statuses = network.matching(/\/speech\/say/).map(r => r.status);
    expect(statuses).not.toContain(429);
  });

  test('SLG-05: validation errors meet WCAG AA contrast (4.5:1)', async ({ page }) => {
    knownBug('SLG-05', 'error text has about 2:1 contrast');
    const form = new NewProjectPage(page);
    await form.open();

    await form.createProject.click();
    await page.keyboard.press('Escape');

    const error = form.rowError('Project name', 'Enter the project name');
    await expect(error).toBeVisible();
    expect(await contrastRatio(error)).toBeGreaterThanOrEqual(4.5);
  });

  test('SLG-06: KPI card labels are not truncated at 1280px', async ({ page }) => {
    knownBug('SLG-06', 'KPI labels are cut off with an ellipsis');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/workspace/tasks');
    await expect(page.getByText('Everything the company and its crew need to do')).toBeVisible();

    const truncated = await page.locator('main').evaluate(main =>
      [...main.querySelectorAll('*')]
        .filter(el =>
          el.children.length === 0 &&
          el.scrollWidth > el.clientWidth + 1 &&
          getComputedStyle(el).textOverflow === 'ellipsis')
        .map(el => el.textContent?.trim()),
    );
    expect(truncated).toEqual([]);
  });

  test('SLG-07: project API does not send address embeddings', async ({ page }) => {
    knownBug('SLG-07', 'addressEmbedding (1,536 floats) is part of GET /projects/:id');
    const api = new ProjectsApi(page.request);
    await page.goto('/projects');

    const id = await api.anyProjectId();
    test.skip(id === undefined, 'workspace has no projects');

    const { project, bytes } = await api.get(id!);
    const embeddingKeys = Object.keys(project).filter(key => /embedding/i.test(key));
    expect(embeddingKeys, `response was ${bytes} bytes`).toEqual([]);
  });

  test('SLG-08: analytics proxy accepts events', async ({ page }) => {
    knownBug('SLG-08', '/ph/* returns 400');
    const network = new NetworkLog(page);

    await page.goto('/company');
    await page.waitForResponse(r => /\/ph\/(e|i\/v0\/e)\//.test(r.url()), { timeout: 15_000 });

    const calls = network.matching(/\/ph\/(e|i\/v0\/e)\//);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.filter(c => c.status >= 400).map(c => `${c.status} ${c.url}`)).toEqual([]);
  });
});
