/**
 * @sdd
 * [Objetivo]: Servicio de lógica de negocio para la gestión de fichas médicas y confirmación de asistencia (SDD-005-USER-MODULES-AND-ADMIN).
 * [I/O]: Inyecta Repository<MedicalProfile>. Métodos getProfileByUserId(userId) y saveProfile(userId, dto).
 * [Edge Cases]: Operación de upsert idempotente según la existencia previa de la ficha médica para el usuario.
 */

// backend/src/modules/medical/medical.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalProfile } from './entities/medical-profile.entity.js';
import { SaveMedicalProfileDto } from './dto/save-medical-profile.dto.js';

/**
 *
 */
@Injectable()
export class MedicalService {
  /**
   *
   * @param medicalProfileRepository
   */
  constructor(
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
  ) {}

  /**
   * Obtiene la ficha médica de un usuario por su identificador único.
   * @param userId Identificador UUID del usuario.
   * @returns Ficha médica encontrada o null si no se ha registrado.
   */
  async getProfileByUserId(userId: string): Promise<MedicalProfile | null> {
    return this.medicalProfileRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Guarda o actualiza la ficha médica de un usuario de forma idempotente.
   * @param userId Identificador UUID del usuario.
   * @param dto Datos médicos y de asistencia validados.
   * @returns Ficha médica creada o actualizada.
   */
  async saveProfile(userId: string, dto: SaveMedicalProfileDto): Promise<MedicalProfile> {
    let profile = await this.medicalProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.medicalProfileRepository.create({
        userId,
        ...dto,
      });
    } else {
      profile.attendanceConfirmed = dto.attendanceConfirmed;
      profile.medicalConditions = dto.medicalConditions ?? null;
      profile.allergies = dto.allergies ?? null;
      profile.medications = dto.medications ?? null;
      profile.dietType = dto.dietType;
      profile.emergencyContactName = dto.emergencyContactName ?? null;
      profile.emergencyContactPhone = dto.emergencyContactPhone ?? null;
      profile.bloodType = dto.bloodType ?? null;
      profile.notes = dto.notes ?? null;
    }

    return this.medicalProfileRepository.save(profile);
  }
}
