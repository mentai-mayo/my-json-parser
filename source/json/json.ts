
const TokenType = [
  // --- literals ---
  'number',
  'string',
  'boolean',
  'null',

  // --- object-elements ---
  'object-head',
  'object-key',
  'object-relation',
  'object-separator',
  'object-tail',

  // --- array-elements ---
  'array-head',
  'array-separator',
  'array-tail',

  // --- white space ---
  'white-space',
] as const;

class Token {

  /** type */
  public readonly type: typeof TokenType[number];

  /** value */
  public readonly value: string;

  /** head index */
  public readonly head: number;
  
  /** tail index */
  public readonly tail: number;

  constructor(type: typeof TokenType[number], source: string, head: number, tail: number) {
    this.type = type;
    this.value = source.substring(head, tail + 1);
    this.head = head;
    this.tail = tail;
  }
}

class parser {

  private source: string;

  private cursor: number;

  private parsed: any | undefined;
  
  constructor(source: string) {
    this.source = source;
    this.cursor = 0;
    this.parsed = void 0;
  }

  public getValue(): any {
    if(this.parsed !== void 0) return this.parsed;
    return this.parsed = this.json();
  }

  /** initialize */
  private init(): void {
    this.cursor = 0;
  }

  /**
   * json = white-space , value , white-space ;
   */
  private json(): any {
    this.init();
    this.whitespace();
    const json = this.value();
    this.whitespace();
    if(this.cursor != this.source.length) {
      throw 'json: MULTIPLE_VALUES_IN_JSON';
    }
    return json;
  }

  /**
   * value = ( object | array | number | string | boolean | null ) ;
   */
  private value(): any {
    
    if(this.object.is()) {
      return this.object();
    }
    if(this.array.is()) {
      return this.array();
    }
    if(this.number.is()) {
      return this.number();
    }
    if(this.string.is()) {
      return this.string();
    }
    if(this.boolean.is()) {
      return this.boolean();
    }
    if(this.null.is()) {
      return this.null();
    }

    throw 'value: detected unlassifiable value';
  }

  /**
   * object = "{" , white-space , [ key , white-space , ":" , white-space , value , white-space , { "," , white-space , key , white-space , ":" , white-space , value , white-space } ] , "}"
   */
  private object = (() => {
    let object = (() => {
      
      const value = Object.create(null);

      // "{"
      this.cursor++;

      // white-space
      this.whitespace();

      // [
      if(this.getchar() != '}') {
        // key
        const key = this.string();

        // white-space
        this.whitespace();

        // ":"
        if(this.getchar() != ':') {
          throw 'object: INVALID_SEPARATOR';
        }
        this.cursor++;

        // white-space
        this.whitespace();

        // value
        value[key] = this.value();

        // white-space
        this.whitespace();

        // {
        while(this.getchar() == ',') {
          // ","
          this.cursor++;

          // white-space
          this.whitespace();
          
          // key
          const key = this.string();
  
          // white-space
          this.whitespace();
  
          // ":"
          if(this.getchar() != ':') {
            throw 'object: INVALID_SEPARATOR';
          }
          this.cursor++;
  
          // white-space
          this.whitespace();
  
          // value
          value[key] = this.value();
  
          // white-space
          this.whitespace();
          
        }
        // }

      }
      // ]

      if(this.getchar() != '}') {
        throw 'object: INVALID_OBJECT_TAIL';
      }

      return value;
    }) as {
      (): () => { [key: string]: any },
      is: () => boolean,
    };
    object.is = () => {
      return this.getchar() == "{";
    };
    return object;
  }).call(null);

  private array = (() => {
    let array = (() => {}) as {
      (): () => any[];
      is: () => boolean;
    };
    array.is = () => {
      return this.getchar() == '[';
    };
    return array;
  }).call(null);
  
  /**
   * white-space = { "\t" | "\n" | "\r" | " " } ;
   */
  private whitespace(): void {
    while(this.getchar()?.match(/^(\t|\n|\r| )$/)) {
      this.cursor++;
    }
  }

  /** return this.source[this.cursor] */
  private getchar(): string | null {
    return this.source[this.cursor] ?? null;
  }
}

