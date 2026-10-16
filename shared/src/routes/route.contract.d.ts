import type { IGuideProfile } from '../guides/guides.contract.js';
export interface PoiLocation {
    latitude: number;
    longitude: number;
}
export interface PoiDto {
    id: string;
    title: string;
    description: string;
    orderIndex: number;
    location: PoiLocation;
    audioUrl?: string | null;
    photoUrls?: string[];
    routeId?: string | null;
    routeName?: string;
}
export interface RoutePathDto {
    id: string;
    name: string;
    municipality: string;
    description: string;
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
    coordinates: [number, number][];
}
export interface CurrentWeatherDto {
    temperature: number;
    relativeHumidity: number;
    precipitationProbability: number;
    weatherCode: number;
    weatherDescription: string;
    weatherIcon: string;
    windSpeed: number;
    time: string;
}
export interface HourlyForecastDto {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
    weatherDescription: string;
    weatherIcon: string;
}
export interface WeatherReportDto {
    municipality: string;
    latitude: number;
    longitude: number;
    current: CurrentWeatherDto;
    hourly: HourlyForecastDto[];
    recommendations: string[];
    fetchedAt: string;
}
export interface ParticipantProfileDto {
    userId: string;
    fullName: string;
    role: 'ADMIN' | 'USER';
    batteryLevel?: number | null;
    latitude: number;
    longitude: number;
    updatedAt: string;
    isSos?: boolean;
}
export interface RouteEntityDto {
    id: string;
    name: string;
    municipality: string;
    description: string;
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
    coordinates: [number, number][];
    isActive: boolean;
    guides?: IGuideProfile[];
    createdAt: string;
    updatedAt: string;
}
export interface CreateRouteDto {
    name: string;
    municipality?: string;
    description: string;
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
    coordinates?: [number, number][];
    isActive?: boolean;
    guideIds: string[];
}
export type UpdateRouteDto = Partial<CreateRouteDto>;
