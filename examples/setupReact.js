// @flow

import {AtomWait, createReactWrapper, createCreateElement} from 'lom_atom'

import React from 'react'

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

const atomize = createReactWrapper(React.Component, ErrorableView)
const lomCreateElement = createCreateElement(atomize, React.createElement)
global['lom_h'] = lomCreateElement
