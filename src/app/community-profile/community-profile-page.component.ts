import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

@Component({
  selector: 'app-community-profile-page',
  imports: [CommunityHeaderComponent, DatePipe],
  templateUrl: './community-profile-page.component.html',
  styleUrl: './community-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityProfilePageComponent implements OnInit {
  private readonly profileService = inject(CommunityProfileService);
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);

  readonly profile = signal<CommunityProfileResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly signingOut = signal(false);

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

  careerStageLabel(value: string | null): string {
    if (!value) return '';
    return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }
}
