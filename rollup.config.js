import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import {minify} from 'uglify-es'
import babelrc from 'babelrc-rollup'

import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json'))

const commonConf = {
    input: 'src/index.js',
    sourcemap: true,
    plugins: [
        babel(babelrc())
    ].concat(process.env.UGLIFY === '1' ? [uglify({}, minify)] : []),
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
