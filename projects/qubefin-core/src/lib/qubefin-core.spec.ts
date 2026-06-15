import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QubefinCore } from './qubefin-core';

describe('QubefinCore', () => {
  let component: QubefinCore;
  let fixture: ComponentFixture<QubefinCore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QubefinCore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QubefinCore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
