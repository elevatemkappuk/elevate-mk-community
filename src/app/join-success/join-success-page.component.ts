import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

@Component({
  selector: 'app-join-success-page',
  imports: [CommunityHeaderComponent],
  templateUrl: './join-success-page.component.html',
  styleUrl: './join-success-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinSuccessPageComponent {}
