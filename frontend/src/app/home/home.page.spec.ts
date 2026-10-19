import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';
import { RoutesService } from '../core/services/routes.service';
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

  describe('formatTimeDisplay', () => {
    it('debe formatear horas 24h a formato 12h con AM/PM', () => {
      expect(component.formatTimeDisplay('08:00')).toBe('08:00 AM');
      expect(component.formatTimeDisplay('14:30')).toBe('02:30 PM');
      expect(component.formatTimeDisplay('00:15')).toBe('12:15 AM');
      expect(component.formatTimeDisplay('12:00')).toBe('12:00 PM');
    });

    it('debe preservar formatos que ya contengan AM/PM o valores nulos', () => {
      expect(component.formatTimeDisplay('08:30 AM')).toBe('08:30 AM');
      expect(component.formatTimeDisplay(null)).toBe('08:30 AM');
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

    it('debe respetar la fecha específica si dateString es proporcionado', () => {
      const scheduledDate = component.calculateTargetMeetingDate('08:30 AM', '2026-10-25');
      expect(scheduledDate).toBeInstanceOf(Date);
      expect(scheduledDate?.getFullYear()).toBe(2026);
      expect(scheduledDate?.getMonth()).toBe(9); // Octubre (0-indexed)
      expect(scheduledDate?.getDate()).toBe(25);
      expect(scheduledDate?.getHours()).toBe(8);
      expect(scheduledDate?.getMinutes()).toBe(30);
    });
  });

  describe('formatDateDisplay y dateDisplayRange', () => {
    it('debe formatear YYYY-MM-DD a DD Mes YYYY', () => {
      expect(component.formatDateDisplay('2026-10-19')).toBe('19 Oct 2026');
      expect(component.formatDateDisplay('2026-01-05')).toBe('05 Ene 2026');
      expect(component.formatDateDisplay(null)).toBe('');
    });

    it('debe computar dateDisplayRange para fecha única y para rango de fechas', () => {
      // Mock routePath con fecha única
      const routesService = TestBed.inject(RoutesService);
      routesService.routePath.set({
        id: 'route-1',
        name: 'Ruta Test',
        municipality: 'Piedecuesta',
        description: 'Test',
        totalDistanceKm: 3,
        estimatedDurationMinutes: 60,
        coordinates: [],
        startTime: '07:00 AM',
        startDate: '2026-10-20',
        endDate: '2026-10-20',
      });

      expect(component.dateDisplayRange()).toBe('20 Oct 2026');
      expect(component.dateLabel()).toBe('Fecha de Inicio');
      expect(component.firstDepartureTime()).toBe('07:00 AM');

      // Mock routePath con rango multidia
      routesService.routePath.set({
        id: 'route-1',
        name: 'Ruta Test Multidia',
        municipality: 'Piedecuesta',
        description: 'Test',
        totalDistanceKm: 10,
        estimatedDurationMinutes: 240,
        coordinates: [],
        startTime: '08:00 AM',
        startDate: '2026-10-20',
        endDate: '2026-10-22',
      });

      expect(component.dateDisplayRange()).toBe('20 Oct 2026 - 22 Oct 2026');
      expect(component.dateLabel()).toBe('Fechas del Recorrido');
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

