import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import {minify} from 'uglify-es'

import fs from 'fs'
import path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))

const babelrc = JSON.parse(fs.readFileSync(path.join(__dirname, '.babelrc')))

const magic = 'commonjs'
babelrc.babelrc = false
babelrc.plugins = babelrc.plugins.map(
    plugin => (Array.isArray(plugin) ? (plugin[0] || ''): plugin).indexOf(magic) >= 0 ? null : plugin
).filter(Boolean)
babelrc.runtimeHelpers = true

const uglifyOpts = {
    warnings: true,
    compress: {
        dead_code: true,
        unused: true,
        toplevel: true,
        warnings: true
    },
    mangle: {
        properties: false,
        toplevel: true
    }
}
//console.log(JSON.stringify(babelrc,0,' '))

const commonConf = {
    input: 'src/index.js',
    plugins: [
        babel(babelrc)
    ].concat(process.env.UGLIFY === '1' ? [uglify(uglifyOpts, minify)] : []),
    output: [
        {sourcemap: true, file: pkg.module, format: 'es'},
    ]
}

export default [
    commonConf,
    Object.assign({}, commonConf, {
        output: [
            {sourcemap: true, file: pkg.main, format: 'cjs'},
            {sourcemap: true, file: pkg['umd:main'], format: 'umd', name: pkg.name}
        ]
    })
]
