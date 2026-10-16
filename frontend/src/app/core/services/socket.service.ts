/**
 * @sdd
 * [Objetivo]: Servicio reactivo singleton para comunicacion bidireccional en tiempo real con Socket.io (SDD-003-SOCKET-TELEMETRY).
 * [I/O]: Inyecta variables de websocket desde environment. Expone senal isConnected (Signal<boolean>) y metodos connect, emit, on y disconnect.
 * [Edge Cases]: Reintento infinito de reconexion exponencial, gestion de listeners registrados antes del establecimiento del handshake.
 */

import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AppLogger } from '../utils/logger';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;
  public isConnected = signal<boolean>(false);
  private readonly pendingListeners: Array<{ event: string; callback: (data: unknown) => void }> = [];

  public connect(token: string): void {
    if (this.socket && this.socket.connected) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Registrar escuchadores pendientes
    for (const listener of this.pendingListeners) {
      this.socket.on(listener.event, listener.callback);
    }

    this.socket.on('connect', () => {
      this.isConnected.set(true);
      AppLogger.log('[WebSocket] Conectado exitosamente');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected.set(false);
      AppLogger.warn('[WebSocket] Desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      AppLogger.error('[WebSocket] Error de conexión:', error.message);
    });
  }

  public emit<T>(event: string, data: T): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  public on<T>(event: string, callback: (data: T) => void): void {
    const castedCallback = callback as (data: unknown) => void;
    if (this.socket) {
      this.socket.on(event, castedCallback);
    } else {
      this.pendingListeners.push({ event, callback: castedCallback });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected.set(false);
    }
  }
}