import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilTitular } from './perfil-titular';

describe('PerfilTitular', () => {
  let component: PerfilTitular;
  let fixture: ComponentFixture<PerfilTitular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilTitular]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilTitular);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
