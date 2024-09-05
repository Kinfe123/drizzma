import { generatorHandler, GeneratorOptions } from "@prisma/generator-helper";
import { configFile, defaultPath, GEN_NAME } from "./const";
import { getProviderAndReturnResult } from "./lib/prisma/helpers/provider";
import { logger } from "@prisma/sdk";
import path from "path";
import {readConfigFile} from './lib/prisma/utils/main-config.ts'
import { recursiveWrite } from "./lib/prisma/utils/recursive-write";
type DefaultConfig = {
  generatorOption: {
    outputFile: string;
    provider: string;
  };
};

const configFilePath = path.resolve(__dirname ,  configFile);
const configData  = readConfigFile(configFilePath)

generatorHandler({

  onManifest() {
    return {
      version: "1.0.0",
      defaultOutput: configData?.generatorOption.outputPath ?? defaultPath,
      prettyName: GEN_NAME,
    };
  },

  onGenerate: async (options: GeneratorOptions) => {
    const providerType = options.datasources[0]?.provider;
    
    
    logger.log("Generating drizzle....");
    console.log('')
    const output = getProviderAndReturnResult({
      connectorType: providerType!,
      options,
    });
    let fileOutputPath: string = defaultPath;
    if (options.generator.output?.value) {
      fileOutputPath = options.generator.output.value;
    } else if (options.generator.output?.fromEnvVar) {
      fileOutputPath = process.env[options.generator.output.fromEnvVar!]!;
    }
    const folderResolve = path.resolve(fileOutputPath);
  
    let schemaPath = folderResolve;
    schemaPath = path.join(folderResolve, schemaPath );
    

    // handing the file write here
    recursiveWrite(schemaPath, output);
  
  },
  
});
