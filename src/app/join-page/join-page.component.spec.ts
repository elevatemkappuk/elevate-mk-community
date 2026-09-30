import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { CommunityApiService, IndustryOption } from '../api/community-api.service';
import { CommunityJoinAcceptedResponse, CommunityJoinRequest, CommunityJoinService } from '../api/community-join.service';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { JoinPageComponent } from './join-page.component';

class StubCommunityApiService {
  calls = 0;
  response: Observable<IndustryOption[]> = of([
    { slug: 'technology', label: 'Technology' },
    { slug: 'finance', label: 'Finance' },
  ]);

  getIndustries(): Observable<IndustryOption[]> {
    this.calls += 1;
    return this.response;
  }
}

class StubCommunityJoinService {
  calls = 0;
  requests: CommunityJoinRequest[] = [];
  keys: string[] = [];
  response: Observable<CommunityJoinAcceptedResponse> = of({
    status: 'accepted',
    message: 'Accepted.',
  });

  submit(request: CommunityJoinRequest, key: string): Observable<CommunityJoinAcceptedResponse> {
    this.calls += 1;
    this.requests.push(request);
    this.keys.push(key);
    return this.response;
  }
}

class StubRouter {
  navigations: Array<{ url: string; extras: { replaceUrl?: boolean } }> = [];

  navigateByUrl(url: string, extras: { replaceUrl?: boolean }): Promise<boolean> {
    this.navigations.push({ url, extras });
    return Promise.resolve(true);
  }
}

describe('JoinPageComponent', () => {
  let fixture: ComponentFixture<JoinPageComponent>;
  let component: JoinPageComponent;
  let communityApi: StubCommunityApiService;
  let communityJoin: StubCommunityJoinService;
  let router: StubRouter;

  beforeEach(async () => {
    communityApi = new StubCommunityApiService();
    communityJoin = new StubCommunityJoinService();
    router = new StubRouter();
    await TestBed.configureTestingModule({
      imports: [JoinPageComponent],
      providers: [
        { provide: CommunityApiService, useValue: communityApi },
        { provide: CommunityJoinService, useValue: communityJoin },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the Join page and its reactive form', () => {
    expect(component).toBeTruthy();
    expect(component.joinForm).toBeTruthy();
  });

  it('includes the real membership controls with the correct optional fields', () => {
    const controls = component.joinForm.controls;

    expect(Object.keys(controls)).toEqual([
      'first_name',
      'last_name',
      'gender',
      'age_range',
      'email',
      'mobile',
      'phone_region',
      'location',
      'industry',
      'job_title',
      'linkedin_url',
      'email_marketing_opt_in',
    ]);
    expect(controls.mobile.hasValidator).toBeDefined();
    expect(controls.linkedin_url.hasValidator).toBeDefined();
  });

  it('defaults email marketing opt-in to false without affecting membership validity', () => {
    const form = component.joinForm;

    expect(form.controls.email_marketing_opt_in.value).toBe(false);
    expect(form.controls.email_marketing_opt_in.valid).toBe(true);
    expect(form.valid).toBe(false);

    form.patchValue({
      first_name: 'Amina',
      last_name: 'Zulu',
      gender: 'FEMALE',
      age_range: '30_34',
      email: 'amina@example.com',
      location: 'Milton Keynes',
      industry: 'technology',
      job_title: 'Engineer',
    });

    expect(form.valid).toBe(true);
    form.controls.email_marketing_opt_in.setValue(true);
    expect(form.valid).toBe(true);
  });

  it('does not fabricate industry options and keeps submission disabled for J1.2A', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('#industry option').length).toBe(0);
    expect(compiled.querySelector('#industry .select-trigger')?.textContent).toContain('Select your industry');
    expect((compiled.querySelector('.submit-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the Community onboarding shell rather than public-site navigation', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.site-nav')).toBeNull();
    expect(compiled.querySelector('.brand-logo img')?.getAttribute('src')).toBe('branding/logo.png');
    expect(compiled.querySelector('.sign-in-button')?.textContent).toContain('Sign in');
    expect(compiled.querySelector('#form-title')?.textContent).toContain('Join the Elevate MK Community');
    expect(compiled.querySelector('.submit-button')?.textContent).toContain('Join Elevate MK');
    expect(compiled.querySelector('.success-panel')).toBeNull();
    expect(compiled.textContent).not.toContain("You're in.");
  });

  it('renders the join experience as a hero and form split without a floating footer/card shell', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.page-content > .hero-panel').length).toBe(1);
    expect(compiled.querySelectorAll('.page-content > .form-panel').length).toBe(1);
    expect(compiled.querySelector('.site-footer')).toBeNull();
  });

  it('uses the shared select for Gender, Age range, and Industry with the intended search modes', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-select').length).toBe(3);
    expect(compiled.querySelector('#gender .select-search')).toBeNull();
    expect(compiled.querySelector('#age-range .select-search')).toBeNull();

    (compiled.querySelector('#industry .select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('#industry .select-search')).not.toBeNull();
  });

  it('keeps whitespace-only required text invalid and select placeholders invalid', () => {
    const form = component.joinForm;

    form.controls.first_name.setValue('   ');
    expect(form.controls.first_name.invalid).toBe(true);
    expect(form.controls.gender.invalid).toBe(true);
    expect(form.controls.age_range.invalid).toBe(true);
    expect(form.controls.industry.invalid).toBe(true);
  });

  it('accepts valid email format but rejects malformed email', () => {
    const email = component.joinForm.controls.email;

    email.setValue('not-an-email');
    expect(email.invalid).toBe(true);

    email.setValue('member@example.com');
    expect(email.valid).toBe(true);
  });

  it('enables joining only when required fields are valid', () => {
    const form = component.joinForm;
    const button = () => fixture.nativeElement.querySelector('.submit-button') as HTMLButtonElement;

    fixture.detectChanges();
    expect(form.invalid).toBe(true);
    expect(button().disabled).toBe(true);

    form.patchValue({
      first_name: 'Amina',
      last_name: 'Zulu',
      gender: 'FEMALE',
      age_range: '30_34',
      email: 'amina@example.com',
      location: 'Milton Keynes',
      industry: 'technology',
      job_title: 'Engineer',
    });
    fixture.detectChanges();

    expect(form.valid).toBe(true);
    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-disabled')).toBeNull();

    component.submissionState.set('submitting');
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBe('true');
  });

  it('submits the backend contract with enum values, industry slug, and consent boolean', () => {
    component.joinForm.patchValue({
      first_name: 'Amina', last_name: 'Zulu', gender: 'FEMALE', age_range: '30_34',
      email: 'amina@example.com', location: 'Milton Keynes', industry: 'technology',
      job_title: 'Engineer', email_marketing_opt_in: true,
    });

    component.onSubmit();

    expect(communityJoin.calls).toBe(1);
    expect(communityJoin.requests[0]).toEqual(expect.objectContaining({
      gender: 'FEMALE', age_range: '30_34', industry: 'technology', email_marketing_opt_in: true,
    }));
    expect(communityJoin.keys[0]).toMatch(/[0-9a-f-]{36}/);
  });

  it('prevents duplicate submission and reuses the key when retrying unchanged data', () => {
    component.joinForm.patchValue({
      first_name: 'Amina', last_name: 'Zulu', gender: 'FEMALE', age_range: '30_34',
      email: 'amina@example.com', location: 'Milton Keynes', industry: 'technology', job_title: 'Engineer',
    });
    component.onSubmit();
    component.onSubmit();

    expect(communityJoin.calls).toBe(1);
    expect(router.navigations).toEqual([{ url: '/join/success', extras: { replaceUrl: true } }]);
  });

  it('maps known backend field errors without exposing a raw response', () => {
    communityJoin.response = throwError(() => ({ status: 400, body: { email: ['Email is already in use.'] } }));
    component.joinForm.patchValue({
      first_name: 'Amina', last_name: 'Zulu', gender: 'FEMALE', age_range: '30_34',
      email: 'amina@example.com', location: 'Milton Keynes', industry: 'technology', job_title: 'Engineer',
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#email-error')?.textContent).toContain('Email is already in use.');
    expect(fixture.nativeElement.textContent).not.toContain('"status"');
  });

  it('uses a retry notification for a retryable submission failure and reuses the idempotency key', () => {
    communityJoin.response = throwError(() => ({ status: 503, body: null }));
    component.joinForm.patchValue({
      first_name: 'Amina', last_name: 'Zulu', gender: 'FEMALE', age_range: '30_34',
      email: 'amina@example.com', location: 'Milton Keynes', industry: 'technology', job_title: 'Engineer',
    });
    component.onSubmit();
    fixture.detectChanges();

    const notifications = TestBed.inject(NotificationService);
    expect(notifications.notifications().some((item) => item.type === 'error')).toBe(true);
    expect(fixture.nativeElement.querySelector('.submission-feedback')).toBeNull();

    const firstKey = communityJoin.keys[0];
    communityJoin.response = of({ status: 'accepted', message: 'Accepted.' });
    const action = fixture.nativeElement.querySelector('.notification-action') as HTMLButtonElement;
    action.click();

    expect(communityJoin.calls).toBe(2);
    expect(communityJoin.keys[1]).toBe(firstKey);
    expect(router.navigations).toEqual([{ url: '/join/success', extras: { replaceUrl: true } }]);
  });

  it('keeps review responses as a persistent generic Join-page state', () => {
    communityJoin.response = throwError(() => ({ status: 409, body: { code: 'SUBMISSION_REQUIRES_REVIEW' } }));
    component.joinForm.patchValue({
      first_name: 'Amina', last_name: 'Zulu', gender: 'FEMALE', age_range: '30_34',
      email: 'amina@example.com', location: 'Milton Keynes', industry: 'technology', job_title: 'Engineer',
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.submission-feedback')?.textContent).toContain(
      "We couldn't complete your membership automatically",
    );
    expect(fixture.nativeElement.textContent).not.toContain('SUBMISSION_REQUIRES_REVIEW');
  });

  it('does not require optional mobile, LinkedIn, or marketing consent', () => {
    const form = component.joinForm;

    form.patchValue({
      first_name: 'Amina',
      last_name: 'Zulu',
      gender: 'FEMALE',
      age_range: '30_34',
      email: 'amina@example.com',
      location: 'Milton Keynes',
      industry: 'technology',
      job_title: 'Engineer',
      mobile: '',
      linkedin_url: '',
      email_marketing_opt_in: false,
    });

    expect(form.valid).toBe(true);
  });

  it('marks invalid submission fields as touched and exposes one relevant message', () => {
    const firstName = component.joinForm.controls.first_name;

    component.onSubmit();
    fixture.detectChanges();

    expect(firstName.touched).toBe(true);
    expect(fixture.nativeElement.querySelector('#first-name-error')?.textContent).toContain(
      'First name is required.',
    );
    expect(fixture.nativeElement.querySelector('#first-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#first-name')?.getAttribute('aria-describedby')).toBe(
      'first-name-error',
    );
  });

  it('requests active catalogue data and uses the backend slug as the option value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const option = compiled.querySelector('#industry [role="option"]');

    expect(communityApi.calls).toBe(1);
    expect(option).toBeNull();
    expect(component.joinForm.controls.industry.invalid).toBe(true);

    (compiled.querySelector('#industry .select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('#industry [role="option"]')?.textContent).toContain('Technology');
    (compiled.querySelector('#industry [role="option"]') as HTMLElement).click();
    component.joinForm.controls.industry.setValue('technology');
    expect(component.joinForm.controls.industry.valid).toBe(true);
  });

  it('shows a controlled error and retries only the catalogue request', () => {
    communityApi.response = throwError(() => new Error('backend unavailable'));
    component.loadIndustries();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      "We couldn't load industries. Please try again.",
    );
    expect((fixture.nativeElement.querySelector('.retry-button') as HTMLButtonElement).disabled).toBe(false);

    communityApi.response = of([{ slug: 'health', label: 'Health' }]);
    (fixture.nativeElement.querySelector('.retry-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(communityApi.calls).toBe(3);
    (fixture.nativeElement.querySelector('#industry .select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#industry [role="option"]')?.textContent).toContain('Health');
  });

  it('treats an empty catalogue as unavailable and keeps Industry disabled', () => {
    communityApi.response = of([]);
    component.loadIndustries();
    fixture.detectChanges();

    expect(component.joinForm.controls.industry.invalid).toBe(true);
    expect((fixture.nativeElement.querySelector('#industry .select-trigger') as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Industries are temporarily unavailable',
    );
  });
});
