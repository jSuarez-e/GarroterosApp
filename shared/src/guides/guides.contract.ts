/**
 * @sdd
 * [Objetivo]: Contratos e interfaces para el directorio de guías oficiales del recorrido (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Exporta interfaces IGuideProfile y GuideQueryDto.
 * [Edge Cases]: Tipado estricto sin any, enlace opcional a llamada directa y calificaciones.
 */

/**
 * Resumen de ruta asignada a un guía turístico.
 */
export interface IGuideAssignedRoute {
  /** Identificador UUID de la ruta */
  id: string;
  /** Nombre del sendero o recorrido */
  name: string;
}

/**
 * Perfil completo de guia turistico oficial.
 */
export interface IGuideProfile {
  /** Identificador unico del guia */
  id: string;
  /** Nombre completo */
  fullName: string;
  /** Correo electronico */
  email: string;
  /** Telefono de contacto directo */
  phone: string | null;
  /** URL de la fotografia de perfil */
  avatarUrl: string | null;
  /** Reseña biografica */
  bio: string | null;
  /** Certificaciones y acreditaciones */
  certifications: string[];
  /** Calificacion media otorgada por excursionistas */
  rating: number;
  /** Años de experiencia en guianza */
  experienceYears: number;
  /** Recorrido o tour asignado */
  assignedTour: string | null;
  /** Estado operativo del guía */
  status?: 'ACTIVE' | 'INACTIVE';
  /** Rutas turísticas en las que este guía se encuentra asignado */
  routes?: IGuideAssignedRoute[];
  /** IDs de rutas turísticas asociadas */
  routeIds?: string[];
}

/**
 * Payload para creación de un nuevo guía turístico en la base de datos.
 */
export interface CreateGuideDto {
  /** Nombre completo */
  fullName: string;
  /** Correo electronico único */
  email: string;
  /** Telefono de contacto */
  phone: string;
  /** URL del avatar o fotografía */
  avatarUrl?: string | null;
  /** Biografía o reseña profesional */
  bio?: string | null;
  /** Lista de certificaciones */
  certifications?: string[];
  /** Calificación inicial (1.0 - 5.0) */
  rating?: number;
  /** Años de experiencia */
  experienceYears?: number;
  /** Estado inicial */
  status?: 'ACTIVE' | 'INACTIVE';
  /** IDs de rutas a asociar al guía */
  routeIds?: string[];
}

/**
 * Payload para actualización parcial de un guía turístico.
 */
export type UpdateGuideDto = Partial<CreateGuideDto>;

/**
 * Filtros de busqueda para el directorio de guias.
 */
export interface GuideQueryDto {
  /** Texto para buscar por nombre o correo */
  search?: string;
  /** Identificador de ruta para filtrar guías asignados */
  routeId?: string;
}
