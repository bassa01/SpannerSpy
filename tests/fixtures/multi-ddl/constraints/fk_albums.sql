ALTER TABLE Albums
  ADD CONSTRAINT fk_albums_singers
  FOREIGN KEY (SingerId)
  REFERENCES Singers (SingerId);
