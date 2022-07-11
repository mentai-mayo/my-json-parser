
## init

```py
text = " json text here "
json = [ 'value' ]
tokens = []
```

## value

```py
json.pop()
if text.head == "{":
  json.push('object')
else if text.head == "[":
  json.push('array')
else if text.head == ("-", "0", ..., "9", method:or ):
  json.push('number')
else if text.head == "\"":
  json.push('string')
else if text.head == ("t", "f", method:or):
  json.push('boolean')
else if text.head == "n":
  json.push('null')
else:
  raise syntaxError
```

## object

```py
json.pop()
json.push('object.open', 'object.data', 'object.close')
```

### object.open

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )

if text.head == "}":
  json.pop() # pop 'object.data'
else json.push('object.key-val')
```

### object.close

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )
```

### object.data

```py
if text.head == "}":
  json.pop() # pop object.data
else:
  json.push('object.delim', 'object.key-val')
```

### object.key-val

```py
json.pop()
json.push('string', 'object.relation', 'value')
```

### object.delim | object.relation

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )
```

## array

```py
json.pop()
json.push('array.open', 'array.data', 'array.close')
```

### array.open

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )

if text.head == "]":
  json.pop() # pop 'array.data'
else json.push('value')
```

### array.data

```py
if text.head == "]":
  json.pop() # pop 'array.data'
else json.push('array.delim', 'value')
```

### array.delim | array.close

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )
```

## number | string | boolean | null

```py
IDENT = json.pop()
TOKEN = text.getToken( IDENT )
tokens.push( TOKEN )
```




