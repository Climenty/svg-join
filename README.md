# SVG-Join

There are webpack or gulp solutions for combining SVG. But I could not find simple CLI version. Here it is. It just join SVG files in symbol collection with CSS description.

I am strongly recommend to use [svgo](https://github.com/svg/svgo) for optimizing before joining.

## Installation

`$ [sudo] npm install -g svg-join`

## Options

Option | Description | Default value
--- | --- | ---
-s, --source | the source directory with filename mask in glob format |
-o, --output | the output directory | "."
-n, --name | file name (without ext.) for bundles (SVG & CSS) | "svg-bundle"
--cssName | file name (with ext.) for CSS bundle (if different) |
-p, --prefix | prefix for CSS selectors | "svg_"
-m, --mono | extract presentation attributes from single-styled SVG to CSS | false
--calcSide | calculate omitted side from viewBox values | false

## Usage

**svg-join -s "./svg/*.svg" -o ./public -n mybundle**

Will create mybundle.svg and mybundle.css in public folder.

**Warning!** The files are overwritten silently.

**svg-join -s "/your/path/\*\*/*.svg"**

Looking for SVG files recursively in /your/path/ subfolders.

**svg-join -s "./svg/*.svg" --mono**

`<svg id="exmpl"><path... fill="transparent" stroke="#fff" stroke-width="2"/></svg>`

The 'fill', 'stroke', 'stroke-width' attributes will be cutted from SVG and placed into CSS.

`.svg_exmpl {
  fill: transparent;
  stroke: #fff;
  stroke-width: 2;
}`

**svg-join -s "./svg/*.svg" --calcSide**

`<svg id="f033" height="1.1em" viewBox="0 0 1024 1792">...</svg>`

The omitted side (width in current example) will be calculated from viewBox values.

`.svg_f033 {
  width: 0.6286em;
  height: 1.1em;
}`

*This option applies only for 'em', 'rem' and 'px' units.*
