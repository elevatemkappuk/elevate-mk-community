import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

@Component({
  selector: 'app-community-directory-profile-placeholder',
  imports: [CommunityHeaderComponent, RouterLink],
  templateUrl: './community-directory-profile-placeholder.component.html',
  styleUrl: './community-directory-profile-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDirectoryProfilePlaceholderComponent {
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);
  readonly signingOut = signal(false);

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/join'),
      error: () => this.signingOut.set(false),
    });
  }
}
