import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-join-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './join-page.component.html',
  styleUrl: './join-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPageComponent {
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
    first_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    last_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    age_range: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    mobile: new FormControl('', { nonNullable: true }),
    phone_region: new FormControl('GB', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    industry: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    job_title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    linkedin_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^https?:\/\/\S+$/i)],
    }),
    email_marketing_opt_in: new FormControl(false, { nonNullable: true }),
  });
}
