import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { SignInPageComponent } from './sign-in-page.component';

class StubAuthService {
  result = of({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
  calls: Array<[string, string]> = [];
  login(email: string, password: string) {
    this.calls.push([email, password]);
    return this.result;
  }
}

class StubRouter {
  navigations: string[] = [];
  navigateByUrl(url: string): Promise<boolean> { this.navigations.push(url); return Promise.resolve(true); }
}

describe('SignInPageComponent', () => {
  let fixture: ComponentFixture<SignInPageComponent>;
  let component: SignInPageComponent;
  let auth: StubAuthService;
  let router: StubRouter;

  beforeEach(async () => {
    auth = new StubAuthService();
    router = new StubRouter();
    await TestBed.configureTestingModule({
      imports: [SignInPageComponent],
      providers: [
        { provide: CommunityAuthService, useValue: auth },
        { provide: NotificationService, useValue: { error: () => 1 } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SignInPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps Sign In disabled until valid credentials are entered', () => {
    const button = () => fixture.nativeElement.querySelector('.community-primary-action') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    component.signInForm.setValue({ email: 'not-an-email', password: '' });
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    component.signInForm.setValue({ email: 'member@example.com', password: 'password' });
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
  });

  it('uses the current-password autocomplete and toggles visibility', () => {
    const password = () => fixture.nativeElement.querySelector('#sign-in-password') as HTMLInputElement;
    expect(password().autocomplete).toBe('current-password');
    expect(password().type).toBe('password');
    component.togglePassword();
    fixture.detectChanges();
    expect(password().type).toBe('text');
  });

  it('shows generic credential failure and preserves the email', () => {
    auth.result = throwError(() => ({ status: 400, body: { code: 'INVALID_CREDENTIALS' } }));
    component.signInForm.setValue({ email: 'member@example.com', password: 'wrong' });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email or password is incorrect.');
    expect(component.signInForm.controls.email.value).toBe('member@example.com');
    expect(fixture.nativeElement.querySelector('.join-prompt a')?.textContent).toContain('Join the Community');
    expect(fixture.nativeElement.querySelector('.forgot-password-prompt a')?.textContent).toContain('Forgot password?');
  });

  it('shows generic Community access guidance without exposing the eligibility reason', () => {
    auth.result = throwError(() => ({ status: 403, body: { code: 'COMMUNITY_ACCESS_UNAVAILABLE' } }));
    component.signInForm.setValue({ email: 'member@example.com', password: 'password' });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Community access is not available for this account.');
    expect(fixture.nativeElement.textContent).toContain('If you think this is a mistake, please contact Elevate MK.');
    expect(fixture.nativeElement.textContent).not.toContain('former');
    expect(fixture.nativeElement.textContent).not.toContain('archived');
  });

  it('logs in once, disables during submission, and navigates to Community', () => {
    component.signInForm.setValue({ email: 'member@example.com', password: 'password' });
    component.submit();
    expect(auth.calls).toEqual([['member@example.com', 'password']]);
    expect(router.navigations).toEqual(['/community']);
  });
});
