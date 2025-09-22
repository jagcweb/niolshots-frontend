import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  private currentDateSubject = new BehaviorSubject<string>(this.getTodayDateString());
  public currentDate$: Observable<string> = this.currentDateSubject.asObservable();

  private getTodayDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getCurrentDate(): string {
    return this.currentDateSubject.value;
  }

  setDate(date: string): void {
    this.currentDateSubject.next(date);
  }

  goToPreviousDay(): void {
    const currentDate = new Date(this.getCurrentDate());
    currentDate.setDate(currentDate.getDate() - 1);
    
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    this.setDate(`${yyyy}-${mm}-${dd}`);
  }

  goToNextDay(): void {
    const currentDate = new Date(this.getCurrentDate());
    currentDate.setDate(currentDate.getDate() + 1);
    
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    this.setDate(`${yyyy}-${mm}-${dd}`);
  }

  getDateDisplay(): string {
    const dateStr = this.getCurrentDate();
    if (!dateStr) return '';
    
    const dateObj = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    // Si es hoy, mostrar "Hoy"
    if (dateObj.getTime() === today.getTime()) {
      return 'Hoy';
    }
    
    // Si es ayer, mostrar "Ayer"
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (dateObj.getTime() === yesterday.getTime()) {
      return 'Ayer';
    }
    
    // Si es mañana, mostrar "Mañana"
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (dateObj.getTime() === tomorrow.getTime()) {
      return 'Mañana';
    }
    
    // Para otras fechas, mostrar formato completo
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return dateObj.toLocaleDateString('es-ES', options);
  }
}