-- 1. NODOS DE CONOCIMIENTO (Las "Piezas" de tu software)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain VARCHAR(50) NOT NULL, -- Ej: 'Frontend', 'Backend', 'Shared', 'Global'
    type VARCHAR(50) NOT NULL, -- Ej: 'Component', 'Service', 'DTO', 'Rule', 'Module'
    name VARCHAR(100) NOT NULL UNIQUE, -- Ej: 'AuthService', 'ExpenseItemComponent'
    description TEXT NOT NULL, -- Resumen estricto de qué hace y para qué sirve
    file_path VARCHAR(255), -- Ruta absoluta del archivo
    file_hash VARCHAR(64), -- Hash SHA-256 para evitar re-indexar archivos sin cambios
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. RELACIONES (El "Grafo" de dependencias)
CREATE TABLE IF NOT EXISTS knowledge_edges (
    source_id INTEGER,
    target_id INTEGER,
    relation_type VARCHAR(50) NOT NULL, -- Ej: 'CONSUMES', 'IMPLEMENTS', 'NAVIGATES_TO'
    PRIMARY KEY (source_id, target_id, relation_type),
    FOREIGN KEY (source_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE
);

-- 3. REGISTRO DE DECISIONES ARQUITECTÓNICAS (ADR - La "Memoria Histórica")
CREATE TABLE IF NOT EXISTS adr_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(150) NOT NULL,
    context TEXT NOT NULL, -- Cuál era el problema
    decision TEXT NOT NULL, -- Qué se decidió (Ej: Usar Signals en vez de RxJS)
    consequences TEXT NOT NULL, -- Efectos secundarios a tener en cuenta
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);