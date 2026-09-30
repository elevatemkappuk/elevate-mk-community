import { Routes } from '@angular/router';
import { JoinPageComponent } from './join-page/join-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'join' },
  { path: 'join', component: JoinPageComponent },
];
