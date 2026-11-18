import { expect, test } from '@playwright/test';
import { NetworkLog } from '../api/NetworkLog';
import { ProjectsApi } from '../api/ProjectsApi';
import { CAN_CREATE_DATA } from '../config/env';
import { NewProjectPage } from '../pages/NewProjectPage';
import { daysFromNow, isoDay, mdy } from '../utils/dates';
import { SAFE_ADDRESS, uniqueName } from '../utils/testData';

test.describe('New Project > Create Manually', () => {
  let form: NewProjectPage;

  test.beforeEach(async ({ page }) => {
    form = new NewProjectPage(page);
    await form.open();
  });

  test('shows every required and optional field @smoke', async ({ page }) => {
    await expect(page.getByText('Only the name and address are needed.')).toBeVisible();

    const fields = [
      'Project name', 'Address', 'Client', 'Contract amount',
      'General contractor', 'General contractor email', 'Start date', 'End date',
    ];
    for (const field of fields) {
      await expect(form.row(field)).toBeVisible();
    }
  });

  test('blocks Create when the required fields are empty @smoke', async ({ page }) => {
    const network = new NetworkLog(page);

    await form.createProject.click();

    await expect(form.rowError('Project name', 'Enter the project name')).toBeVisible();
    await expect(form.rowError('Address', 'Enter the project address')).toBeVisible();
    // the wizard jumps to the first invalid field
    await expect(form.wizard).toContainText('1 of 8');
    expect(network.projectPosts()).toHaveLength(0);
  });

  test('treats a whitespace-only project name as empty', async () => {
    await form.openField('Project name');
    await form.typeInWizard('   ');
    await form.next.click();

    await expect(form.rowError('Project name', 'Enter the project name')).toBeVisible();
  });

  test('flags an invalid general contractor email and blocks Create', async ({ page }) => {
    const network = new NetworkLog(page);

    await form.setText('Project name', uniqueName());
    await form.setText('General contractor email', 'not-an-email');
    await expect(form.rowError('General contractor email', 'Enter a valid email address')).toBeVisible();

    await form.createProject.click();

    await expect(form.wizard).toContainText('General contractor email');
    expect(network.projectPosts()).toHaveLength(0);
  });

  test('creates a valid project and stores what was typed @smoke', async ({ page }) => {
    test.skip(!CAN_CREATE_DATA, 'set ALLOW_DATA_CREATION=true to run tests that create projects');

    const name = uniqueName();
    const start = daysFromNow(10);
    const end = daysFromNow(40);

    await form.fill({
      name,
      address: SAFE_ADDRESS,
      client: 'QA Client',
      contractAmount: '250000',
      gc: 'QA GC',
      gcEmail: 'qa.gc@example.com',
      startDate: start,
      endDate: end,
    });
    const id = await form.submit();

    await expect(page.getByText('Project created')).toBeVisible();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();

    const { status, project } = await new ProjectsApi(page.request).get(id);
    expect(status).toBe(200);
    expect(project).toMatchObject({
      name,
      clientName: 'QA Client',
      generalContractorName: 'QA GC',
      generalContractorEmail: 'qa.gc@example.com',
      contractAmount: '250000.00',
      creationStatus: 'complete',
    });
    expect(project.projectStartDate.slice(0, 10)).toBe(isoDay(start));
    expect(project.projectEndDate.slice(0, 10)).toBe(isoDay(end));

    // and the page header agrees with the backend
    await expect(page.getByText(`Projected Timeline: ${mdy(start)} - ${mdy(end)}`)).toBeVisible();
  });
});
