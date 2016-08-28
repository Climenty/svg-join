# SVG-Join

There are webpack or gulp tools for combining SVG. But I could not find simple CLI version. Here it is. It just join SVG files in symbol collection with CSS description.

I am strongly recommend to use [svgo](https://github.com/svg/svgo) for optimizing before joining.

## Installation

`$ [sudo] npm install -g svg-join`

## Options

* -s, --source  the source directory with filename mask in glob format.
* -o, --output  the output directory with basename for bundles (svg & css), (*default: "svg-bundle"*).
* -p, --prefix  prefix for CSS selectors, (*default: "svg_"*).

## Examples

`svg-join -s "./svg/*.svg" -o ./public/mybundle`

Will create mybundle.svg and mybundle.css in public folder.

**Warning!** The files are overwritten silently.

`svg-join -s "/your/path/**/*.svg"`

Looking for SVG files recursively in /your/path/ subfolders.


