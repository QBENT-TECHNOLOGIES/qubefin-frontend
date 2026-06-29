import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Drawer } from '../drawer/drawer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'qfin-container',
  imports: [RouterOutlet, CommonModule, Breadcrumb, Drawer, Footer, Header],
  templateUrl: './container.html'
})
export class Container {
  isExpanded = signal<boolean>(true);
  isHovered = signal<boolean>(false);
}
