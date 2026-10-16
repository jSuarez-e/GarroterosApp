import { UserRole, UserStatus } from '../auth/auth.contract.js';
export interface AdminCreateUserDto {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string | null;
    avatarUrl?: string | null;
}
export interface AdminUpdateUserDto {
    fullName?: string;
    phone?: string | null;
    role?: UserRole;
    status?: UserStatus;
    avatarUrl?: string | null;
}
export interface AdminUserQueryDto {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
}
export declare enum ItineraryStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    DELAYED = "DELAYED"
}
export interface IRouteLogEntry {
    id: string;
    routeId?: string | null;
    title: string;
    waypointId?: string | null;
    orderIndex: number;
    plannedTime: string;
    actualTime?: string | null;
    status: ItineraryStatus;
    notes?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface CreateRouteLogEntryDto {
    routeId?: string | null;
    title: string;
    orderIndex: number;
    plannedTime: string;
    waypointId?: string | null;
    notes?: string | null;
}
export interface UpdateRouteLogEntryDto {
    routeId?: string | null;
    title?: string;
    orderIndex?: number;
    plannedTime?: string;
    actualTime?: string | null;
    status?: ItineraryStatus;
    notes?: string | null;
}
export declare enum EventNoteSeverity {
    INFO = "INFO",
    WARNING = "WARNING",
    CRITICAL = "CRITICAL"
}
export interface IEventNote {
    id: string;
    routeId?: string | null;
    authorId: string;
    authorName: string;
    title: string;
    content: string;
    severity: EventNoteSeverity;
    createdAt: string | Date;
}
export interface CreateEventNoteDto {
    routeId?: string | null;
    title: string;
    content: string;
    severity: EventNoteSeverity;
}
export interface AdminCreatePoiDto {
    routeId?: string | null;
    title: string;
    description: string;
    orderIndex: number;
    longitude: number;
    latitude: number;
    audioUrl?: string | null;
    photoUrls?: string[] | null;
}
export interface AdminUpdatePoiDto {
    routeId?: string | null;
    title?: string;
    description?: string;
    orderIndex?: number;
    longitude?: number;
    latitude?: number;
    audioUrl?: string | null;
    photoUrls?: string[] | null;
}
export declare enum SosAlertStatus {
    PENDING = "PENDING",
    ATTENDED = "ATTENDED",
    CANCELLED = "CANCELLED",
    RESOLVED = "RESOLVED"
}
export interface ISosAlertEntry {
    id: string;
    userId: string;
    userName: string;
    userEmail?: string | null;
    userPhone?: string | null;
    latitude: number;
    longitude: number;
    altitude?: number | null;
    batteryLevel?: number | null;
    message: string;
    status: SosAlertStatus;
    createdAt: string;
    resolvedAt?: string | null;
    resolvedById?: string | null;
    resolvedByName?: string | null;
    resolutionNote?: string | null;
}
export interface UpdateSosAlertStatusDto {
    status: SosAlertStatus;
    resolutionNote: string;
}
