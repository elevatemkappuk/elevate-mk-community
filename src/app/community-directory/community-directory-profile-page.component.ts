import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, DirectoryDetail } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-community-directory-profile-page',
  imports: [CommunityHeaderComponent, ProfileAvatarComponent, RouterLink],
  templateUrl: './community-directory-profile-page.component.html',
  styleUrl: './community-directory-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDirectoryProfilePageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly profile = signal<DirectoryDetail | null>(null);
  readonly loading = signal(true);
  readonly unavailable = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly signingOut = signal(false);
  readonly backQueryParams = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const query: Record<string, string> = {};
      for (const key of ['q', 'industry', 'skill', 'interest', 'page'] as const) {
        const value = params.get(key);
        if (value) query[key] = value;
      }
      this.backQueryParams.set(query);
    });
    this.load();
  }

  retry(): void { this.load(); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/join'),
      error: () => this.signingOut.set(false),
    });
  }

  initials(): string {
    const profile = this.profile();
    return profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() : '';
  }

  careerStageLabel(value: string | null): string {
    if (!value) return '';
    return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }

  professionalSummary(): string {
    const professional = this.profile()?.professional;
    if (!professional) return '';
    if (professional.job_title && professional.company) return `${professional.job_title} at ${professional.company}`;
    return professional.job_title || professional.company || '';
  }

  private load(): void {
    const directoryId = this.route.snapshot.paramMap.get('directoryId');
    if (!directoryId) {
      this.unavailable.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.profile.set(null);
    this.unavailable.set(false);
    this.errorMessage.set(null);
    this.api.getDirectoryProfile(directoryId).subscribe({
      next: (profile) => { this.profile.set(profile); this.loading.set(false); },
      error: (error: CommunityApiError) => {
        this.loading.set(false);
        if (error.status === 404) {
          this.unavailable.set(true);
        } else if (error.status === 429) {
          this.errorMessage.set('Connect is taking a short pause. Please wait a moment and try again.');
        } else {
          this.errorMessage.set('We couldn’t load this Connect profile right now. Please try again.');
        }
      },
    });
  }
}
