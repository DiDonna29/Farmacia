import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BandejaRevision } from './bandeja-revision';

describe('BandejaRevision', () => {
  let component: BandejaRevision;
  let fixture: ComponentFixture<BandejaRevision>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandejaRevision]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BandejaRevision);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
