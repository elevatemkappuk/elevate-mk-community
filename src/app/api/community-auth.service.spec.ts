import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../core/http/api-config';
import { CommunityAuthService } from './community-auth.service';

describe('CommunityAuthService', () => {
  let service: CommunityAuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityAuthService,
        provideHttpClient(),
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
    csrf.flush({ csrf_token: 'csrf-token' });
    const activation = http.expectOne('/api/v1/community/activate/invitation-id/raw-token/');
    expect(activation.request.body).toEqual({ password: 'Password-123!', confirm_password: 'Password-123!' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    activation.flush({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
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
    csrf.flush({ csrf_token: 'csrf-token' });
    const login = http.expectOne('/api/v1/community/login/');
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'member@example.com', password: 'Community-password-123!' });
    expect(login.request.withCredentials).toBe(true);
    login.flush({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
  });
});
