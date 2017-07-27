// @flow

import {AtomWait, mem, force} from 'lom_atom'
import {Locale} from './common'

export class Hello {
    @mem name = 'test'
}

interface IHelloProps {
    hello: Hello;
    name: string;
}

class HelloProps implements IHelloProps {
    hello: Hello
    name: string
}

class HelloOptions {
    @mem actionName: string
    static deps = [HelloProps]

    constructor({name}: IHelloProps) {
        this.actionName = name + '-hello'
    }
}

class SomeService {
    _opts: HelloOptions
    static deps = [HelloOptions]

    constructor(opts: HelloOptions) {
        this._opts = opts
    }

    value() {
        return this._opts.actionName + '-srv'
    }
}

type HelloState = {
    locale: Locale;
    options: HelloOptions;
    service: SomeService;
}

export function HelloView(
    {hello}: IHelloProps,
    {options, locale, service}: HelloState
) {
    return <div>
        <h3>{options.actionName}, {hello.name}</h3>
        <div className="kv">
            <div className="kv-key">Lang:</div><div className="kv-value">{locale.lang}</div>
        </div>

        <div className="kv">
            <div className="kv-key">Srv:</div><div className="kv-value">{service.value()}</div>
        </div>

        <div className="kv">
            <div className="kv-key">Name:</div>
            <div className="kv-key"><input value={hello.name} onInput={({target}: Event) => {
                hello.name = (target: any).value
            }} /></div>
        </div>

        <div className="kv">
            <div  className="kv-key">Action:</div>
            <div className="kv-value"><input value={options.actionName} onInput={({target}: Event) => {
                options.actionName = (target: any).value
            }} /></div>
        </div>

    </div>
}

HelloView.deps = [{options: HelloOptions, locale: Locale, service: SomeService}]
HelloView.props = HelloProps
