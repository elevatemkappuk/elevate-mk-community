import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CommunityAuthService } from '../api/community-auth.service';
import { ResetPasswordPageComponent } from './reset-password-page.component';

describe('ResetPasswordPageComponent', () => {
  let fixture: ComponentFixture<ResetPasswordPageComponent>;
  let component: ResetPasswordPageComponent;
  const auth = { confirmPasswordReset: vi.fn(() => of({ detail: 'reset' })) };

  beforeEach(async () => {
    auth.confirmPasswordReset.mockReset();
    auth.confirmPasswordReset.mockReturnValue(of({ detail: 'reset' }));
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        { provide: CommunityAuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['uid', 'uid-value'], ['token', 'token-value']]) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResetPasswordPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps the reset CTA disabled for invalid and mismatched passwords', () => {
    const button = () => fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    component.form.setValue({ password: 'Secure-password-123!', confirm_password: 'Different-password-123!' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Passwords do not match.');
    expect(button().disabled).toBe(true);
    component.form.controls.confirm_password.setValue('Secure-password-123!');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Passwords do not match.');
    expect(button().disabled).toBe(false);
  });

  it('passes route values to the shared confirm endpoint and shows success', () => {
    component.form.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });
    component.submit();
    fixture.detectChanges();
    expect(auth.confirmPasswordReset).toHaveBeenCalledWith('uid-value', 'token-value', 'Secure-password-123!', 'Secure-password-123!');
    expect(fixture.nativeElement.textContent).toContain('Your Elevate MK account password has been updated.');
    expect(fixture.nativeElement.querySelector('a[href="/sign-in"]')).not.toBeNull();
  });

  it('shows a generic terminal state for invalid or expired links', () => {
    auth.confirmPasswordReset.mockReturnValue(throwError(() => ({ status: 400, body: { code: 'invalid_password_reset_token' } })));
    component.form.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("This link can't be used");
    expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')).not.toBeNull();
  });
});
