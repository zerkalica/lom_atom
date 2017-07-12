import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs'
import progress from 'rollup-plugin-progress'

import globals from 'rollup-plugin-node-globals'
import replace from 'rollup-plugin-replace'

const libConf = {
    entry: 'src/index.js',

    format: 'umd',
    moduleName: 'lom_atom',

    dest: 'dist/lom_atom.js',
    sourceMap: true,
    plugins: [
        progress(),
        babel({
            exclude: 'node_modules/**'
        }),
        // uglify()
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
        babel({
            exclude: 'node_modules/**'
        }),
        commonjs({
            exclude: 'node_modules/process-es6/**',
            include: [
                'node_modules/create-react-class/**',
                'node_modules/fbjs/**',
                'node_modules/object-assign/**',
                'node_modules/react/**',
                'node_modules/react-dom/**',
                'node_modules/prop-types/**'
            ]
        }),
        globals(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('development')
        }),
        resolve({
            browser: true,
            main: true
        })
    ]
}

export default [
    examplesConf,
    libConf
]
