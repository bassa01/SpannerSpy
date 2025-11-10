import { SpannerSchema } from "../types";

export const sampleSchema: SpannerSchema = {
  tables: [
    {
      name: "Singers",
      primaryKey: ["SingerId"],
      columns: [
        { name: "SingerId", type: "INT64", isNullable: false },
        { name: "FirstName", type: "STRING" },
        { name: "LastName", type: "STRING", isNullable: false },
        { name: "CreatedAt", type: "TIMESTAMP", isNullable: false },
      ],
    },
    {
      name: "Albums",
      primaryKey: ["SingerId", "AlbumId"],
      columns: [
        { name: "SingerId", type: "INT64", isNullable: false },
        { name: "AlbumId", type: "INT64", isNullable: false },
        { name: "AlbumTitle", type: "STRING" },
        { name: "ReleaseDate", type: "DATE" },
      ],
      interleavedIn: "Singers",
    },
  ],
  foreignKeys: [
    {
      name: "fk_albums_singers",
      referencingTable: "Albums",
      referencingColumns: ["SingerId"],
      referencedTable: "Singers",
      referencedColumns: ["SingerId"],
    },
  ],
};
