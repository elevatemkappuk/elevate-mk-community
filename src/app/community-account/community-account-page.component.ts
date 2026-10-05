import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommunityAccountResponse, CommunityAccountService } from '../api/community-account.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

@Component({
  selector: 'app-community-account-page',
  imports: [CommunityHeaderComponent, RouterLink],
  templateUrl: './community-account-page.component.html',
  styleUrl: './community-account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityAccountPageComponent implements OnInit {
  private readonly accountService = inject(CommunityAccountService);
  private readonly auth = inject(CommunityAuthService);

  readonly account = signal<CommunityAccountResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly signingOut = signal(false);

  ngOnInit(): void {
    this.accountService.getAccount().subscribe({
      next: (account) => { this.account.set(account); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  retry(): void { this.loading.set(true); this.loadError.set(false); this.ngOnInit(); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ error: () => this.signingOut.set(false) });
  }

  marketingLabel(state: CommunityAccountResponse['email_marketing']['state']): string {
    return state === 'OPTED_IN' ? 'Subscribed' : state === 'OPTED_OUT' ? 'Unsubscribed' : 'No preference set';
  }

  marketingCopy(state: CommunityAccountResponse['email_marketing']['state']): string {
    return state === 'OPTED_IN'
      ? 'You are subscribed to Elevate MK Community email updates.'
      : state === 'OPTED_OUT'
        ? 'You are not subscribed to Elevate MK Community email updates.'
        : 'You have not set an email marketing preference.';
  }
}
