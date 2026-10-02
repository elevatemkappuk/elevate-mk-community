import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CommunityProfileOptions,
  CommunityProfilePatch,
  CommunityProfileResponse,
  CommunityProfileService,
} from '../api/community-profile.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { SelectComponent, SelectOption } from '../shared/ui/select/select.component';
import { MultiSelectComponent } from '../shared/ui/multi-select/multi-select.component';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';

type ProfileForm = FormGroup<{
  person: FormGroup<{
    first_name: FormControl<string>;
    last_name: FormControl<string>;
    location: FormControl<string>;
  }>;
  community: FormGroup<{ bio: FormControl<string> }>;
  professional: FormGroup<{
    job_title: FormControl<string>;
    company: FormControl<string>;
    industry: FormControl<string>;
    career_stage: FormControl<string>;
    linkedin_url: FormControl<string>;
  }>;
  skills: FormControl<string[]>;
  interests: FormControl<string[]>;
}>;

@Component({
  selector: 'app-community-profile-edit-page',
  imports: [ReactiveFormsModule, CommunityHeaderComponent, SelectComponent, MultiSelectComponent, ProfileAvatarComponent],
  templateUrl: './community-profile-edit-page.component.html',
  styleUrl: './community-profile-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityProfileEditPageComponent implements OnInit {
  private readonly profileService = inject(CommunityProfileService);
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly form: ProfileForm = new FormGroup({
    person: new FormGroup({
      first_name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
      last_name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
      location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    }),
    community: new FormGroup({ bio: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(400)] }) }),
    professional: new FormGroup({
      job_title: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      company: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      industry: new FormControl('', { nonNullable: true }),
      career_stage: new FormControl('', { nonNullable: true }),
      linkedin_url: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^$|^https?:\/\/.+/i)] }),
    }),
    skills: new FormControl<string[]>([], { nonNullable: true }),
    interests: new FormControl<string[]>([], { nonNullable: true }),
  });

  readonly profile = signal<CommunityProfileResponse | null>(null);
  readonly options = signal<CommunityProfileOptions | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly reviewAcknowledgement = signal(false);
  readonly reviewContext = signal(false);
  readonly signingOut = signal(false);
  readonly uploadingPhoto = signal(false);
  readonly removingPhoto = signal(false);
  readonly photoError = signal<string | null>(null);

  @ViewChild('photoInput') private photoInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.reviewContext.set(history.state?.review === true);
    forkJoin({ profile: this.profileService.getProfile(), options: this.profileService.getProfileOptions() }).subscribe({
      next: ({ profile, options }) => {
        this.profile.set(profile);
        this.options.set(options);
        this.form.patchValue({
          person: profile.person,
          community: { bio: profile.community.bio },
          professional: {
            job_title: profile.professional.job_title,
            company: profile.professional.company,
            industry: profile.professional.industry?.slug ?? '',
            career_stage: profile.professional.career_stage ?? '',
            linkedin_url: profile.professional.linkedin_url,
          },
          skills: profile.skills.map((item) => item.slug),
          interests: profile.interests.map((item) => item.slug),
        });
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  get industryOptions(): SelectOption[] { return (this.options()?.industries ?? []).map(this.toSelectOption); }
  get careerStageOptions(): SelectOption[] { return (this.options()?.career_stages ?? []).map(this.toSelectOption); }
  get skillOptions(): SelectOption[] { return (this.options()?.skills ?? []).map(this.toSelectOption); }
  get interestOptions(): SelectOption[] { return (this.options()?.interests ?? []).map(this.toSelectOption); }

  isSelected(field: 'skills' | 'interests', slug: string): boolean { return this.form.controls[field].value.includes(slug); }

  toggleSelection(field: 'skills' | 'interests', slug: string): void {
    const control = this.form.controls[field];
    const selected = control.value;
    control.setValue(selected.includes(slug) ? selected.filter((value) => value !== slug) : [...selected, slug]);
    control.markAsDirty();
  }

  save(): void {
    if (this.saving() || this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set(null);
    const value = this.form.getRawValue();
    const payload: CommunityProfilePatch = {
      person: value.person,
      community: value.community,
      professional: {
        ...value.professional,
        industry: value.professional.industry || null,
        career_stage: value.professional.career_stage || null,
      },
      skills: value.skills,
      interests: value.interests,
    };
    this.profileService.updateProfile(payload).subscribe({
      next: (profile) => this.afterSave(profile),
      error: (error) => { this.saving.set(false); this.saveError.set(this.apiMessage(error)); },
    });
  }

  private afterSave(profile: CommunityProfileResponse): void {
    if (this.reviewAcknowledgement() && profile.community.review_required) {
      this.profileService.acknowledgeProfileReview().subscribe({
        next: () => {
          this.notifications.success('Your profile has been saved and reviewed.');
          this.router.navigateByUrl('/community/profile');
        },
        error: () => {
          this.saving.set(false);
          this.profile.set(profile);
          this.saveError.set('Your profile was saved, but we could not confirm the review. Please try again.');
        },
      });
      return;
    }
    this.notifications.success('Your profile has been saved.');
    this.router.navigateByUrl('/community/profile');
  }

  cancel(): void { this.router.navigateByUrl('/community/profile'); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ next: () => this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) });
  }

  retry(): void { this.loading.set(true); this.loadError.set(false); this.ngOnInit(); }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const photo = input.files?.[0];
    input.value = '';
    if (!photo || this.uploadingPhoto() || this.removingPhoto()) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (photo.type && !allowedTypes.has(photo.type.toLowerCase())) {
      this.photoError.set('Please choose a JPEG, PNG or WebP image.');
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      this.photoError.set('Profile photos must be 5 MB or smaller.');
      return;
    }

    this.uploadingPhoto.set(true);
    this.photoError.set(null);
    this.profileService.uploadProfilePhoto(photo).subscribe({
      next: (profile) => { this.profile.set(profile); this.uploadingPhoto.set(false); this.resetPhotoInput(); },
      error: (error) => { this.uploadingPhoto.set(false); this.photoError.set(this.photoMessage(error)); },
    });
  }

  removePhoto(): void {
    if (this.uploadingPhoto() || this.removingPhoto() || !this.profile()?.community.photo_url) return;
    this.removingPhoto.set(true);
    this.photoError.set(null);
    this.profileService.removeProfilePhoto().subscribe({
      next: (profile) => { this.profile.set(profile); this.removingPhoto.set(false); },
      error: (error) => { this.removingPhoto.set(false); this.photoError.set(this.photoMessage(error)); },
    });
  }

  private readonly toSelectOption = (item: { slug: string; label: string }): SelectOption => ({ value: item.slug, label: item.label });

  private apiMessage(error: { body?: unknown }): string {
    const body = error?.body as { detail?: string } | null;
    return body?.detail || 'We could not save your profile. Please check the highlighted fields and try again.';
  }

  private photoMessage(error: { body?: unknown }): string {
    const body = error?.body as { photo?: string[]; detail?: string } | null;
    return body?.photo?.[0] || body?.detail || 'We could not update your profile photo. Please try again.';
  }

  private resetPhotoInput(): void {
    if (this.photoInput) this.photoInput.nativeElement.value = '';
  }
}
