// @flow

import {AtomWait, mem, force} from 'lom-atom'

export class Hello {
    @mem name = 'test'
}

export function HelloView({hello}: {
    hello: Hello
}) {
    return <div>
        <h3>Hello, {hello.name}</h3>

        <input value={hello.name} onChange={({target}: Event) => {
            hello.name = (target: any).value
        }} />
    </div>
}
