// @flow

import {AtomWait, mem, force} from 'lom-atom'
import {Locale} from './common'

export class Hello {
    @mem name = 'test'
}

class HelloOptions {
    @mem actionName: string
    constructor(name: string) {
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


type HelloProps = {
    hello: Hello;
    name: string;
}

type HelloState = {
    locale: Locale;
    options: HelloOptions;
    service: SomeService;
}

export function HelloView(
    {hello}: HelloProps,
    {options, locale, service}: HelloState
) {
    return <div>
        <h3>{options.actionName}, {hello.name}</h3>
        Lang: {locale.lang}<br/>
        Srv: {service.value()}<br/>
        Name: <input value={hello.name} onInput={({target}: Event) => {
            hello.name = (target: any).value
        }} />
        <br/>

        Action: <input value={options.actionName} onInput={({target}: Event) => {
            options.actionName = (target: any).value
        }} />

    </div>
}

HelloView.deps = [{options: HelloOptions, locale: Locale, service: SomeService}]
HelloView.provide = (props: HelloProps, prevState?: HelloState) => ([
    new HelloOptions(props.name)
])
