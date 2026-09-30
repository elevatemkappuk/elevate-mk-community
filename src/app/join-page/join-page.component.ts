import { ChangeDetectionStrategy, Component } from '@angular/core';
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

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

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

  protected shouldShowError(controlName: keyof JoinForm): boolean {
    const control = this.joinForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorMessage(controlName: keyof JoinForm): string {
    const control = this.joinForm.controls[controlName];

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
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
    }
  }
}
