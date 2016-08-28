#!/usr/bin/env node
'use strict'

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const glob = Promise.promisifyAll(require('glob'))
const xmldoc = require('xmldoc')
const path = require('path')

const addPX = x => isFinite(x) ? x + 'px' : x

function errOut (fname, message) {
  console.error(`File: ${fname}\n${message}`)
}

console.log(`SVG-Join ${require('./package.json').version} Join svg files in symbol collection.`)
const argv = require('yargs')
  .options({
    's': { alias: 'source', type: 'string', demand: true,
      describe: 'the source directory with filename mask in glob format' },
    'o': { alias: 'output', default: 'svg-bundle',
      describe: 'the output directory with basename for bundles (svg & css)' },
    'p': { alias: 'prefix', default: 'svg_',
      describe: 'prefix for CSS selectors' }
  })
  .example('svg-join -s "/your/path/**/*.svg"',
    'Find SVG files in subfolders.')
  .example('svg-join -s "./svg/*.svg" -o ./public/mybundle',
    'Will create mybundle.svg and mybundle.css in public folder.')
  .argv

const svgout = argv.output + '.svg'
const cssout = argv.output + '.css'
const header =
`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">
`
const preserve = new Set(['viewbox'])
const encoding = 'utf8'
let symbols = []
let total = 0
let processed = 0
const file = fs.createWriteStream(svgout, { defaultEncoding: encoding })
file.writeAsync(header)
glob.globAsync(argv.source, { nocase: true }).filter(x => x !== svgout).map(fname => {
  total++
  return fs.readFileAsync(fname, encoding)
    .then(body => {
      try {
        const doc = new xmldoc.XmlDocument(body)
        if (doc.name.toLowerCase() !== 'svg') {
          throw new Error('Error! The root element must be SVG.')
        }
        doc.name = 'symbol'
        const rule = { width: addPX(doc.attr.width), height: addPX(doc.attr.height) }
        Object.keys(doc.attr).forEach(x => {
          if (!preserve.has(x.toLowerCase())) delete doc.attr[x]
        })
        doc.attr.id = path.basename(fname, path.extname(fname))
        rule.name = argv.prefix + doc.attr.id
        symbols.push(rule)
        processed++
        return file.writeAsync(doc.toString({ compressed: true }) + '\n')
      } catch (e) {
        errOut(fname, e.message)
      }
    })
    .error(e => console.error(e.message))
})
.then(() => {
  file.end('</svg>')
  let style = ''
  while (symbols.length > 0) {
    let {width, height} = symbols[0]
    let group = symbols.filter(x => x.width === width && x.height === height).map(x => x.name)
    symbols = symbols.filter(x => x.width !== width || x.height !== height)
    style +=
`.${group.join(',\n.')} {
  width: ${width};
  height: ${height};
}
`
  }
  fs.writeFileAsync(cssout, style, encoding)
    .then(() => console.log(`Successfully processed files: ${processed}/${total}.`))
})
