#!/usr/bin/env node
'use strict'

const fsp = require('fs').promises
const glob = require('fast-glob')
const xmldoc = require('xmldoc')
const path = require('path')

const addPX = x => isFinite(x) ? x + 'px' : x
const parseUnit = (value = '') => value.replace(/[\d.\s]/g, '')

function errOut (fname, message) {
  console.error(`File: ${fname}\n${message}`)
}

function lookslike (src, trg, filter = []) {
  if (filter.length === 0) filter = Object.keys(src)
  return filter.every(x => src[x] && src[x] === trg[x])
}

function equals (src, trg) {
  const filter = Object.keys(src)
  return filter.length === Object.keys(trg).length && filter.every(x => src[x] === trg[x])
}

// obj - object, filter - array or object
function deletelike (obj, filter) {
  if (!Array.isArray(filter)) filter = Object.keys(filter)
  filter.forEach(x => delete obj[x])
}

function CSS_escape (str) {
  return str.replace(/([!#$%&()*+,.\\/;<=>?@[\]^`{|}~])/g, '\\$1').replace(/:/g, '\\3A ')
}

function style_keys (str) {
  let items = str.match(/\s?[\w-]+:.*?(;|$)/g)
  return items.map(x => x.split(':')[0].trim())
}

// names - array, attr - object
function style_format (names, attr) {
  let pad = '  '
  let head = '.' + names.join(',\n.') + ' {\n'
  let body = Object.keys(attr).map(x => `${pad}${x}: ${attr[x]};\n`).join('')
  return head + body + '}\n'
}

// style - array, attr - object
function wipe_style_format (style, attr) {
  return style_format(style.map(x => {
    deletelike(x.attr, attr)
    return x.name
  }), attr)
}

console.log(`SVG-Join ${require('./package.json').version} Join svg files in symbol collection.`)
const argv = require('yargs')
  .options({
    's': { alias: 'source', type: 'string', demand: true,
      describe: 'the source directory with filename mask in glob format' },
    'o': { alias: 'output', type: 'string', default: '.',
      describe: 'the output directory' },
    'n': { alias: 'name', type: 'string', default: 'svg-bundle',
      describe: 'file name (without ext.) for bundles (SVG & CSS)' },
    'cssName': { type: 'string',
      describe: 'file name (with ext.) for CSS bundle (if different)' },
    'p': { alias: 'prefix', type: 'string', default: 'svg_',
      describe: 'prefix for CSS selectors' },
    'm': { alias: 'mono', type: 'boolean', default: false,
      describe: 'extract presentation attributes from single-styled SVG to CSS' },
    'calcSide': { type: 'boolean', default: false,
      describe: 'calculate omitted side from viewBox values' }
  })
  .example('svg-join -s "./svg/*.svg" -o ./public -n mybundle',
    'Will create mybundle.svg and mybundle.css in public folder.')
  .example('svg-join -s "/your/path/**/*.svg"',
    'Find SVG files in subfolders.')
  .strict()
  .argv

const svgout = path.join(argv.output, argv.name + '.svg')
const cssout = path.join(argv.output, argv.cssName || argv.name + '.css')
const header =
`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">
`
const preserve = new Set(['viewbox', 'preserveaspectratio'])
const presentation = new Set(['alignment-baseline', 'baseline-shift', 'clip', 'clip-path', 'clip-rule', 'color',
  'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cursor', 'direction',
  'display', 'dominant-baseline', 'enable-background', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'flood-color',
  'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant',
  'font-weight', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'image-rendering', 'kerning',
  'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'mask', 'opacity', 'overflow',
  'pointer-events', 'shape-rendering', 'stop-color', 'stop-opacity', 'stroke', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor',
  'text-decoration', 'text-rendering', 'unicode-bidi', 'visibility', 'word-spacing', 'writing-mode'])
const units = new Set(['em', 'rem', 'px'])
const round = new Set(['px'])
const encoding = 'utf8'
asyncMain()

async function asyncMain () {
  let symbols = []
  let total = 0
  let processed = 0
  let file
  try {
    file = await fsp.open(svgout, 'w')
    await file.write(header)
    const list = (await glob(argv.source, { caseSensitiveMatch: false })).filter(x => x !== svgout)
    for (const fname of list) {
      total++
      const body = await fsp.readFile(fname, encoding)
      try {
        const doc = new xmldoc.XmlDocument(body)
        if (doc.name.toLowerCase() !== 'svg') {
          throw new Error('Error! The root element must be SVG.')
        }

        let width = 'auto'
        let height = 'auto'
        if (doc.attr.viewBox) {
          let vbox = doc.attr.viewBox.split(/\s+/)
          if (vbox.length === 4) {
            width = +vbox[2] - vbox[0]
            height = +vbox[3] - vbox[1]

            if (argv.calcSide) {
              let w = parseFloat(doc.attr.width)
              let wu = parseUnit(doc.attr.width)
              let h = parseFloat(doc.attr.height)
              let hu = parseUnit(doc.attr.height)
              if (!!w && units.has(wu) && !h) {
                h = height / width * w
                h = round.has(wu) ? Math.round(h) : h.toFixed(4)
                doc.attr.height = h + wu
              } else if (!!h && units.has(hu) && !w) {
                w = width / height * h
                w = round.has(hu) ? Math.round(w) : w.toFixed(4)
                doc.attr.width = w + hu
              }
            }
          }
        }
        const rule = {
          attr: { width: addPX(doc.attr.width || width), height: addPX(doc.attr.height || height) }
        }

        doc.name = 'symbol'
        Object.keys(doc.attr).forEach(x => {
          if (!preserve.has(x.toLowerCase())) delete doc.attr[x]
        })
        doc.attr.id = path.basename(fname, path.extname(fname)).replace(/\s/g, '_').replace(/['"]/g, '')
        rule.name = argv.prefix + CSS_escape(doc.attr.id)

        if (argv.mono) {
          const styled_children = doc.children.filter(x => {
            if (x.attr == undefined) return false
            let keys = Object.keys(x.attr)
            if (x.attr.style) keys = keys.concat(style_keys(x.attr.style))
            return keys.some(y => presentation.has(y))
          })
          if (styled_children.length === 1) {
            Object.keys(styled_children[0].attr).filter(x => presentation.has(x)).forEach(y => {
              rule.attr[y] = styled_children[0].attr[y]
              delete styled_children[0].attr[y]
            })
          }
        }

        symbols.push(rule)
        processed++
        await file.write(doc.toString({ compressed: true }) + '\n')
      } catch (err) {
        errOut(fname, err.message)
      }
    }
    await file.write('</svg>')
    // create and optimize css
    let style = ''
    const wh = ['width', 'height']
    symbols.forEach((symb, index) => {
      if (Object.keys(symb.attr).length === 0) return
      const rest_symbols = symbols.slice(index)
      let attrs = Object.assign({}, symb.attr)
      let same_size = rest_symbols.filter(x => lookslike(attrs, x.attr, wh))
      let same_style = rest_symbols.filter(x => lookslike(attrs, x.attr))
      if (same_size.length > same_style.length) {
        same_size = same_size.map(x => {
          deletelike(x.attr, wh)
          return x.name
        })
        let { width, height } = attrs
        style += style_format(same_size, { width, height })
        if (Object.keys(symb.attr).length > 0) {
          attrs = Object.assign({}, symb.attr)
          same_style = rest_symbols.filter(x => equals(attrs, x.attr))
          style += wipe_style_format(same_style, attrs)
        }
      } else {
        style += wipe_style_format(same_style, attrs)
      }
    })
    await fsp.writeFile(cssout, style, encoding)
    console.log(`Successfully processed files: ${processed}/${total}.`)
  } catch (err) {
    console.error(err.message)
  } finally {
    await file.close()
  }
}
