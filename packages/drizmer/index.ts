import { generatorHandler, GeneratorOptions} from "@prisma/generator-helper";
import { defaultPath, GEN_NAME } from "./const";
import { getProviderAndReturnResult } from "./lib/prisma/helpers/provider";
import { logger } from "@prisma/sdk";
import path from "path";
import { recursiveWrite } from "./lib/prisma/utils/recursive-write";


generatorHandler({
  onManifest() {
    return {
      version: "1.0.0",
      defaultOutput: "./drizzle",
      prettyName: GEN_NAME,
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    const providerType = options.datasources[0]?.provider;
    logger.log("Generating drizzle....");
    const output = getProviderAndReturnResult({
        connectorType: providerType!,
        options,
    });
    let fileOutputPath: string =  defaultPath;
    if (options.generator.output?.value) {
      fileOutputPath = options.generator.output.value;
    } else if (options.generator.output?.fromEnvVar) {
      fileOutputPath = process.env[options.generator.output.fromEnvVar!]!;
    }
    const folderResolve = path.resolve(fileOutputPath);
    let schemaPath = folderResolve;
    if (!folderResolve.endsWith(".ts")) {
      schemaPath = path.join(folderResolve, "./schema.ts");
    }

    // handing the file write here 
    recursiveWrite(schemaPath , output)
  },
})