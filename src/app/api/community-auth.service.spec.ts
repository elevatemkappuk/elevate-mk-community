import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../core/http/api-config';
import { communityCredentialsInterceptor } from '../core/http/community-http.interceptors';
import { CommunityAuthService } from './community-auth.service';

describe('CommunityAuthService', () => {
  let service: CommunityAuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityAuthService,
        provideHttpClient(withInterceptors([communityCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: '/api/v1' } },
      ],
    });
    service = TestBed.inject(CommunityAuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the exact activation body and URL without persisting credentials', () => {
    service.activate('invitation-id', 'raw-token', 'Password-123!', 'Password-123!').subscribe();
    const csrf = http.expectOne('/api/v1/auth/csrf/');
    csrf.flush({ csrf_token: 'csrf-token-a' });
    const activation = http.expectOne('/api/v1/community/activate/invitation-id/raw-token/');
    expect(activation.request.body).toEqual({ password: 'Password-123!', confirm_password: 'Password-123!' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    activation.flush({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
    const refreshedCsrf = http.expectOne('/api/v1/auth/csrf/');
    refreshedCsrf.flush({ csrf_token: 'csrf-token-b' });
  });

  it('checks activation usability through the public activation URL', () => {
    service.checkActivation('invitation-id', 'raw-token').subscribe((response) => {
      expect(response).toEqual({ usable: true });
    });

    const check = http.expectOne('/api/v1/community/activate/invitation-id/raw-token/');
    expect(check.request.method).toBe('GET');
    check.flush({ usable: true });
  });

  it('posts Community login through CSRF bootstrap and stores the minimal user', () => {
    service.login('member@example.com', 'Community-password-123!').subscribe((user) => {
      expect(user.first_name).toBe('Amina');
      expect(service.currentUser()).toEqual(user);
    });
    const csrf = http.expectOne('/api/v1/auth/csrf/');
    csrf.flush({ csrf_token: 'csrf-token-a' });
    const login = http.expectOne('/api/v1/community/login/');
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'member@example.com', password: 'Community-password-123!' });
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.get('X-CSRFToken')).toBe('csrf-token-a');
    login.flush({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
    const refreshedCsrf = http.expectOne('/api/v1/auth/csrf/');
    refreshedCsrf.flush({ csrf_token: 'csrf-token-b' });

    service.logout().subscribe();
    const logout = http.expectOne('/api/v1/auth/logout/');
    expect(logout.request.headers.get('X-CSRFToken')).toBe('csrf-token-b');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('does not refresh CSRF after invalid Community credentials', () => {
    service.login('member@example.com', 'wrong-password').subscribe({ error: (error) => expect(error.status).toBe(400) });
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    http.expectOne('/api/v1/community/login/').flush({ code: 'INVALID_CREDENTIALS' }, { status: 400, statusText: 'Bad Request' });
    http.expectNone('/api/v1/auth/csrf/');
  });

  it('does not refresh CSRF when Community access is unavailable', () => {
    service.login('member@example.com', 'password').subscribe({ error: (error) => expect(error.status).toBe(403) });
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    http.expectOne('/api/v1/community/login/').flush({ code: 'COMMUNITY_ACCESS_UNAVAILABLE' }, { status: 403, statusText: 'Forbidden' });
    http.expectNone('/api/v1/auth/csrf/');
  });

  it('refreshes CSRF after successful activation and uses it for logout', () => {
    service.activate('invitation-id', 'raw-token', 'Password-123!', 'Password-123!').subscribe();
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    const activation = http.expectOne('/api/v1/community/activate/invitation-id/raw-token/');
    expect(activation.request.headers.get('X-CSRFToken')).toBe('csrf-token-a');
    activation.flush({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-b' });

    service.logout().subscribe();
    const logout = http.expectOne('/api/v1/auth/logout/');
    expect(logout.request.headers.get('X-CSRFToken')).toBe('csrf-token-b');
    logout.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('does not refresh CSRF after failed activation', () => {
    service.activate('invitation-id', 'raw-token', 'bad', 'bad').subscribe({ error: (error) => expect(error.status).toBe(400) });
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    http.expectOne('/api/v1/community/activate/invitation-id/raw-token/').flush({ code: 'PASSWORD_VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });
    http.expectNone('/api/v1/auth/csrf/');
  });

  it('requests a Community password reset through CSRF bootstrap without storing credentials', () => {
    service.requestPasswordReset('member@example.com').subscribe((response) => expect(response.detail).toContain('eligible'));
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    const request = http.expectOne('/api/v1/community/password-reset/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token-a');
    request.flush({ detail: "If an eligible Elevate MK account exists for that email address, we've sent password reset instructions." });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('confirms a reset through the Community endpoint with route credentials only in the request', () => {
    service.confirmPasswordReset('uid-value', 'token-value', 'New-password-123!', 'New-password-123!').subscribe();
    http.expectOne('/api/v1/auth/csrf/').flush({ csrf_token: 'csrf-token-a' });
    const request = http.expectOne('/api/v1/community/password-reset/confirm/');
    expect(request.request.body).toEqual({ uid: 'uid-value', token: 'token-value', new_password: 'New-password-123!', confirm_password: 'New-password-123!' });
    expect(request.request.headers.get('X-CSRFToken')).toBe('csrf-token-a');
    request.flush({ detail: 'Your password has been reset successfully.' });
  });
});
