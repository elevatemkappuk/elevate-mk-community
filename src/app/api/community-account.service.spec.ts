import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { CommunityAccountService } from './community-account.service';
import { API_CONFIG } from '../core/http/api-config';
import { CommunityAuthService } from './community-auth.service';

describe('CommunityAccountService', () => {
  let service: CommunityAccountService;
  let http: HttpTestingController;
  let bootstrapCsrf: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    bootstrapCsrf = vi.fn(() => of(void 0));
    TestBed.configureTestingModule({
      providers: [
        CommunityAccountService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'http://api.test/api/v1' } },
        { provide: CommunityAuthService, useValue: { bootstrapCsrf } },
      ],
    });
    service = TestBed.inject(CommunityAccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the member-safe account summary without CSRF bootstrap', () => {
    service.getAccount().subscribe((response) => expect(response.email).toBe('member@example.com'));
    const request = http.expectOne('http://api.test/api/v1/community/account/');
    expect(request.request.method).toBe('GET');
    request.flush({ email: 'member@example.com', mobile: { present: false, masked: null }, email_marketing: { state: 'UNKNOWN' }, password: { configured: true } });
  });

  it('bootstraps CSRF and sends only the password-change DTO', () => {
    service.changePassword({ current_password: 'old', new_password: 'new-password', confirm_password: 'new-password' }).subscribe();
    const request = http.expectOne('http://api.test/api/v1/community/account/password/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ current_password: 'old', new_password: 'new-password', confirm_password: 'new-password' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ detail: 'Your password has been changed successfully.' });
  });

  it('bootstraps CSRF and sends the mobile PATCH DTO', () => {
    service.updateMobile({ mobile: '07123456789', phone_region: 'GB' }).subscribe((response) => expect(response.mobile.present).toBe(true));
    const request = http.expectOne('http://api.test/api/v1/community/account/mobile/');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ mobile: '07123456789', phone_region: 'GB' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ email: 'member@example.com', mobile: { present: true, masked: '+44******6789' }, email_marketing: { state: 'UNKNOWN' }, password: { configured: true } });
  });

  it('bootstraps CSRF and sends the verified email-change DTO', () => {
    service.requestEmailChange({ new_email: 'new@example.com', current_password: 'old-password' }).subscribe((response) => expect(response.status).toBe('VERIFICATION_REQUIRED'));
    expect(bootstrapCsrf).toHaveBeenCalledTimes(1);
    const request = http.expectOne('http://api.test/api/v1/community/account/email-change/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ new_email: 'new@example.com', current_password: 'old-password' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ status: 'VERIFICATION_REQUIRED', detail: 'Check your new email address for a verification link.' });
  });

  it('bootstraps CSRF and sends the email marketing PATCH DTO', () => {
    service.updateMarketingPreference({ email_marketing: false }).subscribe((response) => expect(response.email_marketing.state).toBe('OPTED_OUT'));
    expect(bootstrapCsrf).toHaveBeenCalledTimes(1);
    const request = http.expectOne('http://api.test/api/v1/community/account/marketing-preference/');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ email_marketing: false });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ email: 'member@example.com', mobile: { present: false, masked: null }, email_marketing: { state: 'OPTED_OUT' }, password: { configured: true } });
  });
});
