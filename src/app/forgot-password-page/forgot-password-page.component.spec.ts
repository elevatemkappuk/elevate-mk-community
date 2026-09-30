import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CommunityAuthService } from '../api/community-auth.service';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordPageComponent>;
  let component: ForgotPasswordPageComponent;
  const auth = { requestPasswordReset: vi.fn(() => of({ detail: 'sent' })) };

  beforeEach(async () => {
    auth.requestPasswordReset.mockReset();
    auth.requestPasswordReset.mockReturnValue(of({ detail: 'sent' }));
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
      providers: [
        { provide: CommunityAuthService, useValue: auth },
        { provide: NotificationService, useValue: { error: vi.fn() } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps the request CTA disabled until the email is valid', () => {
    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    component.form.controls.email.setValue('member@example.com');
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
  });

  it('shows generic confirmation and does not expose account existence', () => {
    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('member@example.com');
    expect(fixture.nativeElement.textContent).toContain('If an eligible Elevate MK account exists');
    expect(fixture.nativeElement.textContent).not.toContain('We found your account');
  });

  it('keeps the form available after an unexpected request failure', () => {
    auth.requestPasswordReset.mockReturnValue(throwError(() => ({ status: 0, body: null })));
    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();
    expect(component.submitted()).toBe(false);
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });
});
