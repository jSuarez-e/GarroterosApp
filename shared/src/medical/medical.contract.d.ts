export declare enum DietType {
    REGULAR = "REGULAR",
    VEGETARIAN = "VEGETARIAN",
    VEGAN = "VEGAN",
    CELIAC = "CELIAC",
    OTHER = "OTHER"
}
export interface IMedicalProfile {
    id: string;
    userId: string;
    attendanceConfirmed: boolean;
    medicalConditions: string | null;
    allergies: string | null;
    medications: string | null;
    dietType: DietType;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    bloodType?: string | null;
    notes?: string | null;
    photoUrl?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
export interface SaveMedicalProfileDto {
    attendanceConfirmed: boolean;
    medicalConditions?: string | null;
    allergies?: string | null;
    medications?: string | null;
    dietType: DietType;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    bloodType?: string | null;
    notes?: string | null;
    photoUrl?: string | null;
}
