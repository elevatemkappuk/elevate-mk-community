import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAccountResponse, CommunityAccountService } from '../api/community-account.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityAccountPageComponent } from './community-account-page.component';

const account: CommunityAccountResponse = {
  email: 'member@example.com',
  mobile: { present: true, masked: '+44******0123' },
  email_marketing: { state: 'OPTED_IN' },
  password: { configured: true },
};

describe('CommunityAccountPageComponent', () => {
  let fixture: ComponentFixture<CommunityAccountPageComponent>;
  let accountService: { getAccount: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    accountService = { getAccount: vi.fn(() => of(account)) };
    await TestBed.configureTestingModule({
      imports: [CommunityAccountPageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityAccountService, useValue: accountService },
        { provide: CommunityAuthService, useValue: { logout: vi.fn(() => of(void 0)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
  });

  it('renders the canonical email, masked mobile and member-friendly preference state', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('member@example.com');
    expect(element.textContent).toContain('+44******0123');
    expect(element.textContent).toContain('Subscribed');
    expect(element.textContent).toContain('separate from whether other Community members can see your contact details in Connect');
    expect(element.querySelector('button[type="submit"]')).toBeNull();
  });

  it('renders safe no-mobile and no-preference states', () => {
    accountService.getAccount.mockReturnValue(of({ ...account, mobile: { present: false, masked: null }, email_marketing: { state: 'UNKNOWN' } }));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not added');
    expect(fixture.nativeElement.textContent).toContain('No preference set');
  });

  it('renders the unsubscribed state without adding a mutation control', () => {
    accountService.getAccount.mockReturnValue(of({ ...account, email_marketing: { state: 'OPTED_OUT' } }));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unsubscribed');
    expect(fixture.nativeElement.textContent).not.toContain('Opted out');
    expect(fixture.nativeElement.querySelectorAll('.account-main button').length).toBe(0);
  });

  it('shows a safe loading error and retry control', () => {
    accountService.getAccount.mockReturnValue(throwError(() => ({ status: 500, body: { detail: 'internal' } })));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t load your account');
    expect(fixture.nativeElement.textContent).not.toContain('internal');
    expect(fixture.nativeElement.querySelector('.account-state button')?.textContent).toContain('Try again');
  });
});
