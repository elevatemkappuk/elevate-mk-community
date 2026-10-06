import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityApiError, CommunityAuthService } from './community-auth.service';

export interface CommunityPasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface CommunityMobileUpdateRequest {
  mobile: string;
  phone_region: string;
}

export interface CommunityMarketingPreferenceRequest {
  email_marketing: boolean;
}

export interface CommunityEmailChangeRequest {
  new_email: string;
  current_password: string;
}

export interface CommunityAccountResponse {
  email: string;
  mobile: { present: boolean; masked: string | null };
  email_marketing: { state: 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT' };
  password: { configured: boolean };
}

@Injectable({ providedIn: 'root' })
export class CommunityAccountService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private readonly auth = inject(CommunityAuthService);

  getAccount(): Observable<CommunityAccountResponse> {
    return this.http.get<CommunityAccountResponse>(
      `${this.apiConfig.apiBaseUrl}/community/account/`,
      { withCredentials: true },
    ).pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
  }

  changePassword(request: CommunityPasswordChangeRequest): Observable<{ detail: string }> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<{ detail: string }>(
        `${this.apiConfig.apiBaseUrl}/community/account/password/`, request, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  requestEmailChange(request: CommunityEmailChangeRequest): Observable<{ status: 'VERIFICATION_REQUIRED' | 'UNCHANGED'; detail: string }> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<{ status: 'VERIFICATION_REQUIRED' | 'UNCHANGED'; detail: string }>(
        `${this.apiConfig.apiBaseUrl}/community/account/email-change/`, request, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  updateMobile(request: CommunityMobileUpdateRequest): Observable<CommunityAccountResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.patch<CommunityAccountResponse>(
        `${this.apiConfig.apiBaseUrl}/community/account/mobile/`, request, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  updateMarketingPreference(request: CommunityMarketingPreferenceRequest): Observable<CommunityAccountResponse> {
    return this.auth.bootstrapCsrf().pipe(
      switchMap(() => this.http.patch<CommunityAccountResponse>(
        `${this.apiConfig.apiBaseUrl}/community/account/marketing-preference/`, request, { withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  private toApiError(error: unknown): CommunityApiError {
    return error instanceof HttpErrorResponse ? { status: error.status, body: error.error } : { status: 0, body: null };
  }
}
