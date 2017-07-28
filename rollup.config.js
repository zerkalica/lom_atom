import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs'
import progress from 'rollup-plugin-progress'

import globals from 'rollup-plugin-node-globals'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'

const libConfDev = {
    entry: 'src/index.js',

    format: 'umd',
    moduleName: 'lom_atom',

    dest: 'dist/lom_atom.js',
    sourceMap: true,
    plugins: [
        progress(),
        babel({
            exclude: 'node_modules/**'
        })
    ]
}

const examplesConf = {
    entry: 'examples/index.js',
    format: 'iife',
    moduleName: 'examples',

    dest: 'docs/js/examples.js',
    sourceMap: true,
    plugins: [
        progress(),
        postcss(),
        babel({
            exclude: ['node_modules/**', '*.css'],
        }),
        resolve({
            browser: true,
            module: true
        }),
        commonjs({
            include: 'node_modules/**',
            exclude: 'node_modules/process-es6/**'
        }),
        globals(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('development')
        })
    ]
}

export default [
    examplesConf,
    libConfDev
]
