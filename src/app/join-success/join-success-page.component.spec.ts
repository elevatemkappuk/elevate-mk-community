import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { JoinSuccessPageComponent } from './join-success-page.component';

describe('JoinSuccessPageComponent', () => {
  let fixture: ComponentFixture<JoinSuccessPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinSuccessPageComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    }).compileComponents();
    fixture = TestBed.createComponent(JoinSuccessPageComponent);
    fixture.detectChanges();
  });

  it('renders the generic membership confirmation and external exit action', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain("You're in.");
    expect(element.textContent).toContain('Your membership is now active.');
    expect(element.querySelector('h2')?.textContent).toContain('Check your email');
    expect(element.textContent).toContain('We\'ve sent you an email to set up your Elevate MK Community account.');
    expect(element.textContent).toContain('Use the link in the email to create your password and sign in.');
    expect(element.textContent).toContain("Can't see it? Check your spam or junk folder.");
    expect(element.querySelector('.success-action')?.textContent).toContain('Back to Elevate MK');
    expect(element.querySelector('.success-action')?.getAttribute('href')).toBe('https://elevatemk.org/');
    expect(element.querySelector('.sign-in-button')).toBeNull();
    expect(element.querySelector('input, select, form')).toBeNull();
    expect(element.textContent).not.toContain('check your email');
    expect(element.textContent).not.toContain('resend');
    expect(element.textContent).not.toContain('activation token');
  });
});
