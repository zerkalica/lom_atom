// @flow

import {AtomWait, mem, force} from 'lom-atom'

export class Hello {
    @mem name = 'test'
}

class HelloContext {
    @mem actionName = 'Hello'
}

type HelloProps = {
    hello: Hello;
}

class HelloViewHooks {
    initContext(props: HelloProps): HelloContext {
        return new HelloContext()
    }
}

export function HelloView(
    {hello}: HelloProps,
    context: HelloContext
) {
    return <div>
        <h3>{context.actionName}, {hello.name}</h3>

        Name: <input value={hello.name} onInput={({target}: Event) => {
            hello.name = (target: any).value
        }} />
        <br/>

        Action: <input value={context.actionName} onInput={({target}: Event) => {
            context.actionName = (target: any).value
        }} />

    </div>
}
HelloView.hooks = HelloViewHooks
