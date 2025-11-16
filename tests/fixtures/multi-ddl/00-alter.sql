-- These ALTER statements intentionally appear before the CREATE statements.
ALTER TABLE Artists ADD COLUMN StageName STRING(64);
ALTER TABLE Artists ADD COLUMN DisplayName STRING(MAX);
ALTER TABLE Records ADD COLUMN PublishedAt TIMESTAMP;
ALTER TABLE Records ADD CONSTRAINT fk_records_artists FOREIGN KEY (ArtistId) REFERENCES Artists (ArtistId);
