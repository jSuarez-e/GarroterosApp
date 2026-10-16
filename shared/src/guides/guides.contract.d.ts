export interface IGuideAssignedRoute {
    id: string;
    name: string;
}
export interface IGuideProfile {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    bio: string | null;
    certifications: string[];
    rating: number;
    experienceYears: number;
    assignedTour: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    routes?: IGuideAssignedRoute[];
    routeIds?: string[];
}
export interface CreateGuideDto {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string | null;
    bio?: string | null;
    certifications?: string[];
    rating?: number;
    experienceYears?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    routeIds?: string[];
}
export type UpdateGuideDto = Partial<CreateGuideDto>;
export interface GuideQueryDto {
    search?: string;
    routeId?: string;
}
