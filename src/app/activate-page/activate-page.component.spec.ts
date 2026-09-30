import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { CommunityAuthService } from '../api/community-auth.service';
import { ActivatePageComponent } from './activate-page.component';

class StubAuthService {
  calls: Array<[string, string, string, string]> = [];
  currentUser = { } as never;
  activate(invitationId: string, token: string, password: string, confirmation: string) {
    this.calls.push([invitationId, token, password, confirmation]);
    return of({ id: 1, first_name: 'Amina', last_name: 'Zulu' });
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

  it('enforces safe immediate password rules and matching confirmation', () => {
    component.activationForm.setValue({ password: '123', confirm_password: '123' });
    expect(component.activationForm.invalid).toBe(true);
    expect(component.passwordError()).toBe('Use at least 8 characters.');

    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Different-password-123!' });
    expect(component.activationForm.invalid).toBe(true);
    expect(component.confirmError()).toBe('The passwords do not match.');
  });

  it('submits the route credentials once and navigates without requesting another sign-in', () => {
    component.activationForm.setValue({ password: 'Secure-password-123!', confirm_password: 'Secure-password-123!' });
    component.submit();
    component.submit();
    expect(auth.calls).toEqual([['invitation-id', 'raw-token', 'Secure-password-123!', 'Secure-password-123!']]);
    expect(router.navigations).toEqual(['/community']);
  });
});
