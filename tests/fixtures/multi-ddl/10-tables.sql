CREATE TABLE Artists (
  ArtistId INT64 NOT NULL,
  Country STRING(2)
) PRIMARY KEY (ArtistId);

CREATE TABLE Records (
  RecordId INT64 NOT NULL,
  ArtistId INT64 NOT NULL,
  Title STRING(MAX)
) PRIMARY KEY (RecordId);
