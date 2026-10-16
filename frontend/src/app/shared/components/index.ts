/**
 * @sdd
 * [Objetivo]: Barril de exportacion para componentes compartidos de la interfaz de usuario (SDD-005-UI-REDESIGN).
 * [I/O]: Exporta HeroBannerComponent, InfoCardComponent, SegmentedPillComponent, StatBadgeComponent, PoiDetailModalComponent, ParticipantModalComponent.
 * [Edge Cases]: Permite imports limpios desde @app/shared/components o rutas relativas sin dependencias circulares.
 */

// frontend/src/app/shared/components/index.ts
export * from './hero-banner/hero-banner.component';
export * from './info-card/info-card.component';
export * from './segmented-pill/segmented-pill.component';
export * from './stat-badge/stat-badge.component';
export * from './participant-modal/participant-modal.component';
export * from './poi-detail-modal/poi-detail-modal.component';
export * from './route-selector/route-selector.component';
