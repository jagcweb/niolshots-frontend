import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private key = 'favoriteTournaments';

  getFavorites(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  }

  addFavorite(name: string) {
    const favs = this.getFavorites();
    if (!favs.includes(name)) {
      favs.push(name);
      localStorage.setItem(this.key, JSON.stringify(favs));
    }
  }

  removeFavorite(name: string) {
    let favs = this.getFavorites();
    favs = favs.filter(f => f !== name);
    localStorage.setItem(this.key, JSON.stringify(favs));
  }

  isFavorite(name: string) {
    return this.getFavorites().includes(name);
  }
}