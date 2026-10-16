/**
 * @sdd
 * [Objetivo]: Contratos e interfaces para la ficha médica y registro de asistencia del excursionista (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Exporta enum DietType, interfaces IMedicalProfile y SaveMedicalProfileDto.
 * [Edge Cases]: Tipado estricto sin any, validacion de campos opcionales y contactos de emergencia.
 */

export enum DietType {
  REGULAR = 'REGULAR',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  CELIAC = 'CELIAC',
  OTHER = 'OTHER',
}

/**
 * Ficha medica y de asistencia del excursionista.
 */
export interface IMedicalProfile {
  /** Identificador unico UUID de la ficha */
  id: string;
  /** Identificador del usuario propietario */
  userId: string;
  /** Estado de confirmacion de asistencia */
  attendanceConfirmed: boolean;
  /** Condiciones medicas preexistentes */
  medicalConditions: string | null;
  /** Alergias conocidas */
  allergies: string | null;
  /** Medicamentos requeridos */
  medications: string | null;
  /** Tipo de alimentacion o dieta */
  dietType: DietType;
  /** Nombre del contacto de emergencia */
  emergencyContactName: string | null;
  /** Telefono del contacto de emergencia */
  emergencyContactPhone: string | null;
  /** Grupo sanguineo y factor RH */
  bloodType?: string | null;
  /** Observaciones adicionales */
  notes?: string | null;
  /** Fecha de creacion */
  createdAt?: string | Date;
  /** Fecha de actualizacion */
  updatedAt?: string | Date;
}

/**
 * DTO para crear o actualizar la ficha medica y asistencia.
 */
export interface SaveMedicalProfileDto {
  /** Estado de confirmacion de asistencia */
  attendanceConfirmed: boolean;
  /** Condiciones medicas */
  medicalConditions?: string | null;
  /** Alergias */
  allergies?: string | null;
  /** Medicamentos */
  medications?: string | null;
  /** Tipo de dieta */
  dietType: DietType;
  /** Nombre de contacto de emergencia */
  emergencyContactName?: string | null;
  /** Telefono de contacto de emergencia */
  emergencyContactPhone?: string | null;
  /** Grupo sanguineo */
  bloodType?: string | null;
  /** Notas */
  notes?: string | null;
}
