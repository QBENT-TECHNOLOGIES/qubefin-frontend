import { Component, signal, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
	selector: 'qfin-login',
	imports: [],
	templateUrl: './login.html',
})
export class Login {
	pageState = signal<string>('');
	
	@ViewChild('container', { read: ViewContainerRef, static: true }) viewContainerRef!: ViewContainerRef;
}
