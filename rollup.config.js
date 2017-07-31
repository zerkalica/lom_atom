import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import {minify} from 'uglify-es'
import babelrc from 'babelrc-rollup'

import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json'))

const plugins = [ uglify({}, minify) ]

const commonConf = {
    entry: 'src/index.js',
    sourceMap: true,
    plugins: [
        babel(babelrc())
    ],
    targets: [
        {dest: pkg.module, format: 'es'},
    ]
}

export default [
    commonConf,
    Object.assign({}, commonConf, {
        plugins: commonConf.plugins.concat([
            uglify({}, minify)
        ]),
        targets: [
            {dest: pkg.main, format: 'cjs'},
            {dest: pkg['umd:main'], format: 'umd', moduleName: pkg.name}
        ]
    })
]
