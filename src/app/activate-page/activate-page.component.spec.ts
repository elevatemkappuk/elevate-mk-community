import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { ActivatePageComponent } from './activate-page.component';

class StubAuthService {
  calls: Array<[string, string, string, string]> = [];
  currentUser = { } as never;
  checkResult = new Subject<{ usable: true }>();
  activationResult: Observable<{ id: number; first_name: string; last_name: string }> = of({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
  checkActivation() { return this.checkResult.asObservable(); }
  releaseCheck(): void { this.checkResult.next({ usable: true }); }
  activate(invitationId: string, token: string, password: string, confirmation: string) {
    this.calls.push([invitationId, token, password, confirmation]);
    return this.activationResult;
  }
}

class StubRouter {
  navigations: string[] = [];
  navigateByUrl(url: string): Promise<boolean> { this.navigations.push(url); return Promise.resolve(true); }
}

describe('ActivatePageComponent', () => {
  let fixture: ComponentFixture<ActivatePageComponent>;
  let component: ActivatePageComponent;
  let auth: StubAuthService;
  let router: StubRouter;

  beforeEach(async () => {
    auth = new StubAuthService();
    router = new StubRouter();
    await TestBed.configureTestingModule({
      imports: [ActivatePageComponent],
      providers: [
        { provide: CommunityAuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'invitationId' ? 'invitation-id' : 'raw-token' } } } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const releaseCheck = () => {
    auth.releaseCheck();
    fixture.detectChanges();
  };

  it('starts in checking state and does not render password fields before validation completes', () => {
    expect(component.state()).toBe('checking');
    expect(fixture.nativeElement.querySelector('#activation-password')).toBeNull();

    releaseCheck();
    expect(component.state()).toBe('form');
    expect(fixture.nativeElement.querySelector('#activation-password')).toBeTruthy();
  });

  it('shows the generic invalid state without password controls when the check fails', () => {
    auth.checkResult.error({ status: 400, body: { code: 'INVALID_OR_EXPIRED_ACTIVATION' } });
    fixture.detectChanges();

    expect(component.state()).toBe('invalid');
    expect(fixture.nativeElement.querySelector('#activation-password')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("This link can't be used.");
  });

  it('enforces safe immediate password rules and matching confirmation', () => {
    releaseCheck();
    component.activationForm.setValue({ password: '123', confirm_password: '123' });
    expect(component.activationForm.invalid).toBe(true);
    expect(component.passwordError()).toBe('Use at least 8 characters.');

    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Different-password-123!' });
    expect(component.activationForm.invalid).toBe(true);
    expect(component.confirmError()).toBe('The passwords do not match.');
  });

  it('disables the primary action until the password form is valid', () => {
    releaseCheck();
    const button = () => fixture.nativeElement.querySelector('.community-primary-action') as HTMLButtonElement;

    expect(button().disabled).toBe(true);

    component.activationForm.setValue({ password: '123', confirm_password: '123' });
    fixture.detectChanges();
    expect(button().disabled).toBe(true);

    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Different-password-123!' });
    fixture.detectChanges();
    expect(button().disabled).toBe(true);

    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });
    fixture.detectChanges();
    expect(button().disabled).toBe(false);

    component.submitting.set(true);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
  });

  it('submits the route credentials once and navigates without requesting another sign-in', () => {
    releaseCheck();
    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });
    component.submit();
    component.submit();
    expect(auth.calls).toEqual([['invitation-id', 'raw-token', 'Secure-password-123!', 'Secure-password-123!']]);
    expect(router.navigations).toEqual(['/community']);
  });

  it('keeps POST invalid-link handling authoritative after a successful check', () => {
    releaseCheck();
    auth.activationResult = throwError(() => ({ status: 400, body: { code: 'INVALID_OR_EXPIRED_ACTIVATION' } }));
    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });

    component.submit();

    expect(router.navigations).toEqual(['/activate/invalid']);
  });
});
