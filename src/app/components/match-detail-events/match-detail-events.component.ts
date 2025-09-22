import { Component, Input, OnInit, OnChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-match-detail-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './match-detail-events.component.html',
  styleUrls: ['./match-detail-events.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MatchDetailEventsComponent implements OnInit, OnChanges {
  @Input() summary: any;
  @Input() homeColor: string = '#1a78cf';
  @Input() awayColor: string = '#e74c3c';

  selectedEventFilter = 'all';
  filteredEvents: any[] = [];
  allEvents: any[] = [];
  loading = false;

  ngOnInit() {
    this.processEvents();
  }

  ngOnChanges() {
    this.processEvents();
  }

  processEvents() {
    if (!this.summary) {
      this.allEvents = [];
      this.filteredEvents = [];
      return;
    }

    this.allEvents = [];

    if (this.summary.shots) {
      this.summary.shots.forEach((shot: any) => {
        this.allEvents.push({
          id: `shot_${shot.player?.id}_${shot.time}_${Math.random()}`,
          time: shot.time,
          minute: shot.time,
          timeSeconds: shot.timeSeconds,
          type: shot.shotType === 'goal' ? 'goal' : 'shot',
          subType: shot.shotType,
          player: shot.player,
          playerName: shot.player?.name,
          team: shot.isHome ? 'home' : 'away',
          description: shot.hasAssist ? shot.assistDescription : '',
          situation: shot.situation,
          bodyPart: shot.bodyPart,
          xg: shot.xg,
          x: shot.x,
          y: shot.y,
          additionalInfo: shot.situation || shot.bodyPart
        });
      });
    }

    if (this.summary.fouls) {
      this.summary.fouls.forEach((foul: any) => {
        this.allEvents.push({
          id: `foul_${foul.playerId}_${foul.time}_${Math.random()}`,
          time: foul.time,
          minute: foul.time,
          timeSeconds: foul.timeSeconds,
          type: 'foul',
          subType: foul.foulType,
          playerName: foul.playerName,
          team: foul.team,
          description: foul.description,
          additionalInfo: foul.foulType
        });
      });
    }

    if (this.summary.saves) {
      this.summary.saves.forEach((save: any) => {
        this.allEvents.push({
          id: `save_${save.playerId}_${save.time}_${Math.random()}`,
          time: save.time,
          minute: save.time,
          timeSeconds: save.timeSeconds,
          type: 'save',
          subType: save.saveType,
          playerName: save.playerName,
          team: save.team,
          description: save.description,
          additionalInfo: 'Parada del portero'
        });
      });
    }

    this.allEvents.sort((a, b) => b.timeSeconds - a.timeSeconds);
    
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  applyFilter() {
    switch (this.selectedEventFilter) {
      case 'goals':
        this.filteredEvents = this.allEvents.filter(e => e.type === 'goal');
        break;
      case 'cards':
        this.filteredEvents = this.allEvents.filter(e => 
          e.type === 'foul' && (e.subType?.includes('amarilla') || e.subType?.includes('roja'))
        );
        break;
      case 'fouls':
        this.filteredEvents = this.allEvents.filter(e => e.type === 'foul');
        break;
      case 'saves':
        this.filteredEvents = this.allEvents.filter(e => e.type === 'save');
        break;
      default:
        this.filteredEvents = [...this.allEvents];
    }
  }

  getEventCssClass(event: any): string {
    const classes = ['event-timeline-item'];
    
    if (event.team) {
      classes.push(`${event.team}-team-event`);
    }
    
    if (event.type) {
      classes.push(`${event.type}-event-type`);
    }
    
    return classes.join(' ');
  }

  getEventTypeClass(event: any): string {
    switch (event.type) {
      case 'goal':
        return 'goal-indicator';
      case 'shot':
        return 'shot-indicator';
      case 'foul':
        if (event.subType?.includes('amarilla')) return 'yellow-card-indicator';
        if (event.subType?.includes('roja')) return 'red-card-indicator';
        return 'foul-indicator';
      case 'save':
        return 'save-indicator';
      default:
        return 'default-indicator';
    }
  }

  getEventIcon(event: any): string {
    switch (event.type) {
      case 'goal':
        return 'fa-futbol';
      case 'shot':
        return 'fa-dot-circle';
      case 'foul':
        if (event.subType?.includes('amarilla')) return 'fa-square';
        if (event.subType?.includes('roja')) return 'fa-square';
        return 'fa-hand';
      case 'save':
        return 'fa-shield-alt';
      default:
        return 'fa-circle';
    }
  }

  getEventDescription(event: any): string {
    switch (event.type) {
      case 'goal':
        return 'Gol';
      case 'shot':
        return this.getShotTypeLabel(event.subType);
      case 'foul':
        return event.subType || 'Falta';
      case 'save':
        return 'Parada';
      default:
        return 'Evento';
    }
  }

  getShotTypeLabel(shotType: string): string {
    const shotTypes: { [key: string]: string } = {
      'OnTarget': 'Tiro a puerta',
      'OffTarget': 'Tiro desviado',
      'Blocked': 'Tiro bloqueado',
      'Post': 'Tiro al poste',
      'goal': 'Gol'
    };
    
    return shotTypes[shotType] || 'Tiro';
  }

  hasSecondaryInfo(event: any): boolean {
    return !!(event.team || event.additionalInfo);
  }

  trackByEventId(index: number, event: any): string {
    return event.id || `${event.type}_${index}`;
  }
}