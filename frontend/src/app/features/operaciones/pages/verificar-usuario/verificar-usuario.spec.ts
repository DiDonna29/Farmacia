import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarUsuario } from './verificar-usuario';

describe('VerificarUsuario', () => {
  let component: VerificarUsuario;
  let fixture: ComponentFixture<VerificarUsuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarUsuario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarUsuario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
