import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';
import { DocumentModal } from 'qubefin-core';

@Component({
  selector: 'qfin-root',
  imports: [RouterOutlet, DocumentModal],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class App {
  protected readonly title = signal('qubefin-app');
  readonly isLoading = signal(true);

  constructor(
    private router: Router,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isLoading.set(true);
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isLoading.set(false);
      }
    });
  }
}
