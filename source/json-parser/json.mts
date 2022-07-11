
// ----- typedef -----

const JsonTypes = [
  'value',
  'object',
  'object.open',
  'object.data',
  'object.close',
  'object.key-val',
  'object.delim',
  'object.relation',
  'array',
  'array.open',
  'array.data',
  'array.delim',
  'array.close',
  'number',
  'string',
  'boolean',
  'null',
] as const;

type JsonToken = {
  type: typeof JsonTypes[number];
  value: string;
  position: { head: number, tail: number };
};

type JsonData = string | number | boolean | null | JsonData[] | { [kay: string]: JsonData };

class JsonText {
  
  private source: string;

  private cursor: number;

  private lfpos: number[];

  private ws(): void{
    while(this.head && /\t|\n|\r| /.test(this.head)) this.cursor++;
  }

  private tokenFunc: { [key in typeof JsonTypes[number]]: ()=>(JsonToken | null) } = {
    
    // ----- never called -----

    'value': ()=>{this.errorlog('JsonText.getToken("value")', "function that should not be called is called"); return null;},
    'object': ()=>{this.errorlog('JsonText.getToken("object")', "function that should not be called is called"); return null;},
    'object.data': ()=>{this.errorlog('JsonText.getToken("object.data")', "function that should not be called is called"); return null;},
    'object.key-val': ()=>{this.errorlog('JsonText.getToken("object.key-val")', "function that should not be called is called"); return null;},
    'array': ()=>{this.errorlog('JsonText.getToken("array")', "function that should not be called is called"); return null;},
    'array.data': ()=>{this.errorlog('JsonText.getToken("array.data")', "function that should not be called is called"); return null;},

    // ----- literals -----

    // number = [ "-" ] , ( "0" | ( digit - "0" ) , { digit } ) , [ "." , digit , { digit } ] , [ ( "e" | "E" ) , [ "+" | "-" ] , digit , { digit } ] ;
    'number': ()=>{
      const token = {
        type: 'number' as 'number',
        value: '',
        position: { head: this.cursor, tail: -1 },
      };
    
      // [ "-" ]
      if(this.head == '-') this.cursor++;
    
      // ( "0" | ( digit - "0" ) , { digit } )
      // digit = "0" | "1" | ... | "9" ; # [0-9]
      if(this.head == '0') this.cursor++;
      else if(this.head && /[1-9]/.test(this.head)){
        
        // { digit }
        // digit = "0" | "1" | ... | "9" ; # [0-9]
        const regexp = /[^0-9]/g;
        regexp.lastIndex = this.cursor;
        const result = regexp.exec(this.source);
        if(!result) this.cursor = this.source.length;
        else this.cursor = result.index;
      } else{
    
        // throw error
        this.errorlog('JsonText.getToken("number")', `invalid character "${ this.head }" detected`);
        return null;
      }
    
      // [ "." , digit , { digit } ]
      // digit = "0" | "1" | ... | "9" ; # [0-9]
      if(this.head == '.'){
        this.cursor++;
    
        // digit , { digit }
        if(!this.head){
          // throw error
          this.errorlog('JsonText.getToken("number")', `invalid number "${ this.source.substring(token.position.head) }" detected`);
          return null;
        }
        const regexp = /[^0-9]/g;
        regexp.lastIndex = this.cursor;
        const result = regexp.exec(this.source);
        if(!result) this.cursor = this.source.length;
        else if(result.index != this.cursor) this.cursor = result.index;
      }
    
      // [ ( "e" | "E" ) , [ "+" | "-" ] , digit , { digit } ]
      if(this.head && /e|E/.test(this.head)){
        this.cursor++;
    
        // [ "+" | "-" ]
        if(this.head && /\+|-/.test(this.head)) this.cursor++;
    
        // digit , { digit }
        if(!this.head || /[^0-9]/.test(this.head)){
          // throw error
          this.errorlog('JsonText.getToken("number")', `invalid number "${ this.source.substring(token.position.head, this.cursor) }" detected`);
          return null;
        }
        const regexp = /[^0-9]/g;
        regexp.lastIndex = this.cursor;
        const result = regexp.exec(this.source);
        if(!result) this.cursor = this.source.length;
        else if(result.index != this.cursor) this.cursor = result.index;
      }
    
      // set token
      token.position.tail = this.cursor - 1;
      token.value = this.source.substring(token.position.head, this.cursor);
    
      return token;
    },

    // string = '"' , { ( unichar - '"' - "\\" - ctrlchar ) | ( "\\" , ( '"' | "\\" | "/" | "b" | "f" | "n" | "r" | "t" | ( "u" , hexdigit * 4 ) ) ) } , '"' ;
    // ctrlchar = "\u0000" | "\u0001" | ... | "\u001f" ; # [\x00-\x1f]
    // hexdigit = digit | "a" | "b" | ... | "f" | "A" | "B" | ... | "F" ; # [0-9a-fA-F]
    // digit = "0" | "1" | ... | "9" ; # [0-9]
    'string': ()=>{
      const token = {
        type: 'string' as 'string',
        value: '',
        position: { head: this.cursor, tail: -1 },
      };
    
      // '"'
      this.cursor++;
    
      // {
      while(this.head != '"'){
    
        if(this.head != '\\'){
          // ( unichar - '"' - "\\" - ctrlchar )
          if(!this.head || /[\x00-\x1f"\\]/.test(this.head)){
            // throw error
            if(!this.head)
              this.errorlog('JsonText.getToken("string")', `the end position of the string does not exist`);
            else if(/[\x00-\x1f]/.test(this.head))
              this.errorlog('JsonText.getToken("string")', `character "\\x${ ('00' + (this.head as string).charCodeAt(0).toString(16)).padStart(2, '0') }" needs escape`);
            else this.errorlog('JsonText.getToken("string")', `character '${ this.head }' needs escape`);
            return null;
          }
          this.cursor++;
        } else{
          // ( "\\" , ( '"' | "\\" | "/" | "b" | "f" | "n" | "r" | "t" | ( "u" , hexdigit * 4 ) ) )
    
          // "\\"
          this.cursor++;
    
          if(!this.head){
            // throw error
            this.errorlog('JsonText.getToken("string")', `escape target character is not exist`);
            return null;
          }
          if(/"|\\|\/|b|f|n|r|t/.test(this.head)) this.cursor++;
          else if(this.head as string == 'u'){
            // "u"
            this.cursor++;
    
            // hexdigit * 4
            // hexdigit = digit | "a" | "b" | ... | "f" | "A" | "B" | ... | "F" ; # [0-9a-fA-F]
            // digit = "0" | "1" | ... | "9" ; # [0-9]
    
            const codepoint = this.source.substring(this.cursor, this.cursor + 4);
            if(codepoint.length != 4 || !/[0-9a-fA-F]{4}/.test(codepoint)){
              // throw error
              this.errorlog('JsonText.getToken("string")', `invalid codepoint "\\u${ codepoint }"`);
            } else this.cursor += 4;
          }
        }
    
        // }
      }
    
      // '"'
      this.cursor++;
    
      // set token
      token.position.tail = this.cursor - 1;
      token.value = this.source.substring(token.position.head, this.cursor);
    
      return token;
    },

    // boolean = "true" | "false" ;
    'boolean': ()=>{
      const token = {
        type: 'boolean' as 'boolean',
        value: '',
        position: { head: this.cursor, tail: -1 },
      };
  
      if(this.source.substring(this.cursor, this.cursor + 4) == 'true'){
        // "true"
        this.cursor += 4;
  
        token.value = 'true';
        token.position.tail = this.cursor - 1;
      } else if(this.source.substring(this.cursor, this.cursor + 5) == 'false'){
        // "false"
        this.cursor += 5;
  
        token.value = 'false';
        token.position.tail = this.cursor - 1;
      } else{
        this.errorlog('JsonText.getToken("boolean")', `invalid boolean token detected`);
        return null;
      }

      return token;
    },

    // null = "null" ;
    'null': ()=>{

      if(this.source.substring(this.cursor, this.cursor + 4) != 'null'){
        this.errorlog('JsonToken.getToken("null")', 'invalid null token detected');
        return null;
      }

      const token = { type: 'null' as 'null', value: 'null', position: { head: this.cursor, tail: this.cursor + 4 } };
      this.cursor += 4;

      return token;
    },

    // ----- delimiters -----

    // object.open = "{" ;
    'object.open': ()=>{
      if(this.head != '{'){
        this.errorlog('JsonText.getToken("object.open")', 'invalid object.open token detected');
        return null;
      }
      const token = {
        type: 'object.open' as 'object.open',
        value: '{',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // object.close = "}" ;
    'object.close': ()=>{
      if(this.head != '}'){
        this.errorlog('JsonText.getToken("object.close")', 'invalid object.close token detected');
        return null;
      }
      const token = {
        type: 'object.close' as 'object.close',
        value: '}',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // object.delim = "," ;
    'object.delim': ()=>{
      if(this.head != ','){
        this.errorlog('JsonText.getToken("object.delim")', 'invalid object.delim token detected');
        return null;
      }
      const token = {
        type: 'object.delim' as 'object.delim',
        value: ',',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // object.relation = ":" ;
    'object.relation': ()=>{
      if(this.head != ':'){
        this.errorlog('JsonText.getToken("object.relation")', 'invalid object.relation token detected');
        return null;
      }
      const token = {
        type: 'object.relation' as 'object.relation',
        value: ':',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // array.open = "[" ;
    'array.open': ()=>{
      if(this.head != '['){
        this.errorlog('JsonText.getToken("array.open")', 'invalid array.open token detected');
        return null;
      }
      const token = {
        type: 'array.open' as 'array.open',
        value: '[',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // array.delim = "," ;
    'array.delim': ()=>{
      if(this.head != ','){
        this.errorlog('JsonText.getToken("array.delim")', 'invalid array.delim token detected');
        return null;
      }
      const token = {
        type: 'array.delim' as 'array.delim',
        value: ',',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },

    // array.close = "]" ;
    'array.close': ()=>{
      if(this.head != ']'){
        this.errorlog('JsonText.getToken("array.close")', 'invalid array.close token detected');
        return null;
      }
      const token = {
        type: 'array.close' as 'array.close',
        value: ']',
        position: { head: this.cursor, tail: this.cursor + 1 },
      };
      this.cursor++;

      return token;
    },
  };

  public constructor(source: string){

    // set json sourcecode
    this.source = source;

    // init cursor position
    this.cursor = 0;

    // get LineFeed positions
    this.lfpos = [];
    const regexp_lf = /\n/g;
    while(1){
      const result = regexp_lf.exec(source);
      if(!result) break;
      this.lfpos.push(result.index);
    }
  }

  public get head(): string | undefined{
    return this.source[this.cursor];
  }

  public getToken(type: typeof JsonTypes[number]): JsonToken{
    // skip whitespace
    this.ws();

    const token = this.tokenFunc[type]();
    if(!token) throw `JsonToken.getToken("${ type }")`;

    // skip whitespace
    this.ws();

    return token;
  }

  /**
   * エラーを標準出力に出すだけ
   * @param position エラー関数名とか ex) "Parser.tokenize"
   * @param args エラー文章とかオブジェクトとか
   */
  public errorlog(position: string, ...args: any[]): void{
    // get last "\n" position & calc cursor position
    let last = { pos: 0, line: 1, char: -1 };
    for(const pos of this.lfpos){
      if(pos < this.cursor){
        last.pos = pos;
        last.line++;
      } else break;
    }
    last.char = this.cursor - last.pos;

    // console write
    console.error('\x1b[31m ERROR \x1b[0m', position ? `[ ${ position } ]` : '', `at line:${ last.line }, char:${ last.char }`, '\n', ...args);
  }
};

// ----- json parser -----

class JsonParser {

  private source: string;

  private jsonText: JsonText;

  private json: (typeof JsonTypes[number])[];

  private tokenList: JsonToken[];

  private data: JsonData;

  public constructor(json_source: string){

    // set source
    this.source = json_source;

    // get JsonText
    this.jsonText = new JsonText(this.source);

    // init json
    this.json = [ 'value' ];

    // init tokenList
    this.tokenList = [];

    // init data
    this.data = null;

    // tokensize
    this.tokenize();

    // parse
    this.parse();
  }

  private tokenUpdate: { [key in typeof JsonTypes[number]]: ()=>boolean } = {
    'value': ()=>{
      this.json.pop(); // pop "value"
      if(!this.jsonText.head){
        // throw error
        this.jsonText.errorlog('Parser.tokenUpdate.value', `no data corresponding to Token<value> exists`);
        return false;
      }
      if(this.jsonText.head == '{')
        this.json.push('object');
      else if(this.jsonText.head == '[')
        this.json.push('array');
      else if(/[0-9-]/.test(this.jsonText.head))
        this.json.push('number');
      else if(this.jsonText.head == '"')
        this.json.push('string');
      else if(/t|f/.test(this.jsonText.head))
        this.json.push('boolean');
      else if(this.jsonText.head == 'n')
        this.json.push('null');
      else {
        // throw error
        this.jsonText.errorlog('Parser.tokenUpdate.value', 'data is not Token<value> detected');
        return false;
      }
      return true;
    },
    'object': ()=>{
      this.json.pop(); // pop "object"
      this.json.push('object.close', 'object.data', 'object.open');
      return true;
    },
    'object.open': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );

      if(this.jsonText.head == '}')
        this.json.pop(); // pop "object.data"
      else this.json.push('object.key-val');

      return true;
    },
    'object.key-val': ()=>{
      this.json.pop(); // pop "object.key-val"
      this.json.push('value', 'object.relation', 'string');
      return true;
    },
    'object.delim': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'object.relation': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'object.data': ()=>{
      if(this.jsonText.head == '}')
        this.json.pop(); // pop "object.data"
      else this.json.push('object.key-val', 'object.delim');
      return true;
    },
    'object.close': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'array': ()=>{
      this.json.pop(); // pop "array"
      this.json.push('array.close', 'array.data', 'array.open');
      return true;
    },
    'array.open': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );

      if(this.jsonText.head == ']')
        this.json.pop(); // pop "array.data"
      else this.json.push('value');

      return true;
    },
    'array.data': ()=>{
      if(this.jsonText.head == ']')
        this.json.pop(); // pop "array.data"
      else this.json.push('value', 'array.delim');
      return true;
    },
    'array.delim': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'array.close': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'number': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'string': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'boolean': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
    'null': ()=>{
      this.tokenList.push( this.jsonText.getToken( this.json.pop() as (typeof JsonTypes[number]) ) );
      return true;
    },
  };

  private tokenizer = {
    // value = object | array | number | string | boolean | null ;
    'value': (queue: JsonToken[])=>{
      const head = queue[0];
      if(!head) throw 'invalid value-token';
      switch(head.type){
        case 'object.open':
          return this.tokenizer.object(queue);
        case 'array.open':
          return this.tokenizer.array(queue);
        case 'number':
          return this.tokenizer.number(queue);
        case 'string':
          return this.tokenizer.string(queue);
        case 'boolean':
          return this.tokenizer.boolean(queue);
        case 'null':
          return this.tokenizer.null(queue);
      }
      throw 'invalid value-token';
    },

    // object = object.open , [ string , object.relation , value , { object.delim , string , object.relation , value } ] , object.close ;
    'object': (queue: JsonToken[])=>{

      const data: { [key: string]: JsonData } = {};

      // object.open
      if(queue.shift()?.type != 'object.open') throw 'invalid object-token';

      // object.close
      if(queue[0]?.type == 'object.close'){
        // object.close
        queue.shift();
        return data;
      }

      // string , object.relation , value , { object.delim , string , object.relation , value }
      do{
        [0,0,0].map((_,i)=>queue[i]).forEach((t)=>{ if(!t) throw 'invalid object-token'; });
        if((queue[0] as JsonToken).type != 'string') throw 'invalid object-token';
        const key = this.tokenizer.string(queue);
        if((queue[0] as JsonToken).type != 'object.relation') throw 'invalid object-token';
        queue.shift(); // remove "object.relation"
        data[key] = this.tokenizer.value(queue);
      } while( queue[0]?.type == 'object.delim' && queue.shift() );

      if(queue.shift()?.type != 'object.close') throw 'invalid object-token';

      return data;
    },

    // array = array.open , [ value , { array.delim , value } ] , array.close
    'array': (queue: JsonToken[])=>{
      
      const data: JsonData[] = [];

      // array.open
      if(queue.shift()?.type != 'array.open') throw 'invalid array-token';

      // array.close
      if(queue[0]?.type == 'array.close') return data;

      // value , { array.delim , value }
      do{
        data.push( this.tokenizer.value(queue) );
      } while( queue[0]?.type == 'array.delim' && queue.shift());

      if(queue.shift()?.type != 'array.close') throw 'invalid array-token';

      return data;
    },

    // number
    'number': (queue: JsonToken[])=>{
      const token = queue.shift();
      if(token?.type != 'number') throw 'invalid number-token';
      return Number(token.value);
    },

    // string
    'string': (queue: JsonToken[])=>{
      const token = queue.shift();
      if(token?.type != 'string') throw 'invalid string-token';
      const chars = token.value.replace(/(^")|("$)/g,'');
      let data = ``;
      let index = 0;
      while(index < chars.length){
        const regexp = /\\/g;
        regexp.lastIndex = index;
        const result = regexp.exec(chars);
        if(!result){
          data += chars.substring(index);
          index = chars.length;
        } else {
          switch(chars[result.index + 1]){
            case '"':
              data += chars.substring(index, result.index) + '"';
              index = result.index + 2;
              break;
            case '\\':
              data += chars.substring(index, result.index) + '\\';
              index = result.index + 2;
              break;
            case '/':
              data += chars.substring(index, result.index) + '/';
              index = result.index + 2;
              break;
            case 'b':
              data += chars.substring(index, result.index) + '\b';
              index = result.index + 2;
              break;
            case 'f':
              data += chars.substring(index, result.index) + '\f';
              index = result.index + 2;
              break;
            case 'n':
              data += chars.substring(index, result.index) + '\n';
              index = result.index + 2;
              break;
            case 'r':
              data += chars.substring(index, result.index) + '\r';
              index = result.index + 2;
              break;
            case 't':
              data += chars.substring(index, result.index) + '\t';
              index = result.index + 2;
              break;
            case 'u':
              const codepoint = Number('0x' + chars.substring(result.index + 1, result.index + 5));
              if(codepoint === codepoint) throw 'invalid string-token';
              data += chars.substring(index, result.index) + String.fromCharCode( codepoint );
              index = result.index + 6;
              break;
            default: throw 'invalid string-token';
          }
        }
      }
      return data;
    },

    // boolean
    'boolean': (queue: JsonToken[])=>{
      const token = queue.shift();
      if(token?.type != 'boolean') throw 'invalid boolean-token';
      if(token.value == 'true') return true;
      if(token.value == 'false') return false;
      throw 'invalid boolean-token';
    },

    // null
    'null':  (queue: JsonToken[])=>{
      const token = queue.shift();
      if(token?.type != 'null') throw 'invalid null-token';
      if(token.value == 'null') return null;
      throw 'invalid null-token';
    },
  };

  private tokenize(): void{
    while(this.json.length){
      try {
        if(!this.tokenUpdate[ this.json[this.json.length - 1] as (typeof JsonTypes[number]) ]()) throw 'JsonParser';
      } catch(error) {
        if( typeof error == 'string' && /^Json(Token|Parser)/.test(error)){
          // error from class JsonToken / JsonParser (this)
          throw new Error('[JsonParser.tokenize] cannot tokenize json-text');
        }
        // other error
        throw error;
      }
    }
    if(!this.tokenList.length)
      throw new Error('[JsonParser.tokenize] cannot tokenize json-text');
  }

  private parse(): void{
    // json data
    this.data = this.tokenizer.value( Array.from(this.tokenList) );
  }

  public get jsondata(): JsonData{
    return this.data;
  }
};

export function parse(source: string){
  const parser = new JsonParser(source);
  return parser.jsondata;
}
