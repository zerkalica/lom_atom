// @flow

import {AtomWait, createReactWrapper, createCreateElement} from 'lom_atom'

import React from 'react'
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

const atomize = createReactWrapper(React.Component, ErrorableView, jss)
const lomCreateElement = createCreateElement(atomize, React.createElement)
global['lom_h'] = lomCreateElement
