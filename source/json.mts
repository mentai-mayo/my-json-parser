import { parse as jsonParse } from "./json-parser/json.mjs";

namespace myJSON {
  export function parse(source: string, type: 'json' = 'json'){
    if(type == 'json') return jsonParse(source);
    else throw new Error(`unknown json type "${ type }"`);
  }
};

export default myJSON;
