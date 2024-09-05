import { escapeString } from "../../utils/esc";
// import { extractManyToManyModels } from '@/util/extract-many-to-many-models';
import {
  type DMMF,
  GeneratorError,
  type GeneratorOptions,
} from "@prisma/generator-helper";

// removing readonly feilds.
type UnReadonlyDeep<P> = {
  -readonly [K in keyof P]: UnReadonlyDeep<P[K]>;
};
const importPg = new Set<string>(["pgTable"]);

const importDrizzle = new Set<string>();

export const prismaToDrizzleType = (
  prismaType: string,
  colName: string,
  defaultVal?: string
) => {
  switch (prismaType) {
    case "Int":
      if (defaultVal === "autoincrement") {
        importPg.add("serial");
        return `serial('${colName}')`;
      }
      importPg.add("integer");
      return `integer('${colName}')`;
    case "Decimal":
      importPg.add("decimal");
      return `decimal('${colName}', { precision: 65, scale: 30 })`;
    case "Float":
      importPg.add("doublePrecision");
      return `doublePrecision('${colName}')`;
    case "Json":
      importPg.add("jsonb");
      return `jsonb('${colName}')`;
    case "Bigint":
      importPg.add("bigint");
      return `bigint('${colName}', { mode: 'bigint' })`;
    case "Boolean":
      importPg.add("boolean");
      return `boolean('${colName}')`;

    case "Datetime":
      importPg.add("timestamp");
      return `timestamp('${colName}', { precision: 3 })`;
    case "String":
      importPg.add("text");
      return `text('${colName}')`;
    case "Bytes":
      throw new GeneratorError("Ain't supported on Drizzle tho");
    default:
      return undefined;
  }
};

const colSuffixAttributes = (col: string, field: DMMF.Field) => {
  if (field.isUnique) col = col + `.unique()`;
  if (field.isId) col = col + `.primaryKey()`;
  if (field.isList) col = col + `.array()`;
  if (field.isRequired) col = col + `.notNull()`;
  if (field.default) {
    const defaultVal = field.default;

    switch (typeof defaultVal) {
      case "number":
      case "string":
      case "symbol":
      case "boolean":
        col = col + `.default(${JSON.stringify(defaultVal)})`;
        break;
      case "object":
        if (Array.isArray(defaultVal)) {
          col =
            col +
            `.default([${defaultVal
              .map((e) => JSON.stringify(e))
              .join(", ")}])`;
          break;
        }

        const value = defaultVal as {
          name: string;
          args: any[];
        };

        if (value.name === "now") {
          col = col + `.defaultNow()`;
          break;
        }

        if (value.name === "autoincrement") {
          break;
        }

        if (value.name === "dbgenerated") {
          col = col + `.default(sql\`${escapeString(value.args[0], "`")}\`)`;

          importDrizzle.add("sql");
          break;
        }

        if (/^uuid\([0-9]*\)$/.test(value.name)) {
          col = col + `.default(sql\`uuid()\`)`;

          importDrizzle.add("sql");
          break;
        }

        const stringified = `${value.name}${
          value.args.length
            ? "(" + value.args.map((e) => String(e)).join(", ") + ")"
            : value.name.endsWith(")")
              ? ""
              : "()"
        }`;
        const sequel = `sql\`${escapeString(stringified, "`")}\``;

        importDrizzle.add("sql");
        col = col + `.default(${sequel})`;
        break;
    }
  }

  return col;
};

const prismaToDrizzleCol = (field: DMMF.Field) => {
  let colDblabel = escapeString(field.dbName ?? field.name);
  let col = `\t${field.name}: `;
  if (field.kind === "enum") {
    col += `${field.type}('${colDblabel}')`;
  } else {
    let defaultValLabel = undefined;
    const defType = typeof field.default;
    if (defType === "object") {
      if (!Array.isArray(field.default)) {
        defaultValLabel = (field.default as { name: string }).name;
      }
    }
    const drizzleType = prismaToDrizzleType(
      field.type,
      colDblabel,
      defaultValLabel
    );
    if (!drizzleType) return undefined;
    col = colSuffixAttributes(col + drizzleType, field);
  }

  return col;
};

export const drizmingPg = (options: GeneratorOptions) => {
  const { models, enums } = options.dmmf.datamodel;
  const mutableModel = JSON.parse(JSON.stringify(models)) as UnReadonlyDeep<
    DMMF.Model[]
  >;
  let allPrismaModels = [...mutableModel];
  let pgEnumList = generatePgEnums(enums);
  let pgTableList = generatePgTable(allPrismaModels);
  const drizzleImportsArr = Array.from(importDrizzle.values());
  let drizzleImportTemplate: string = "";
  if (drizzleImportsArr.length) {
    drizzleImportTemplate = `import { ${drizzleImportsArr.join(
      ", "
    )} } from "drizzle-orm"`;
  }
  const pgImportsArr = Array.from(importPg.values());
  let pgImportTemplate: string = "";
  if (pgImportsArr.length) {
    pgImportTemplate = `import { ${pgImportsArr.join(
      ", "
    )} } from "drizzle-orm/pg-core"`;
  }
  let aggregateImports =
    [pgImportTemplate, drizzleImportTemplate]
      .filter((e) => e != undefined)
      .join("\n") ?? undefined;
  let result = [aggregateImports, ...pgEnumList, ...pgTableList]
    .filter((e) => e != undefined)
    .join("\n\n");
  return result;

  // generate PG enums
};

const generatePgEnums = (
  enumsLists: GeneratorOptions["dmmf"]["datamodel"]["enums"]
) => {
  let collectEnums: string[] = [];
  for (const sEnums of enumsLists) {
    if (sEnums.values.length === 0) continue;
    importPg.add("pgEnum");
    // here , the user might use @map to map the prisma schem to another litral reporesentation of the model basd on provided
    const enumDbLabel = `${sEnums.dbName ?? sEnums.name}`;
    const enumSchemaLabel = sEnums.name;
    collectEnums.push(
      `export const ${enumSchemaLabel} = pgEnum('${enumDbLabel}', [${sEnums.values
        .map((en) => `'${en.dbName ?? en.name}'`)
        .join(", ")}])`
    );
  }

  return collectEnums;
};
const generatePgTable = (
  tableList: GeneratorOptions["dmmf"]["datamodel"]["models"]
) => {
  let collectTable: string[] = [];
  for (const sTable of tableList) {
    let tableSchemaLabel = sTable.name;
    let tableDbLabel = escapeString(sTable.dbName ?? tableSchemaLabel);
    const columnFields = Object.fromEntries(
      sTable.fields
        .map((e) => [e.name, prismaToDrizzleCol(e)])
        .filter((e) => e[1] !== undefined)
    );

    const indexes: string[] = [];

    const table = `export const ${tableSchemaLabel} = pgTable('${tableDbLabel}', {\n${Object.values(
      columnFields
    ).join(",\n")}\n}${
      indexes.length
        ? `, (${tableSchemaLabel}) => ({\n${indexes.join(",\n")}\n})`
        : ""
    });`;

    collectTable.push(table);
  }
  return collectTable;
};
