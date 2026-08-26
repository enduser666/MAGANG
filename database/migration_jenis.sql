-- Migration file for adding jenis_pemeriksaan
-- Note: Do not execute this yet. This is only a reference schema migration as requested.
ALTER TABLE lhp ADD COLUMN jenis_pemeriksaan VARCHAR(50) NULL;
