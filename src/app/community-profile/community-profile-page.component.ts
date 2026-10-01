import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { NotificationService } from '../shared/ui/notifications/notification.service';

@Component({
  selector: 'app-community-profile-page',
  imports: [CommunityHeaderComponent, DatePipe, RouterLink],
  templateUrl: './community-profile-page.component.html',
  styleUrl: './community-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityProfilePageComponent implements OnInit {
  private readonly profileService = inject(CommunityProfileService);
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly profile = signal<CommunityProfileResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly signingOut = signal(false);
  readonly acknowledgingReview = signal(false);
  readonly reviewError = signal(false);

  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => { this.profile.set(profile); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  retry(): void { this.loading.set(true); this.loadError.set(false); this.ngOnInit(); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/join'),
      error: () => this.signingOut.set(false),
    });
  }

  editProfile(): void {
    this.router.navigate(['/community/profile/edit'], { state: { review: this.profile()?.community.review_required === true } });
  }

  acknowledgeReview(): void {
    if (this.acknowledgingReview() || !this.profile()?.community.review_required) return;
    this.acknowledgingReview.set(true);
    this.reviewError.set(false);
    this.profileService.acknowledgeProfileReview().subscribe({
      next: () => {
        const current = this.profile();
        if (current) this.profile.set({ ...current, community: { ...current.community, review_required: false } });
        this.acknowledgingReview.set(false);
        this.notifications.success('Your profile review has been confirmed.');
      },
      error: () => { this.acknowledgingReview.set(false); this.reviewError.set(true); },
    });
  }

  careerStageLabel(value: string | null): string {
    if (!value) return '';
    return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }
}
