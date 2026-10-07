import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommunityPost } from '../api/community-api.service';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';
import { audienceLabel, purposeLabel, relativePostTime } from './community-post-utils';

@Component({
  selector: 'app-community-post-card',
  imports: [ProfileAvatarComponent, RouterLink],
  templateUrl: './community-post-card.component.html',
  styleUrl: './community-post-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPostCardComponent {
  readonly post = input.required<CommunityPost>();

  initials(): string {
    const author = this.post().author;
    return `${author.first_name.charAt(0)}${author.last_name.charAt(0)}`.toUpperCase();
  }

  authorName(): string { return `${this.post().author.first_name} ${this.post().author.last_name}`.trim(); }
  purposeLabel = purposeLabel;
  audienceLabel = audienceLabel;
  relativeTime = relativePostTime;
}
