import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoinPageComponent } from './join-page.component';

describe('JoinPageComponent', () => {
  let fixture: ComponentFixture<JoinPageComponent>;
  let component: JoinPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinPageComponent],
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

    expect(compiled.querySelectorAll('#industry option').length).toBe(1);
    expect(compiled.querySelector('#industry option')?.textContent).toContain('Select your industry');
    expect((compiled.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the Community onboarding shell rather than public-site navigation', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.site-nav')).toBeNull();
    expect(compiled.querySelector('.brand-logo img')?.getAttribute('src')).toBe('branding/logo.png');
    expect(compiled.querySelector('.sign-in-button')?.textContent).toContain('Sign in');
    expect(compiled.querySelector('#form-title')?.textContent).toContain('Join the Elevate MK Community');
    expect(compiled.querySelector('.submit-button')?.textContent).toContain('Join Elevate MK');
  });

  it('renders the join experience as a hero and form split without a floating footer/card shell', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.page-content > .hero-panel').length).toBe(1);
    expect(compiled.querySelectorAll('.page-content > .form-panel').length).toBe(1);
    expect(compiled.querySelector('.site-footer')).toBeNull();
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
});
