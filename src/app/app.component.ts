declare global {
  interface Window {
    hideNiolShotsLoader?: () => void;
    showNiolShotsLoader?: () => void;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { TournamentsComponent } from './components/tournaments/tournaments.component';
import { FormsModule } from '@angular/forms';
import { DateService } from './services/date.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    TournamentsComponent,
    FormsModule
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'NiolShots Angular';
  currentDateDisplay = '';
  private subscription: Subscription = new Subscription();
  private isNavigating = false;

  constructor(private dateService: DateService,
              private router: Router) {}

  ngOnInit() {
    if (localStorage.getItem('dark-mode') === 'true') {
      document.body.classList.add('dark-mode');
    }

    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationStart) {
          this.isNavigating = true;
          if (window.showNiolShotsLoader) {
            window.showNiolShotsLoader();
          }
        } else if (event instanceof NavigationEnd) {
          this.isNavigating = false;
          setTimeout(() => {
            if (window.hideNiolShotsLoader && !this.isNavigating) {
              window.hideNiolShotsLoader();
            }
          }, 100);
        } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
          this.isNavigating = false;
          if (window.hideNiolShotsLoader) {
            window.hideNiolShotsLoader();
          }
        }
      })
    );

    this.subscription.add(
      this.dateService.currentDate$.subscribe(() => {
        this.currentDateDisplay = this.dateService.getDateDisplay();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getCurrentDateDisplay(): string {
    return this.currentDateDisplay;
  }

  goToPreviousDay(): void {
    this.dateService.goToPreviousDay();
  }

  goToNextDay(): void {
    this.dateService.goToNextDay();
  }

  refreshData() {
    window.location.reload();
  }

  clearCache() {
    if (confirm('¿Estás seguro de que deseas limpiar la caché de torneos? Esto recargará todos los datos desde la API.')) {
      localStorage.removeItem('cachedTournaments');
      localStorage.removeItem('cachedTournamentsTimestamp');
      alert('Caché limpiada correctamente. La página se recargará para aplicar los cambios.');
      window.location.reload();
    }
  }

  openSettings() {
    alert('Funcionalidad de configuración no implementada aún.');
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('dark-mode', 'true');
    } else {
      localStorage.setItem('dark-mode', 'false');
    }
  }
}