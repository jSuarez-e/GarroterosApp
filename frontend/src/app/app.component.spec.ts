import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { MedicalService } from './core/services/medical.service';
import { SocketService } from './core/services/socket.service';
import { LocalNotificationService } from './core/services/local-notification.service';
import { NativeBridgeService } from './core/services/native-bridge.service';

describe('AppComponent', () => {
  it('should create the app', async () => {
    const mockAuthService = {
      currentUser: signal(null),
      isAdmin: signal(false),
      isAuthenticated: signal(false),
      token: signal(null),
      logout: vi.fn(),
      updateCurrentUserAvatar: vi.fn(),
    };

    const mockMedicalService = {
      attendanceConfirmed: signal(false),
      checkAttendance: vi.fn().mockReturnValue(of(false)),
      getMyProfile: vi.fn().mockReturnValue(of(null)),
    };

    const mockSocketService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const mockLocalNotificationService = {
      init: vi.fn().mockResolvedValue(undefined),
    };

    const mockNativeBridge = {
      initNativeFeatures: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: MedicalService, useValue: mockMedicalService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: LocalNotificationService, useValue: mockLocalNotificationService },
        { provide: NativeBridgeService, useValue: mockNativeBridge },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(app).toBeTruthy();
  });
});
