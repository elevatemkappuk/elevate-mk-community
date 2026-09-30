import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { API_CONFIG } from '../core/http/api-config';
import { setCommunityCsrfToken } from '../core/http/community-http.interceptors';

export interface CommunityJoinRequest {
  first_name: string;
  last_name: string;
  gender: string;
  age_range: string;
  email: string;
  mobile: string;
  phone_region: string;
  location: string;
  industry: string;
  job_title: string;
  linkedin_url: string;
  email_marketing_opt_in: boolean;
}

export interface CommunityJoinAcceptedResponse {
  status: 'accepted';
  message: string;
}

export interface CommunityJoinApiError {
  status: number;
  body: unknown;
}

interface CsrfBootstrapResponse {
  csrf_token: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityJoinService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private csrfBootstrap$: Observable<void> | null = null;

  submit(request: CommunityJoinRequest, idempotencyKey: string): Observable<CommunityJoinAcceptedResponse> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityJoinAcceptedResponse>(
        `${this.apiConfig.apiBaseUrl}/community/join/`,
        request,
        { headers: { 'Idempotency-Key': idempotencyKey }, withCredentials: true },
      )),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  private bootstrapCsrf(): Observable<void> {
    if (!this.csrfBootstrap$) {
      this.csrfBootstrap$ = this.http
        .get<CsrfBootstrapResponse>(`${this.apiConfig.apiBaseUrl}/auth/csrf/`, { withCredentials: true })
        .pipe(
          tap(({ csrf_token }) => setCommunityCsrfToken(csrf_token)),
          map(() => void 0),
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((error: unknown) => {
            this.csrfBootstrap$ = null;
            return throwError(() => this.toApiError(error));
          }),
        );
    }

    return this.csrfBootstrap$;
  }

  private toApiError(error: unknown): CommunityJoinApiError {
    if (error instanceof HttpErrorResponse) {
      return { status: error.status, body: error.error };
    }

    return { status: 0, body: null };
  }
}
