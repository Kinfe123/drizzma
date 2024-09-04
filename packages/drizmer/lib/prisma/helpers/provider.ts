import { ConnectorType, GeneratorError, GeneratorOptions } from "@prisma/generator-helper"
import { drizmingPg } from "../adapters/pg"
import { defaultPath } from "../../../const"
import path from "path"

export const getProviderAndReturnResult = ({
    connectorType,
    options
}: {connectorType: ConnectorType , options: GeneratorOptions}) =>  {
    let output: string 
    switch(connectorType) {
        case "cockroachdb": 
        output = "" 
        break
        case "postgres":
        case "postgresql":
            output = drizmingPg(options)
            break;
        // case "sqlite":
        //     output = convertAstToSqlite(options)
        //     break
        // case "mysql":
        //     output = convertAstToMysql(options)
        //     break
        case null:
            throw new GeneratorError("Null provider provided") 
        
        default: 
            throw new GeneratorError("Not supported invalid db provider provided.")
    }
    return output 


    
}