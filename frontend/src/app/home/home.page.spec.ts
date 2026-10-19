import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe evaluar hasActiveRoute como false cuando el usuario no es admin y no tiene ruta asignada', () => {
    expect(component.hasActiveRoute()).toBe(false);
    expect(component.routeTitle()).toBe('Sin ruta activa');
  });

  describe('getItineraryStatusLabel', () => {
    it('debe traducir correctamente los estados de itinerario al español', () => {
      expect(component.getItineraryStatusLabel('PENDING')).toBe('Pendiente');
      expect(component.getItineraryStatusLabel('IN_PROGRESS')).toBe('En progreso');
      expect(component.getItineraryStatusLabel('COMPLETED')).toBe('Finalizado');
      expect(component.getItineraryStatusLabel('FINISHED')).toBe('Finalizado');
      expect(component.getItineraryStatusLabel('DELAYED')).toBe('Retrasado');
      expect(component.getItineraryStatusLabel(null)).toBe('Pendiente');
    });
  });

  describe('calculateTargetMeetingDate', () => {
    it('debe retornar null para cadenas vacías o formatos no válidos', () => {
      expect(component.calculateTargetMeetingDate('')).toBeNull();
      expect(component.calculateTargetMeetingDate('invalido')).toBeNull();
    });

    it('debe interpretar correctamente formato de 24 horas y 12 horas AM/PM', () => {
      const date24 = component.calculateTargetMeetingDate('08:45');
      expect(date24).toBeInstanceOf(Date);
      expect(date24?.getMinutes()).toBe(45);

      const dateAm = component.calculateTargetMeetingDate('09:30 AM');
      expect(dateAm).toBeInstanceOf(Date);
      expect(dateAm?.getHours()).toBe(9);
      expect(dateAm?.getMinutes()).toBe(30);

      const datePm = component.calculateTargetMeetingDate('02:15 PM');
      expect(datePm).toBeInstanceOf(Date);
      expect(datePm?.getHours()).toBe(14);
      expect(datePm?.getMinutes()).toBe(15);
    });
  });

  describe('updateCountdown y control de visibilidad', () => {
    it('debe marcar isMeetingTimePassed como true y texto 00h 00m 00s si la hora objetivo ya paso', () => {
      // Configuramos una fecha en el pasado
      const pastDate = new Date(Date.now() - 10000);
      component.targetDepartureDate.set(pastDate);

      component.updateCountdown();

      expect(component.isMeetingTimePassed()).toBe(true);
      expect(component.countdownText()).toBe('00h 00m 00s');
    });

    it('debe formatear correctamente horas, minutos y segundos cuando la hora está en el futuro', () => {
      const futureDate = new Date(Date.now() + 3665000); // ~1h 1m 5s
      component.targetDepartureDate.set(futureDate);

      component.updateCountdown();

      expect(component.isMeetingTimePassed()).toBe(false);
      expect(component.countdownText()).toMatch(/^\d{2}h \d{2}m \d{2}s$/);
    });

    it('debe computar correctamente startDateFormatted a partir de la fecha objetivo', () => {
      const fixedDate = new Date(2026, 9, 18, 8, 0, 0); // 18 Oct 2026
      component.targetDepartureDate.set(fixedDate);
      expect(component.startDateFormatted()).toBe('18 Oct 2026');
    });

    it('debe limpiar el temporizador en ngOnDestroy sin errores', () => {
      component.startCountdownTimer();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});

