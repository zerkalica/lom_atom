// @flow

import {AtomWait, createReactWrapper, createCreateElement} from 'lom_atom'

import {h, Component} from 'preact'
import {create as createJss} from 'jss'
import jssCamel from 'jss-camel-case'
import jssGlobal from 'jss-global'
import jssNested from 'jss-nested'

function ErrorableView({
    error
}: {
    error: Error
}) {
    return (
        <div>
            {error instanceof AtomWait
                ? <div>
                    Loading...
                </div>
                : <div>
                    <h3>Fatal error !</h3>
                    <div>{error.message}</div>
                    <pre>
                        {error.stack.toString()}
                    </pre>
                </div>
            }
        </div>
    )
}

const jss = createJss({
    plugins: [
        jssNested(),
        jssCamel(),
        jssGlobal()
    ]
})

const atomize = createReactWrapper(Component, ErrorableView, jss)
const lomCreateElement = createCreateElement(atomize, h)
global['lom_h'] = lomCreateElement
