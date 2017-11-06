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

const commonConf = {
    input: 'src/index.js',
    sourcemap: true,
    plugins: [
        babel(babelrc)
    ].concat(process.env.UGLIFY === '1' ? [uglify(uglifyOpts, minify)] : []),
    output: [
        {file: pkg.module, format: 'es'},
    ]
}

export default [
    commonConf,
    Object.assign({}, commonConf, {
        output: [
            {file: pkg.main, format: 'cjs'},
            {file: pkg['umd:main'], format: 'umd', name: pkg.name}
        ]
    })
]
