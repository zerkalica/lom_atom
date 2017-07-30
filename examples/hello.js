// @flow

import {AtomWait, mem, force} from 'lom_atom'
import {ItemView, Locale} from './common'

class Hello {
    @mem name = 'test'
}

interface IHelloProps {
    name: string;
}

class HelloProps implements IHelloProps {
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
    hello: Hello;
}

export function HelloView(
    _: IHelloProps,
    {hello, options, locale, service}: HelloState
) {
    return <div>
        <h3>{options.actionName}, {hello.name}</h3>
        <ItemView>
            <ItemView.Key>Lang:</ItemView.Key>
            <ItemView.Value>{locale.lang}</ItemView.Value>
        </ItemView>

        <ItemView>
            <ItemView.Key>Srv:</ItemView.Key>
            <ItemView.Value>{service.value()}</ItemView.Value>
        </ItemView>

        <ItemView>
            <ItemView.Key>Name:</ItemView.Key>
            <ItemView.Value><input value={hello.name} onInput={({target}: Event) => {
                hello.name = (target: any).value
            }} /></ItemView.Value>
        </ItemView>

        <ItemView>
            <ItemView.Key>Action:</ItemView.Key>
            <ItemView.Value><input value={options.actionName} onInput={({target}: Event) => {
                options.actionName = (target: any).value
            }} /></ItemView.Value>
        </ItemView>
    </div>
}

HelloView.deps = [{hello: Hello, options: HelloOptions, locale: Locale, service: SomeService}]
HelloView.props = HelloProps
