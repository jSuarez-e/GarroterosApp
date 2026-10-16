export declare enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    fullName: string;
    iat?: number;
    exp?: number;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface IUser {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    avatarUrl?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    user: IUser;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface IMenuItem {
    title: string;
    url: string;
    icon: string;
    roles: UserRole[];
}
