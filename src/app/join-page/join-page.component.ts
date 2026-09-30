import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CommunityApiService, IndustryOption } from '../api/community-api.service';
import { CommunityJoinApiError, CommunityJoinRequest, CommunityJoinService } from '../api/community-join.service';
import { SelectComponent, SelectOption } from '../shared/ui/select/select.component';
import { NotificationService } from '../shared/ui/notifications/notification.service';

type JoinForm = {
  first_name: FormControl<string>;
  last_name: FormControl<string>;
  gender: FormControl<string>;
  age_range: FormControl<string>;
  email: FormControl<string>;
  mobile: FormControl<string>;
  phone_region: FormControl<string>;
  location: FormControl<string>;
  industry: FormControl<string>;
  job_title: FormControl<string>;
  linkedin_url: FormControl<string>;
  email_marketing_opt_in: FormControl<boolean>;
};

type SubmissionState = 'idle' | 'submitting' | 'success' | 'review' | 'error';

const SERVER_ERROR = 'server';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

@Component({
  selector: 'app-join-page',
  imports: [ReactiveFormsModule, RouterLink, SelectComponent],
  templateUrl: './join-page.component.html',
  styleUrl: './join-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPageComponent implements OnInit {
  private readonly communityApi = inject(CommunityApiService);
  private readonly communityJoin = inject(CommunityJoinService);
  private readonly notifications = inject(NotificationService);
  private idempotencyKey: string | null = null;
  private payloadFingerprint: string | null = null;

  protected readonly industries = signal<IndustryOption[]>([]);
  protected readonly industryOptions = computed<SelectOption[]>(() =>
    this.industries().map((industry) => ({ value: industry.slug, label: industry.label })),
  );
  protected readonly industriesLoading = signal(true);
  protected readonly industriesError = signal('');
  readonly submissionState = signal<SubmissionState>('idle');
  protected readonly submissionError = signal('');

  protected readonly genders = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'NON_BINARY', label: 'Non-binary' },
    { value: 'TRANSGENDER', label: 'Transgender' },
    { value: 'OTHER', label: 'Other' },
  ];

  protected readonly ageRanges = [
    { value: 'UNDER_25', label: 'Under 25' },
    { value: '25_29', label: '25–29' },
    { value: '30_34', label: '30–34' },
    { value: '35_39', label: '35–39' },
    { value: '40_45', label: '40–45' },
    { value: 'OVER_45', label: 'Over 45' },
  ];

  readonly joinForm = new FormGroup<JoinForm>({
    first_name: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
    last_name: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
    gender: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    age_range: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.email],
    }),
    mobile: new FormControl('', { nonNullable: true }),
    phone_region: new FormControl('GB', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
    industry: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    job_title: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
    linkedin_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^https?:\/\/\S+$/i)],
    }),
    email_marketing_opt_in: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.joinForm.valueChanges.subscribe(() => {
      this.clearServerErrors();
      this.idempotencyKey = null;
      this.payloadFingerprint = null;
      if (this.submissionState() === 'error' || this.submissionState() === 'review') {
        this.submissionState.set('idle');
        this.submissionError.set('');
      }
    });
    this.loadIndustries();
  }

  loadIndustries(): void {
    this.industriesLoading.set(true);
    this.industriesError.set('');
    this.industries.set([]);

    this.communityApi.getIndustries().subscribe({
      next: (industries) => {
        this.industries.set(industries);
        this.industriesLoading.set(false);
        if (industries.length === 0) {
          this.industriesError.set('Industries are temporarily unavailable. Please try again.');
        }
      },
      error: () => {
        this.industriesLoading.set(false);
        this.industriesError.set("We couldn't load industries. Please try again.");
      },
    });
  }

  protected shouldShowError(controlName: keyof JoinForm): boolean {
    const control = this.joinForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorMessage(controlName: keyof JoinForm): string {
    const control = this.joinForm.controls[controlName];

    if (control.hasError(SERVER_ERROR)) {
      return control.getError(SERVER_ERROR) as string;
    }

    if (controlName === 'gender' && control.hasError('required')) {
      return 'Select your gender.';
    }

    if (controlName === 'age_range' && control.hasError('required')) {
      return 'Select your age range.';
    }

    if (controlName === 'industry' && control.hasError('required')) {
      return 'Select your industry.';
    }

    if (controlName === 'email' && control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (controlName === 'linkedin_url' && control.hasError('pattern')) {
      return 'Enter a valid LinkedIn URL.';
    }

    const labels: Partial<Record<keyof JoinForm, string>> = {
      first_name: 'First name',
      last_name: 'Last name',
      email: 'Email address',
      location: 'Location',
      job_title: 'Current role / job title',
    };

    return `${labels[controlName] ?? 'This field'} is required.`;
  }

  onSubmit(): void {
    if (this.joinForm.invalid || this.submissionState() === 'submitting' || this.industries().length === 0) {
      this.joinForm.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.clearServerErrors();
    const payload = this.toRequest();
    const fingerprint = JSON.stringify(payload);
    if (!this.idempotencyKey || this.payloadFingerprint !== fingerprint) {
      this.idempotencyKey = crypto.randomUUID();
      this.payloadFingerprint = fingerprint;
    }

    this.submissionState.set('submitting');
    this.submissionError.set('');
    this.communityJoin.submit(payload, this.idempotencyKey).subscribe({
      next: () => {
        this.submissionState.set('success');
        setTimeout(() => document.getElementById('success-title')?.focus());
      },
      error: (error: CommunityJoinApiError) => this.handleSubmitError(error),
    });
  }

  protected retrySubmission(): void {
    this.onSubmit();
  }

  private toRequest(): CommunityJoinRequest {
    const value = this.joinForm.getRawValue();
    return {
      ...value,
      mobile: value.mobile.trim(),
      linkedin_url: value.linkedin_url.trim(),
      email_marketing_opt_in: Boolean(value.email_marketing_opt_in),
    };
  }

  private handleSubmitError(error: CommunityJoinApiError): void {
    if (error.status === 409) {
      this.submissionState.set('review');
      this.submissionError.set("We couldn't complete your membership automatically. Please contact Elevate MK so we can help.");
      return;
    }

    if (error.status === 400) {
      this.applyFieldErrors(error.body);
      this.submissionState.set('error');
      this.focusFirstInvalid();
      return;
    }

    this.submissionState.set('error');
    this.notifications.error("We couldn't submit your membership right now. Please try again.", {
      action: {
        label: 'Try again',
        callback: () => this.onSubmit(),
      },
    });
  }

  private applyFieldErrors(body: unknown): void {
    if (!body || typeof body !== 'object') {
      return;
    }

    const knownFields = Object.keys(this.joinForm.controls) as Array<keyof JoinForm>;
    for (const field of knownFields) {
      const value = (body as Record<string, unknown>)[field];
      const message = Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null;
      if (message) {
        const control = this.joinForm.controls[field];
        control.setErrors({ ...(control.errors ?? {}), [SERVER_ERROR]: message });
        control.markAsTouched();
      }
    }
  }

  private clearServerErrors(): void {
    for (const control of Object.values(this.joinForm.controls)) {
      if (!control.hasError(SERVER_ERROR)) {
        continue;
      }
      const errors = { ...(control.errors ?? {}) };
      delete errors[SERVER_ERROR];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      const field = Object.keys(this.joinForm.controls).find((name) => this.joinForm.controls[name as keyof JoinForm].invalid);
      const elementId: Record<string, string> = {
        first_name: 'first-name', last_name: 'last-name', gender: 'gender', age_range: 'age-range',
        email: 'email', location: 'location', industry: 'industry', job_title: 'job-title', linkedin_url: 'linkedin-url',
      };
      document.getElementById(elementId[field ?? ''] ?? '')?.focus();
    });
  }
}
