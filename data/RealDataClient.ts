
import { IDataClient } from './client';
import { 
    User, Organization, UserRole, Voter, WalkList, 
    Assignment, InteractionCreate, Interaction, Job,
    CampaignProfile, CampaignGoal, GeographyUnit
} from '../types';
import { components, paths } from './contract';
import { getApiOrigin } from '../utils/apiOrigin';

// Helper types to extract response bodies from the contract
type PathResponse<T extends keyof paths, M extends keyof paths[T]> = 
    paths[T][M] extends { responses: { [key: number]: { content: { "application/json": infer R } } } } ? R : never;

/**
 * PRODUCTION API CLIENT
 * 
 * This implementation connects to the real backend defined in API_SPEC.md.
 * It enforces the IDataClient contract strictly using types generated from openapi.yaml.
 */
export class RealDataClient implements IDataClient {
    // In production the frontend (Vercel) and backend (Railway) are different domains.
    // Configure the API origin via Vite env var (must start with VITE_).
    private apiOrigin = getApiOrigin();
    private baseUrl = `${String(this.apiOrigin).replace(/\/$/, '')}/api/v1`;

    private getAuthHeader(): HeadersInit {
        const headers: HeadersInit = {};
        const token = localStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    private getJsonHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
        };
    }

    // Generic request wrapper that aligns with the generated contract would be complex in TS without strict mode
    // For this implementation, we manually align the return types to the domain types, relying on the fact
    // that the contract types (components['schemas']) exactly match the domain types (types.ts).
    private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method,
            headers: this.getJsonHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized (redirect to login in a real app)
                throw new Error("Unauthorized");
            }
            const errorText = await response.text();
            throw new Error(`API Error ${response.status} (${method} ${url}): ${errorText}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : undefined;
    }

    // --- Session & Identity ---

    async getCurrentUser(): Promise<User> {
        const ctx = await this.request<{ user: components['schemas']['User']; org: components['schemas']['Organization'] }>('GET', '/me');
        return ctx.user as any;
    }

    async getCurrentOrg(): Promise<Organization> {
        const ctx = await this.request<{ user: components['schemas']['User']; org: components['schemas']['Organization'] }>('GET', '/me');
        return ctx.org as any;
    }

    async switchRole(_role: UserRole): Promise<void> {
        // This was a MockData convenience. In real mode we don't support role switching without re-auth.
        throw new Error('Role switching is not supported in Real API mode. Please log in as the other user.');
    }

    // --- Voter Management ---

    async getVoters(params?: any): Promise<Voter[]> {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        const res = await this.request<{ voters: components['schemas']['Voter'][] }>('GET', `/voters${queryString}`);
        return (res as any).voters;
    }

    async importVoters(voters: Partial<Voter>[]): Promise<Job> {
        // Backend currently returns { id, status } (202 Accepted)
        const res = await this.request<{ id: string; status: string }>('POST', '/jobs/import-voters', voters);
        return {
            id: (res as any).id,
            org_id: '',
            user_id: '',
            type: 'import_voters',
            status: (res as any).status as any,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: { source: 'json' },
        } as any;
    }

    async uploadVotersFile(file: File): Promise<Job> {
        const form = new FormData();
        form.append('file', file);

        const url = `${this.baseUrl}/imports/voters`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getAuthHeader(),
            body: form,
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`API Error ${response.status} (POST ${url}): ${txt}`);
        }

        const data = await response.json();
        return {
            id: data.id,
            org_id: '',
            user_id: '',
            type: 'import_voters',
            status: data.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: { source: 'file', filename: file.name, size: file.size },
        } as any;
    }

    async addVoter(voter: Partial<Voter>): Promise<Voter> {
        return this.request<components['schemas']['Voter']>('POST', '/voters', voter);
    }

    async updateVoter(voterId: string, updates: Partial<Voter>): Promise<void> {
        await this.request<void>('PATCH', `/voters/${voterId}`, updates);
    }

    // --- List Management ---

    async getWalkLists(): Promise<WalkList[]> {
        return this.request<components['schemas']['WalkList'][]>('GET', '/lists');
    }

    async createWalkList(name: string, voterIds: string[]): Promise<WalkList> {
        // Strict adherence to openapi path /lists POST body
        // Backend expects camelCase voterIds
        const body: any = {
            name,
            voterIds
        };
        return this.request<components['schemas']['WalkList']>('POST', '/lists', body);
    }

    // --- Field Operations (Assignments) ---

    async getAssignments(): Promise<Assignment[]> {
        // Default to 'org' scope for Admin view matching IDataClient expectation
        return this.request<components['schemas']['Assignment'][]>('GET', '/assignments?scope=org');
    }

    async getMyAssignments(): Promise<Assignment[]> {
        return this.request<components['schemas']['Assignment'][]>('GET', '/assignments?scope=me');
    }

    async assignList(listId: string, canvasserId: string): Promise<Assignment> {
        // Backend expects camelCase listId/canvasserId
        const body: any = {
            listId,
            canvasserId
        };
        return this.request<components['schemas']['Assignment']>('POST', '/assignments', body);
    }

    // --- Interaction Logging ---

    async logInteraction(interaction: InteractionCreate): Promise<Interaction> {
        return this.request<components['schemas']['Interaction']>('POST', '/interactions', interaction);
    }

    async getInteractions(): Promise<Interaction[]> {
        return this.request<components['schemas']['Interaction'][]>('GET', '/interactions');
    }

    // --- User Management ---

    async getCanvassers(): Promise<User[]> {
        return this.request<components['schemas']['User'][]>('GET', '/users?role=canvasser');
    }

    async addCanvasser(user: Partial<User>): Promise<User> {
        const body: paths['/users/invite']['post']['requestBody']['content']['application/json'] = {
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'canvasser'
        };
        return this.request<components['schemas']['User']>('POST', '/users/invite', body);
    }

    // --- Platform Infrastructure ---

    async getJob(jobId: string): Promise<Job> {
        return this.request<components['schemas']['Job']>('GET', `/jobs/${jobId}`);
    }

    async getMergeAlertCount(): Promise<{ open_count: number }> {
        return this.request<{ open_count: number }>('GET', `/merge-alerts/count`);
    }

    async getMergeAlerts(status: 'open' | 'resolved' | 'dismissed' = 'open'): Promise<any> {
        return this.request<any>('GET', `/merge-alerts?status=${encodeURIComponent(status)}`);
    }

    async updateMergeAlert(alertId: string, status: 'open' | 'resolved' | 'dismissed'): Promise<void> {
        await this.request<void>('PATCH', `/merge-alerts/${encodeURIComponent(alertId)}`, { status });
    }

    async mergeLeadIntoVoter(leadVoterId: string, importedVoterId: string): Promise<any> {
        return this.request<any>('POST', `/voters/${encodeURIComponent(leadVoterId)}/merge-into/${encodeURIComponent(importedVoterId)}`);
    }

    // --- Phase 3: Campaign Setup (Onboarding) ---

    async getCampaignProfile(): Promise<CampaignProfile | null> {
        return this.request<CampaignProfile | null>('GET', `/campaign/profile`);
    }

    async upsertCampaignProfile(profile: Partial<CampaignProfile>): Promise<CampaignProfile> {
        return this.request<CampaignProfile>('PUT', `/campaign/profile`, profile);
    }

    async getCampaignGoals(): Promise<{ goals: CampaignGoal[] }> {
        return this.request<{ goals: CampaignGoal[] }>('GET', `/campaign/goals`);
    }

    async createCampaignGoal(goal: Partial<CampaignGoal>): Promise<CampaignGoal> {
        return this.request<CampaignGoal>('POST', `/campaign/goals`, goal);
    }

    async getGeographyUnits(): Promise<{ units: GeographyUnit[] }> {
        return this.request<{ units: GeographyUnit[] }>('GET', `/geography/units`);
    }

    async upsertGeographyUnit(unit: Partial<GeographyUnit>): Promise<GeographyUnit> {
        return this.request<GeographyUnit>('POST', `/geography/units`, unit);
    }

    // --- Phase 3: Metrics (Goal Engine + Aggregates) ---

    async getCampaignOverviewMetrics(): Promise<any> {
        return this.request<any>('GET', `/metrics/campaign/overview`);
    }

    async getGoalProgressMetrics(): Promise<any> {
        return this.request<any>('GET', `/metrics/goals`);
    }

    async getVelocityMetrics(): Promise<any> {
        return this.request<any>('GET', `/metrics/velocity`);
    }

    async getGeographyMetrics(): Promise<any> {
        return this.request<any>('GET', `/metrics/geography`);
    }
}
