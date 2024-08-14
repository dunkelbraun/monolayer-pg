---
sidebar_position: 1
---

# Overview

Each PostgreSQL database contains one or more named schemas which contain tables and other database objects.
You can think of schemas as a namespace for SQL objects (i.e tables, types).
Every database PostgreSQL contains a `public` schema, which will used by default but you can create additional schemas.

In `configuration.ts`, you specify schema(s) you want to use for that configuration, which will be used
for the different connection for that configuration.

```ts
import { defineDatabase } from "monolayer/pg";
import { dbSchema } from "./schema";

export const defaultDb = defineDatabase(
  "default",
  {
    schemas: [dbSchema],
    extensions: [],
    camelCase: false,
  }
);
```

Schemas are defined with the `schema` function. The `schema` function takes an object with the following properties:

- `name`: the name of the schema. (*optional*, *default*: `public`)
- `tables`: tables in the schema. (*optional*)
- `types`: enumerated types in the schema (*optional*)

Schemas can be defined anywhere in your project.
A good place to start is to use the default `schema.ts` file generated in your designated `db` folder.
This way you can focus from the start in building your database schema.

<Tabs>
  <TabItem value="default public schema" label="Public schema" default>
```ts title="schema.ts"
import { foreignKey, integer, primaryKey, schema, table, text, } from "monolayer/pg";

const authors = table({
  columns: {
    id: integer().generatedAlwaysAsIdentity(),
    name: text().notNull(),
  },
  constraints: {
    primaryKey: primaryKey(["id"]),
  },
});

const books = table({
  columns: {
    id: integer().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    authorId: integer().notNull(),
  },
  constraints: {
    primaryKey: primaryKey(["id"]),
    foreignKeys: [foreignKey(["authorId"], authors, ["id"])],
  },
});

export const dbSchema = schema({
  tables: {
    authors,
    books,
  },
});
```
  </TabItem>
  <TabItem value="named schema" label="Named schema" default>

```ts title="analytics-schema.ts"
import { schema } from "monolayer/pg";

export const analyticsSchema = schema({
  // highlight-next-line
  name: "analytics",
  tables: {
    ...
  },
});
```
  </TabItem>

  <TabItem value="schema with types schema" label="Schema with enumerated types" default>

```ts title="schema.ts"
import { enumType, schema, table, integer, enumerated, primaryKey } from "monolayer/pg";

const role = enumType("role", ["admin", "user"]); // [!code highlight]
const status = enumType("status", ["active", "inactive"]); // [!code highlight]

export const dbSchema = schema({
  // highlight-next-line
  types: [role, status],
  tables: {
    users: table({
      columns: {
        id: integer().generatedAlwaysAsIdentity(),
        // highlight-start
        role: enumerated(role).notNull(),
        status: enumerated(status).notNull(),
        // highlight-end
      },
      constraints: {
        primaryKey: primaryKey(["id"]),
      },
    }),
  },
});
```
  </TabItem>
</Tabs>


`monolayer` will handle the creation of the schemas other than the default `public`.

After composing the schema, you can use the `monolayer` cli to generate and apply migrations
to the database.

But before that, it's important to understand the different concepts that make up a schema.

- [Tables](#tables)
- [Columns](#columns)
- [Constraints](#constraints)
- [Indexes](#indexes)