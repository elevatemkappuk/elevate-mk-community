import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

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
  let accountService: { getAccount: ReturnType<typeof vi.fn>; changePassword: ReturnType<typeof vi.fn>; updateMobile: ReturnType<typeof vi.fn>; updateMarketingPreference: ReturnType<typeof vi.fn>; requestEmailChange: ReturnType<typeof vi.fn> };
  let auth: { logout: ReturnType<typeof vi.fn>; requestPasswordReset: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    accountService = { getAccount: vi.fn(() => of(account)), changePassword: vi.fn(() => of({ detail: 'Your password has been changed successfully.' })), updateMobile: vi.fn(() => of(account)), updateMarketingPreference: vi.fn(() => of(account)), requestEmailChange: vi.fn(() => of({ status: 'VERIFICATION_REQUIRED', detail: 'Check your new email address for a verification link.' })) };
    auth = { logout: vi.fn(() => of(void 0)), requestPasswordReset: vi.fn(() => of({ detail: 'If the account is eligible, a password reset email will be sent shortly.' })) };
    await TestBed.configureTestingModule({
      imports: [CommunityAccountPageComponent],
      providers: [
        provideRouter([]),
        { provide: CommunityAccountService, useValue: accountService },
        { provide: CommunityAuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
  });

  it('renders the canonical email, masked mobile and member-friendly preference state', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('member@example.com');
    expect(element.textContent).toContain('+44******0123');
    expect(element.textContent).toContain('Email updates are on');
    expect(element.textContent).toContain('separate from whether other Community members can see your contact details in Connect');
    expect(element.querySelector('button[type="submit"]')).toBeNull();
  });

  it('navigates to the signed-out destination after a successful 204 logout', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.signOut();
    fixture.detectChanges();

    expect(fixture.componentInstance.signingOut()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/join');
    navigate.mockRestore();
  });

  it('clears the signing-out state when logout fails and ignores repeated clicks', () => {
    const response = new Subject<void>();
    auth.logout.mockReturnValue(response.asObservable());
    fixture.componentInstance.signOut();
    fixture.componentInstance.signOut();
    fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.signingOut()).toBe(true);
    response.error({ status: 500, body: null });
    expect(fixture.componentInstance.signingOut()).toBe(false);
  });

  it('renders safe no-mobile and no-preference states', () => {
    accountService.getAccount.mockReturnValue(of({ ...account, mobile: { present: false, masked: null }, email_marketing: { state: 'UNKNOWN' } }));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not added');
    expect(fixture.nativeElement.textContent).toContain('No preference set');
  });

  it('submits a verified email-change request and shows the safe verification state', () => {
    fixture.componentInstance.beginEmailChange();
    fixture.componentInstance.emailChangeForm.setValue({ new_email: 'new@example.com', current_password: 'Current-password-123!' });
    fixture.componentInstance.submitEmailChange();
    fixture.detectChanges();

    expect(accountService.requestEmailChange).toHaveBeenCalledWith({ new_email: 'new@example.com', current_password: 'Current-password-123!' });
    expect(fixture.nativeElement.textContent).toContain('We\'ve sent a verification link to your new email address.');
    expect(fixture.componentInstance.emailEditorOpen()).toBe(false);
    expect(fixture.componentInstance.showEmailPassword()).toBe(false);
  });

  it('keeps email-change password visibility independent and cancel resets the form', () => {
    fixture.componentInstance.beginEmailChange();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#account-email-password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.email-change-form .visibility-button') as HTMLButtonElement;
    expect(input.type).toBe('password');
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Show current password');
    input.value = 'Current-password-123!';
    input.dispatchEvent(new Event('input'));
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(input.value).toBe('Current-password-123!');
    expect(toggle.getAttribute('aria-label')).toBe('Hide current password');
    fixture.componentInstance.cancelEmailChange();
    expect(fixture.componentInstance.emailChangeForm.getRawValue()).toEqual({ new_email: '', current_password: '' });
    expect(fixture.componentInstance.showEmailPassword()).toBe(false);
  });

  it('renders the unsubscribed state without adding a mutation control', () => {
    accountService.getAccount.mockReturnValue(of({ ...account, email_marketing: { state: 'OPTED_OUT' } }));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email updates are off');
    expect(fixture.nativeElement.textContent).not.toContain('Opted out');
    expect(fixture.nativeElement.querySelectorAll('.contact-actions button').length).toBe(2);
  });

  it('shows a safe loading error and retry control', () => {
    accountService.getAccount.mockReturnValue(throwError(() => ({ status: 500, body: { detail: 'internal' } })));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('We couldn’t load your account');
    expect(fixture.nativeElement.textContent).not.toContain('internal');
    expect(fixture.nativeElement.querySelector('.account-state button')?.textContent).toContain('Try again');
  });

  it('keeps UNKNOWN explicit and offers separate receive/no-thanks choices without loading mutation', () => {
    accountService.getAccount.mockReturnValue(of({ ...account, email_marketing: { state: 'UNKNOWN' } }));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No preference set');
    expect(fixture.nativeElement.textContent).toContain('You have not chosen whether to receive');
    expect(fixture.nativeElement.textContent).not.toContain('Email updates are off');
    expect(fixture.nativeElement.querySelectorAll('.marketing-choice-actions button')).toHaveLength(2);
    expect(accountService.updateMarketingPreference).not.toHaveBeenCalled();
  });

  it('saves an explicit marketing choice and renders the authoritative response', () => {
    const optedOut = { ...account, email_marketing: { state: 'OPTED_OUT' as const } };
    accountService.getAccount.mockReturnValue(of({ ...account, email_marketing: { state: 'UNKNOWN' } }));
    accountService.updateMarketingPreference.mockReturnValue(of(optedOut));
    fixture = TestBed.createComponent(CommunityAccountPageComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.marketing-choice-actions button:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(accountService.updateMarketingPreference).toHaveBeenCalledWith({ email_marketing: false });
    expect(fixture.nativeElement.textContent).toContain('Email updates are off');
    expect(fixture.nativeElement.textContent).toContain('Email updates are now off.');
  });

  it('uses the switch for an existing preference and preserves the Connect privacy explanation', () => {
    fixture.componentInstance.saveMarketingPreference(true);
    fixture.detectChanges();
    expect(accountService.updateMarketingPreference).toHaveBeenCalledWith({ email_marketing: true });
    expect(fixture.nativeElement.textContent).toContain('separate from whether other Community members can see your contact details in Connect');
  });

  it('opens an accessible change-password form with semantic autocomplete fields', () => {
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('.password-entry-actions > button[type="button"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('#current-password')?.getAttribute('autocomplete')).toBe('current-password');
    expect(element.querySelector('#new-password')?.getAttribute('autocomplete')).toBe('new-password');
    expect(element.querySelector('#confirm-new-password')?.getAttribute('autocomplete')).toBe('new-password');
    expect(element.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('opens inline recovery without navigating and uses the authenticated account email', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const prompt = fixture.nativeElement.querySelector('.password-recovery-prompt button') as HTMLButtonElement;
    expect(prompt.type).toBe('button');
    prompt.click();
    fixture.detectChanges();
    const securityCard = fixture.nativeElement.querySelector('.security-card') as HTMLElement;
    const recoveryAction = securityCard.querySelector('.password-recovery-prompt button') as HTMLButtonElement;
    expect(securityCard.querySelector('.password-recovery-prompt')).toBeNull();
    expect(securityCard.textContent).toContain("We'll send a password reset link to your account email.");
    expect(securityCard.textContent).toContain('member@example.com');
    expect(recoveryAction).toBeNull();
    expect(securityCard.querySelector('input')).toBeNull();
    expect(securityCard.querySelector('a[href*="forgot-password"]')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends the reset request with only the canonical account email and stays on the account page', () => {
    fixture.componentInstance.beginPasswordRecovery();
    fixture.componentInstance.submitPasswordRecovery();
    fixture.detectChanges();
    expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('member@example.com');
    expect(fixture.componentInstance.passwordRecoverySuccess()).toContain('If the account is eligible');
    expect(fixture.componentInstance.passwordRecoveryOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('/forgot-password');
  });

  it('prevents duplicate recovery requests and allows the panel to be cancelled cleanly', () => {
    const response = new Subject<{ detail: string }>();
    auth.requestPasswordReset.mockReturnValue(response.asObservable());
    fixture.componentInstance.beginPasswordRecovery();
    fixture.componentInstance.submitPasswordRecovery();
    fixture.componentInstance.submitPasswordRecovery();
    expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.passwordRecoverySubmitting()).toBe(true);
    response.next({ detail: 'ok' });
    response.complete();
    fixture.componentInstance.cancelPasswordRecovery();
    expect(fixture.componentInstance.passwordRecoveryOpen()).toBe(false);
    expect(fixture.componentInstance.passwordRecoverySuccess()).toBe('');
  });

  it('keeps the normal change-password flow available and unchanged', () => {
    const securityCard = fixture.nativeElement.querySelector('.security-card') as HTMLElement;
    expect(securityCard.querySelector('.password-recovery-prompt')).not.toBeNull();
    (securityCard.querySelector('button.account-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(securityCard.querySelector('button[type="submit"]')).not.toBeNull();
    expect(securityCard.querySelector('.password-recovery-panel')).toBeNull();
  });

  it('renders three independent hidden SHOW controls with dynamic accessible labels', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.detectChanges();
    const controls = Array.from(fixture.nativeElement.querySelectorAll('.visibility-button')) as HTMLButtonElement[];
    expect(controls).toHaveLength(3);
    expect(controls.map((control) => control.type)).toEqual(['button', 'button', 'button']);
    expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual(['Show current password', 'Show new password', 'Show password confirmation']);
    expect(controls.every((control) => control.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(controls.map((control) => control.textContent?.trim())).toEqual(['Show', 'Show', 'Show']);
    expect(fixture.nativeElement.querySelector('.password-form svg')).toBeNull();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.password-form input')).map((input) => (input as HTMLInputElement).type)).toEqual(['password', 'password', 'password']);
  });

  it('toggles each password independently without changing its value', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.detectChanges();
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('.password-form input')) as HTMLInputElement[];
    const controls = Array.from(fixture.nativeElement.querySelectorAll('.visibility-button')) as HTMLButtonElement[];
    controls[0].click();
    fixture.detectChanges();
    expect(inputs.map((input) => input.type)).toEqual(['text', 'password', 'password']);
    expect(inputs.map((input) => input.value)).toEqual(['Current-password-123!', 'New-password-456!', 'New-password-456!']);
    expect(controls[0].getAttribute('aria-label')).toBe('Hide current password');
    expect(controls[1].getAttribute('aria-label')).toBe('Show new password');
    controls[1].click();
    controls[2].click();
    fixture.detectChanges();
    expect(inputs.map((input) => input.type)).toEqual(['text', 'text', 'text']);
    expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual(['Hide current password', 'Hide new password', 'Hide password confirmation']);
    expect(controls.every((control) => control.getAttribute('aria-pressed') === 'true')).toBe(true);
  });

  it('resets all password visibility after cancel and successful change', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.visibility-button') as HTMLButtonElement).click();
    fixture.componentInstance.cancelPasswordChange();
    fixture.componentInstance.beginPasswordChange();
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.password-form input')).every((input) => (input as HTMLInputElement).type === 'password')).toBe(true);
    (fixture.nativeElement.querySelector('.visibility-button') as HTMLButtonElement).click();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    fixture.componentInstance.beginPasswordChange();
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.password-form input')).every((input) => (input as HTMLInputElement).type === 'password')).toBe(true);
  });

  it('keeps the password action disabled for mismatch and enables it for a valid form', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'Different-password-789!' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    fixture.componentInstance.passwordForm.controls.confirm_password.setValue('New-password-456!');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('submits the expected values, clears the form and shows success', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    expect(accountService.changePassword).toHaveBeenCalledWith({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    expect(fixture.nativeElement.textContent).toContain('Your password has been changed successfully.');
    expect(fixture.componentInstance.passwordForm.getRawValue()).toEqual({ current_password: '', new_password: '', confirm_password: '' });
  });

  it('keeps current-password API errors member-safe and visible inline', () => {
    accountService.changePassword.mockReturnValue(throwError(() => ({ body: { fields: { current_password: ['The current password is incorrect.'] } } })));
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'wrong-password', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The current password is incorrect.');
    expect(fixture.nativeElement.querySelector('#password-validation-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#current-password-error')).toBeNull();
  });

  it('places mismatch and multiple password validation messages in one shared area', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'short', confirm_password: 'different' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    const errorArea = fixture.nativeElement.querySelector('#password-validation-error') as HTMLElement;
    expect(errorArea).not.toBeNull();
    expect(errorArea.textContent).toContain('Use at least 8 characters.');
    expect(errorArea.textContent).toContain('Passwords do not match.');
    expect(fixture.nativeElement.querySelector('.field-group .field-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('#new-password')?.getAttribute('aria-describedby')).toBe('password-validation-error');
    expect(fixture.nativeElement.querySelector('#confirm-new-password')?.getAttribute('aria-describedby')).toBe('password-validation-error');
    expect(fixture.nativeElement.querySelector('#new-password')?.getAttribute('aria-invalid')).toBe('true');
    accountService.changePassword.mockReturnValue(throwError(() => ({ body: { fields: { current_password: ['Current password is incorrect.', 'Try again.'], new_password: ['Password is too common.'] } } })));
    fixture.componentInstance.passwordForm.setValue({ current_password: 'wrong', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('#password-validation-error li')).toHaveLength(3);
  });

  it('does not render an empty validation area and clears errors on cancel and success', () => {
    fixture.componentInstance.beginPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password-validation-error')).toBeNull();
    fixture.componentInstance.passwordForm.setValue({ current_password: '', new_password: 'short', confirm_password: 'different' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password-validation-error')).not.toBeNull();
    fixture.componentInstance.cancelPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password-validation-error')).toBeNull();
    fixture.componentInstance.beginPasswordChange();
    fixture.componentInstance.passwordForm.setValue({ current_password: 'Current-password-123!', new_password: 'New-password-456!', confirm_password: 'New-password-456!' });
    fixture.componentInstance.submitPasswordChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password-validation-error')).toBeNull();
  });

  it('keeps the masked mobile in the read view and starts editing with an empty field', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('+44******0123');
    (element.querySelector('.account-card[aria-labelledby="contact-title"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('#account-mobile')).not.toBeNull();
    expect((element.querySelector('#account-mobile') as HTMLInputElement).value).toBe('');
    expect(element.textContent).toContain('+44******0123');
    expect(element.querySelector('#account-phone-region')).not.toBeNull();
  });

  it('submits add/change mobile values and replaces the authoritative summary', () => {
    fixture.componentInstance.beginMobileEdit();
    fixture.componentInstance.mobileForm.setValue({ mobile: '07123456789', phone_region: 'GB' });
    fixture.componentInstance.saveMobile();
    fixture.detectChanges();
    expect(accountService.updateMobile).toHaveBeenCalledWith({ mobile: '07123456789', phone_region: 'GB' });
    expect(fixture.nativeElement.textContent).toContain('Your mobile number has been updated.');
  });

  it('requires explicit removal confirmation and sends an empty mobile DTO', () => {
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('.account-card[aria-labelledby="contact-title"] .secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Remove your mobile number?');
    expect(accountService.updateMobile).not.toHaveBeenCalled();
    fixture.componentInstance.confirmMobileRemoval();
    fixture.detectChanges();
    expect(accountService.updateMobile).toHaveBeenCalledWith({ mobile: '', phone_region: '' });
    expect(element.textContent).toContain('Your mobile number has been removed.');
  });
});
