import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityApiError } from './community-auth.service';

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

  getAccount(): Observable<CommunityAccountResponse> {
    return this.http.get<CommunityAccountResponse>(
      `${this.apiConfig.apiBaseUrl}/community/account/`,
      { withCredentials: true },
    ).pipe(catchError((error: unknown) => throwError(() => this.toApiError(error))));
  }

  private toApiError(error: unknown): CommunityApiError {
    return error instanceof HttpErrorResponse ? { status: error.status, body: error.error } : { status: 0, body: null };
  }
}
