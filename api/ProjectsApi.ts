import type { APIRequestContext } from '@playwright/test';
import { API_URL } from '../config/env';

export interface StoredProject {
  id: number;
  name: string;
  clientName?: string;
  generalContractorName?: string;
  generalContractorEmail?: string;
  contractAmount?: string;
  creationStatus?: string;
  projectStartDate: string;
  projectEndDate: string;
  [key: string]: unknown;
}

export interface ProjectResponse {
  status: number;
  bytes: number;
  project: StoredProject;
}

/** Reads projects straight from the backend, using the cookies of the logged-in browser. */
export class ProjectsApi {
  constructor(private readonly request: APIRequestContext) {}

  async get(id: number): Promise<ProjectResponse> {
    const res = await this.request.get(`${API_URL}/projects/${id}`);
    const raw = await res.text();
    const body = JSON.parse(raw);
    return { status: res.status(), bytes: raw.length, project: body.data ?? body };
  }

  /** Id of any existing project, or undefined for an empty workspace. */
  async anyProjectId(): Promise<number | undefined> {
    const res = await this.request.get(`${API_URL}/projects?limit=1`);
    const body = await res.json();
    const candidates = [body.data, body.data?.items, body.data?.projects, body.items, body.projects];
    const list = candidates.find(Array.isArray) ?? [];
    return list[0]?.id;
  }
}
