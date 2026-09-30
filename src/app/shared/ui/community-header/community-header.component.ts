import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-community-header',
  imports: [RouterLink],
  templateUrl: './community-header.component.html',
  styleUrl: './community-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHeaderComponent {
  readonly showSignIn = input(true);
}
