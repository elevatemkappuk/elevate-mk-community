import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityApiError } from './community-auth.service';

export interface CommunityProfileIndustry {
  id: number;
  slug: string;
  label: string;
}

export interface CommunityProfileResponse {
  person: { first_name: string; last_name: string; location: string };
  community: { bio: string; review_required: boolean };
  professional: {
    job_title: string;
    company: string;
    industry: CommunityProfileIndustry | null;
    career_stage: string | null;
    linkedin_url: string;
  };
  skills: Array<{ id: number; name: string; slug: string }>;
  interests: Array<{ id: number; name: string; slug: string }>;
  membership: { status: string; joined_at: string };
  completion: {
    name: boolean;
    professional_details: boolean;
    bio: boolean;
    skills: boolean;
    interests: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class CommunityProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  getProfile(): Observable<CommunityProfileResponse> {
    return this.http.get<CommunityProfileResponse>(
      `${this.apiConfig.apiBaseUrl}/community/profile/`,
      { withCredentials: true },
    ).pipe(
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  private toApiError(error: unknown): CommunityApiError {
    return error instanceof HttpErrorResponse
      ? { status: error.status, body: error.error }
      : { status: 0, body: null };
  }
}
