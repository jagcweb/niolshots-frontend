import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { AppComponent } from './app.component';
import { TournamentsComponent } from './components/tournaments/tournaments.component';
import { MatchesComponent } from './components/matches/matches.component';
import { MatchDetailComponent } from './components/match-detail/match-detail.component';
import { MatchDetailEventsComponent } from './components/match-detail-events/match-detail-events.component';

// Registra el locale español para pipes de fecha, número, etc.
registerLocaleData(localeEs);

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppComponent,
    TournamentsComponent,
    MatchesComponent,
    MatchDetailComponent,
    MatchDetailEventsComponent
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }