CREATE TABLE Albums (
  SingerId INT64 NOT NULL,
  AlbumId INT64 NOT NULL,
  AlbumTitle STRING(MAX),
  ReleaseDate DATE
) PRIMARY KEY (SingerId, AlbumId),
  INTERLEAVE IN PARENT Singers;
