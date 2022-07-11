# my-json-parser

typescript製 json/jsonc/json5 パーサ

## json format

see ["ECMA-404"](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/).

ECMA-404 を見て [EBNF](./json.ebnf) を書いたので、これに従って実装する。

## jsonc (JSON witg Comments) format

なんか標準化されてないっぽい？

["github node-jsonc-parser"](https://github.com/microsoft/node-jsonc-parser/) の実装内容が実質的に標準

## json5 format

see ["The JSON5 Data Interchange Format"](https://spec.json5.org/).
