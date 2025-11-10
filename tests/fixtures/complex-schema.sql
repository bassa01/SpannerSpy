CREATE TABLE Tenants (
  TenantId INT64 NOT NULL,
  Name STRING(128) NOT NULL,
  BillingAccount STRING(64),
  Active BOOL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (TenantId);

CREATE TABLE AllTypes (
  TenantId INT64 NOT NULL,
  TypeId INT64 NOT NULL,
  BoolValue BOOL,
  IntValue INT64,
  FloatValue FLOAT64,
  StringValue STRING(256),
  BytesValue BYTES(MAX),
  DateValue DATE,
  TimestampValue TIMESTAMP,
  NumericValue NUMERIC,
  JsonValue JSON,
  StringArray ARRAY<STRING(64)>,
  BytesArray ARRAY<BYTES(16)>
) PRIMARY KEY (TenantId, TypeId),
  INTERLEAVE IN PARENT Tenants;

ALTER TABLE AllTypes
  ADD CONSTRAINT fk_alltypes_tenants
  FOREIGN KEY (TenantId)
  REFERENCES Tenants (TenantId);

CREATE TABLE Orders (
  TenantId INT64 NOT NULL,
  TypeId INT64 NOT NULL,
  OrderId INT64 NOT NULL,
  Description STRING(MAX),
  Status STRING(32),
  RequestedAt TIMESTAMP NOT NULL
) PRIMARY KEY (TenantId, OrderId),
  INTERLEAVE IN PARENT Tenants;

ALTER TABLE Orders
  ADD FOREIGN KEY (TenantId, TypeId)
  REFERENCES AllTypes (TenantId, TypeId);
