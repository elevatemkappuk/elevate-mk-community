import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { API_CONFIG } from '../core/http/api-config';
import { setCommunityCsrfToken } from '../core/http/community-http.interceptors';

export interface CommunityUser { id: number; first_name: string; last_name: string; }
export interface CommunityApiError { status: number; body: unknown; }
export interface CommunityActivationResponse extends CommunityUser {}
interface CsrfBootstrapResponse { csrf_token: string; }

@Injectable({ providedIn: 'root' })
export class CommunityAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);
  private csrfBootstrap$: Observable<void> | null = null;
  private currentUserRequest$: Observable<CommunityUser | null> | null = null;

  readonly currentUser = signal<CommunityUser | null>(null);
  readonly sessionLoaded = signal(false);

  bootstrapCsrf(): Observable<void> {
    if (!this.csrfBootstrap$) {
      this.csrfBootstrap$ = this.http.get<CsrfBootstrapResponse>(`${this.apiConfig.apiBaseUrl}/auth/csrf/`, { withCredentials: true }).pipe(
        tap(({ csrf_token }) => setCommunityCsrfToken(csrf_token)),
        map(() => void 0),
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError((error: unknown) => { this.csrfBootstrap$ = null; return throwError(() => this.toApiError(error)); }),
      );
    }
    return this.csrfBootstrap$;
  }

  loadCurrentUser(): Observable<CommunityUser | null> {
    if (!this.currentUserRequest$) {
      this.currentUserRequest$ = this.http.get<CommunityUser>(`${this.apiConfig.apiBaseUrl}/community/me/`).pipe(
        tap((user) => { this.currentUser.set(user); this.sessionLoaded.set(true); }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.currentUser.set(null); this.sessionLoaded.set(true); return of(null);
          }
          this.currentUserRequest$ = null;
          return throwError(() => this.toApiError(error));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.currentUserRequest$;
  }

  setCurrentUser(user: CommunityUser): void {
    this.currentUser.set(user);
    this.sessionLoaded.set(true);
    this.currentUserRequest$ = of(user);
  }

  activate(invitationId: string, token: string, password: string, confirmPassword: string): Observable<CommunityActivationResponse> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<CommunityActivationResponse>(
        `${this.apiConfig.apiBaseUrl}/community/activate/${encodeURIComponent(invitationId)}/${encodeURIComponent(token)}/`,
        { password, confirm_password: confirmPassword }, { withCredentials: true },
      )),
      tap((user) => this.setCurrentUser(user)),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  logout(): Observable<void> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<void>(`${this.apiConfig.apiBaseUrl}/auth/logout/`, {}, { withCredentials: true })),
      tap(() => { this.currentUser.set(null); this.sessionLoaded.set(true); this.currentUserRequest$ = of(null); }),
      catchError((error: unknown) => throwError(() => this.toApiError(error))),
    );
  }

  private toApiError(error: unknown): CommunityApiError {
    return error instanceof HttpErrorResponse ? { status: error.status, body: error.error } : { status: 0, body: null };
  }
}
