import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

import conf from './rollup.config'
const examplesConf = conf[0]

export default Object.assign(
    {},
    examplesConf,
    {
        plugins: examplesConf.plugins.concat([
            serve({
                open: true,
                historyApiFallback: true,
                contentBase: 'docs'
            }),
            livereload({
                watch: ['docs', 'src', 'examples']
            })
        ])
    }
)
