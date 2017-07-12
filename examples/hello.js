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

        <input value={hello.name} onChange={(e: Event) => { hello.name = e.target.value}} />
    </div>
}
