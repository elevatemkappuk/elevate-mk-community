import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { CommunityAccountShellComponent } from './community-account-shell.component';

@Component({
  standalone: true,
  imports: [CommunityAccountShellComponent],
  template: `<app-community-account-shell variant="onboarding"><div account-hero>Hero content</div><div account-form>Form content</div></app-community-account-shell>`,
})
class OnboardingShellHostComponent {}

@Component({
  standalone: true,
  imports: [CommunityAccountShellComponent],
  template: `<app-community-account-shell variant="account-security"><div account-hero>Security hero</div><div account-form>Security form</div></app-community-account-shell>`,
})
class SecurityShellHostComponent {}

@Component({
  standalone: true,
  imports: [CommunityAccountShellComponent],
  template: `<app-community-account-shell variant="account-security" formPosition="raised"><div account-hero>Hero</div><div account-form>Form</div></app-community-account-shell>`,
})
class RaisedSecurityShellHostComponent {}

describe('CommunityAccountShellComponent', () => {
  let fixture: ComponentFixture<OnboardingShellHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingShellHostComponent, SecurityShellHostComponent, RaisedSecurityShellHostComponent], providers: [{ provide: ActivatedRoute, useValue: {} }] }).compileComponents();
    fixture = TestBed.createComponent(OnboardingShellHostComponent);
    fixture.detectChanges();
  });

  it('renders projected hero and form content with the shared header', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-community-header')).toBeTruthy();
    expect(element.querySelector('.account-shell-hero')?.textContent).toContain('Hero content');
    expect(element.querySelector('.account-shell-form-panel')?.textContent).toContain('Form content');
    expect(element.querySelector('.account-shell-onboarding')).toBeTruthy();
  });

  it('supports the account-security presentation', async () => {
    const securityFixture = TestBed.createComponent(SecurityShellHostComponent);
    securityFixture.detectChanges();
    const element = securityFixture.nativeElement as HTMLElement;
    expect(element.querySelector('.account-shell-security')).toBeTruthy();
    expect(element.querySelector('.account-shell-hero')?.textContent).toContain('Security hero');
    expect(element.querySelector('.account-shell-form-panel')?.textContent).toContain('Security form');
  });

  it('supports an opt-in raised form position without changing the security default', () => {
    const raisedFixture = TestBed.createComponent(RaisedSecurityShellHostComponent);
    raisedFixture.detectChanges();
    expect(raisedFixture.nativeElement.querySelector('.account-shell-form-raised')).toBeTruthy();
  });
});
