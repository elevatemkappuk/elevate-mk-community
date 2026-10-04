import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityAuthService } from './community-auth.service';

export interface IndustryOption {
  slug: string;
  label: string;
}

export interface DirectoryTaxonomyOption {
  slug: string;
  label: string;
}

export interface DirectoryMember {
  directory_id: string;
  photo_url: string | null;
  first_name: string;
  last_name: string;
  location: string;
  professional: {
    job_title: string;
    company: string;
    industry: DirectoryTaxonomyOption | null;
  };
  skills: DirectoryTaxonomyOption[];
  interests: DirectoryTaxonomyOption[];
}

export type DirectoryRelationshipState = 'NO_RELATIONSHIP' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'CONNECTED';

export interface DirectoryRelationship {
  state: DirectoryRelationshipState;
  connection_id: string | null;
  can_connect: boolean;
  can_accept: boolean;
  can_decline: boolean;
  can_remove: boolean;
}

export interface ConnectionMutationResponse {
  connection_id: string;
  member: DirectoryMember;
}

export interface DirectoryDetail {
  directory_id: string;
  photo_url: string | null;
  first_name: string;
  last_name: string;
  location: string;
  bio: string;
  professional: {
    job_title: string;
    company: string;
    industry: DirectoryTaxonomyOption | null;
    career_stage: string | null;
    linkedin_url: string;
  };
  skills: DirectoryTaxonomyOption[];
  interests: DirectoryTaxonomyOption[];
  contact: { email: string | null; mobile: string | null };
  relationship: DirectoryRelationship;
}

export interface DirectoryPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: DirectoryMember[];
}

export interface DirectoryQuery {
  q?: string;
  industry?: string;
  skill?: string;
  interest?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class CommunityApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly auth = inject(CommunityAuthService);

  getIndustries(): Observable<IndustryOption[]> {
    return this.http.get<IndustryOption[]>(`${this.apiConfig.apiBaseUrl}/community/industries/`);
  }

  getDirectory(query: DirectoryQuery = {}): Observable<DirectoryPage> {
    let params = new HttpParams();
    for (const key of ['q', 'industry', 'skill', 'interest'] as const) {
      const value = query[key]?.trim();
      if (value) params = params.set(key, value);
    }
    if (query.page && query.page > 1) params = params.set('page', query.page);
    if (query.page_size) params = params.set('page_size', query.page_size);

    return this.http.get<DirectoryPage>(`${this.apiConfig.apiBaseUrl}/community/directory/`, {
      params,
      withCredentials: true,
    });
  }

  getDirectoryProfile(directoryId: string): Observable<DirectoryDetail> {
    return this.http.get<DirectoryDetail>(
      `${this.apiConfig.apiBaseUrl}/community/directory/${encodeURIComponent(directoryId)}/`,
      { withCredentials: true },
    );
  }

  sendConnectionRequest(directoryId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/requests/`,
        { directory_id: directoryId },
        { withCredentials: true },
      )),
    );
  }

  acceptConnection(connectionId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/accept/`,
        {},
        { withCredentials: true },
      )),
    );
  }

  declineConnection(connectionId: string): Observable<ConnectionMutationResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<ConnectionMutationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/decline/`,
        {},
        { withCredentials: true },
      )),
    );
  }

  removeConnection(connectionId: string): Observable<void> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.delete<void>(
        `${this.apiConfig.apiBaseUrl}/community/connections/${encodeURIComponent(connectionId)}/`,
        { withCredentials: true },
      )),
    );
  }
}
