import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DirectoryMember } from '../api/community-api.service';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-community-directory-member-card',
  imports: [ProfileAvatarComponent, RouterLink],
  templateUrl: './community-directory-member-card.component.html',
  styleUrl: './community-directory-member-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDirectoryMemberCardComponent {
  readonly member = input.required<DirectoryMember>();

  initials(): string {
    const member = this.member();
    return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  }
}
