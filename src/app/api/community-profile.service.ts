import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityApiError, CommunityAuthService } from './community-auth.service';

export interface CommunityProfileIndustry {
  id: number;
  slug: string;
  label: string;
}

export interface CommunityProfileResponse {
  person: { first_name: string; last_name: string; location: string };
  community: {
    bio: string;
    review_required: boolean;
    photo_url: string | null;
    directory_id: string;
    directory_visible: boolean;
    email_visible: boolean;
    mobile_visible: boolean;
  };
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

export interface CommunityProfileOption { slug: string; label: string; }
export interface CommunityProfileOptions {
  industries: CommunityProfileOption[];
  career_stages: CommunityProfileOption[];
  skills: CommunityProfileOption[];
  interests: CommunityProfileOption[];
}

export interface CommunityProfilePatch {
  person: { first_name: string; last_name: string; location: string };
  community: { bio: string; directory_visible: boolean; email_visible: boolean; mobile_visible: boolean };
  professional: {
    job_title: string;
    company: string;
    industry: string | null;
    career_stage: string | null;
    linkedin_url: string;
  };
  skills: string[];
  interests: string[];
}

@Injectable({ providedIn: 'root' })
export class CommunityProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly auth = inject(CommunityAuthService);

  getProfile(): Observable<CommunityProfileResponse> {
    return this.http.get<CommunityProfileResponse>(
      `${this.apiConfig.apiBaseUrl}/community/profile/`,
      { withCredentials: true },
    ).pipe(
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  updateProfile(payload: CommunityProfilePatch): Observable<CommunityProfileResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.patch<CommunityProfileResponse>(
        `${this.apiConfig.apiBaseUrl}/community/profile/`, payload, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  getProfileOptions(): Observable<CommunityProfileOptions> {
    return this.http.get<CommunityProfileOptions>(
      `${this.apiConfig.apiBaseUrl}/community/profile/options/`, { withCredentials: true },
    ).pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
  }

  acknowledgeProfileReview(): Observable<{ review_required: boolean }> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<{ review_required: boolean }>(
        `${this.apiConfig.apiBaseUrl}/community/profile/review-acknowledgement/`, {}, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  uploadProfilePhoto(photo: File): Observable<CommunityProfileResponse> {
    const body = new FormData();
    body.append('photo', photo);
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityProfileResponse>(
        `${this.apiConfig.apiBaseUrl}/community/profile/photo/`, body, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  removeProfilePhoto(): Observable<CommunityProfileResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.delete<CommunityProfileResponse>(
        `${this.apiConfig.apiBaseUrl}/community/profile/photo/`, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  private toApiError(error: unknown): CommunityApiError {
    return error instanceof HttpErrorResponse
      ? { status: error.status, body: error.error }
      : { status: 0, body: null };
  }
}
