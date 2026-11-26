import { Component, input } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
  selector: 'qfin-kyc-component',
  imports: [],
  templateUrl: './kyc-component.html',
  styles: ``,
})
export class KycComponent {
  memberId = input<string>(EMPTY_UUID);
  activeIndex = input<number>(0);
}
