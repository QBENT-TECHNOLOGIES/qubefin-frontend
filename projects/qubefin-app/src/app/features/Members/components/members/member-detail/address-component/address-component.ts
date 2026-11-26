import { Component, input } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
  selector: 'qfin-address-component',
  imports: [],
  templateUrl: './address-component.html',
  styles: ``,
})
export class AddressComponent {
  memberId = input<string>(EMPTY_UUID);
  activeIndex = input<number>(0);
}
