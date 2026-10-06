import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityEmailChangeVerifyPageComponent } from './community-email-change-verify-page.component';

describe('CommunityEmailChangeVerifyPageComponent', () => {
  let fixture: ComponentFixture<CommunityEmailChangeVerifyPageComponent>;
  let auth: { verifyEmailChange: ReturnType<typeof vi.fn>; clearCurrentUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { verifyEmailChange: vi.fn(() => of({ status: 'EMAIL_UPDATED', detail: 'Email updated.' })), clearCurrentUser: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CommunityEmailChangeVerifyPageComponent],
      providers: [
        provideLocationMocks(),
        { provide: CommunityAuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ requestId: 'request-id', token: 'token-value' }) } } },
      ],
    });
    fixture = TestBed.createComponent(CommunityEmailChangeVerifyPageComponent);
    fixture.detectChanges();
  });

  it('verifies once, clears the session state and renders the success action', () => {
    expect(auth.verifyEmailChange).toHaveBeenCalledWith('request-id', 'token-value');
    expect(auth.clearCurrentUser).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Email address updated');
    expect(fixture.nativeElement.querySelector('a[routerlink="/sign-in"]')).toBeTruthy();
  });

  it('renders a retryable transient error without exposing token details', () => {
    auth.verifyEmailChange.mockReturnValue(throwError(() => ({ status: 503, body: null })));
    fixture = TestBed.createComponent(CommunityEmailChangeVerifyPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("We couldn't complete this request");
    expect(fixture.nativeElement.textContent).not.toContain('token-value');
    expect(fixture.nativeElement.querySelector('button[type="button"]')).toBeTruthy();
  });
});
