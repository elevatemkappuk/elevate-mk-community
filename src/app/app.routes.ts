import { Routes } from '@angular/router';
import { JoinPageComponent } from './join-page/join-page.component';
import { JoinSuccessPageComponent } from './join-success/join-success-page.component';
import { ActivatePageComponent } from './activate-page/activate-page.component';
import { CommunityHomePageComponent } from './community-home/community-home-page.component';
import { communityAuthGuard } from './core/auth/community-auth.guard';
import { communityGuestGuard } from './core/auth/community-guest.guard';
import { SignInPageComponent } from './sign-in-page/sign-in-page.component';
import { ForgotPasswordPageComponent } from './forgot-password-page/forgot-password-page.component';
import { ResetPasswordPageComponent } from './reset-password-page/reset-password-page.component';
import { CommunityProfilePageComponent } from './community-profile/community-profile-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'join' },
  { path: 'join', component: JoinPageComponent },
  { path: 'sign-in', component: SignInPageComponent, canActivate: [communityGuestGuard] },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password/:uid/:token', component: ResetPasswordPageComponent },
  { path: 'join/success', component: JoinSuccessPageComponent },
  { path: 'activate/invalid', component: ActivatePageComponent },
  { path: 'activate/:invitationId/:token', component: ActivatePageComponent },
  { path: 'community', component: CommunityHomePageComponent, canActivate: [communityAuthGuard] },
  { path: 'community/profile', component: CommunityProfilePageComponent, canActivate: [communityAuthGuard] },
];
