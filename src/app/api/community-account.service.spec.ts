import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CommunityAccountService } from './community-account.service';
import { API_CONFIG } from '../core/http/api-config';

describe('CommunityAccountService', () => {
  let service: CommunityAccountService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityAccountService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'http://api.test/api/v1' } },
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
});
