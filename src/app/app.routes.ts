import { Routes } from '@angular/router';
import { MatchesComponent } from './components/matches/matches.component';
import { TournamentsComponent } from './components/tournaments/tournaments.component';

export const routes: Routes = [
  { path: '', component: MatchesComponent },
  { path: 'matches', component: MatchesComponent },
  { path: 'tournaments', component: TournamentsComponent },
  {
    path: 'match/:id',
    loadComponent: () => import('./components/match-detail/match-detail.component').then(m => m.MatchDetailComponent)
  },
  {
    path: 'match/:id/events',
    loadComponent: () => import('./components/match-detail-events/match-detail-events.component').then(m => m.MatchDetailEventsComponent)
  }
];