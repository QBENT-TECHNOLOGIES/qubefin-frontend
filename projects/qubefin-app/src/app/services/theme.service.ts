import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  isDark = signal(false);

  constructor() {

    const saved = localStorage.getItem('theme');

    this.isDark.set(saved === 'dark');

    effect(() => {

      if (this.isDark()) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

    });

  }

  toggle() {
    this.isDark.update(v => !v);
  }

}