CREATE TABLE Singers (
  SingerId INT64 NOT NULL,
  FirstName STRING(1024),
  LastName STRING(1024) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (SingerId);

CREATE TABLE Albums (
  SingerId INT64 NOT NULL,
  AlbumId INT64 NOT NULL,
  AlbumTitle STRING(MAX),
  ReleaseDate DATE
) PRIMARY KEY (SingerId, AlbumId),
  INTERLEAVE IN PARENT Singers;

ALTER TABLE Albums
  ADD CONSTRAINT fk_albums_singers
  FOREIGN KEY (SingerId)
  REFERENCES Singers (SingerId);
