export interface GpsLocation {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    timestamp: number;
}
export interface TelemetryPayload extends GpsLocation {
    userId: string;
    fullName: string;
    role: string;
    batteryLevel?: number | null;
    isSos?: boolean;
    sosMessage?: string | null;
}
export interface SosAlertPayload {
    id?: string;
    userId: string;
    fullName: string;
    role: string;
    latitude: number;
    longitude: number;
    batteryLevel?: number | null;
    message: string;
    timestamp: number;
    assignedGuideEmails?: string[];
    assignedGuideUserIds?: string[];
}
export interface AttendanceConfirmedBroadcastPayload {
    routeId: string;
    routeName: string;
    userId: string;
    userFullName: string;
    timestamp: number;
    assignedGuideEmails: string[];
    assignedGuideUserIds?: string[];
}
export interface MeetingPointInfo {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    description: string;
}
export interface HowToArriveCalculation {
    origin: {
        latitude: number;
        longitude: number;
    };
    destination: MeetingPointInfo;
    distanceMeters: number;
    distanceKm: string;
    estimatedWalkingMinutes: number;
    estimatedDrivingMinutes: number;
    googleMapsUrl: string;
    wazeUrl: string;
}
export declare enum TelemetrySocketEvents {
    LOCATION_UPDATE = "location_update",
    LIVE_LOCATIONS_SNAPSHOT = "live_locations_snapshot",
    USER_LOCATION_BROADCAST = "user_location_broadcast",
    SOS_TRIGGER = "sos_trigger",
    SOS_BROADCAST = "sos_broadcast",
    ATTENDANCE_CONFIRMED_BROADCAST = "attendance_confirmed_broadcast"
}
