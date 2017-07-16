// @flow

import {AtomWait, mem, force} from 'lom-atom'
import {Locale} from './common'

export class Hello {
    @mem name = 'test'
}

class HelloOptions {
    @mem actionName: string
    constructor(name: string) {
        this.actionName = name +'-hello'
    }
}

type HelloProps = {
    hello: Hello;
    name: string;
}

type HelloState = {
    locale: Locale;
    options: HelloOptions;
}

export function HelloView(
    {hello}: HelloProps,
    {options, locale}: HelloState
) {
    return <div>
        <h3>{options.actionName}, {hello.name}</h3>
        Lang: {locale.lang}
        Name: <input value={hello.name} onInput={({target}: Event) => {
            hello.name = (target: any).value
        }} />
        <br/>

        Action: <input value={options.actionName} onInput={({target}: Event) => {
            options.actionName = (target: any).value
        }} />

    </div>
}

HelloView.deps = [{options: HelloOptions, locale: Locale}]
HelloView.provide = (props: HelloProps, prevState?: HelloState) => ([
    new HelloOptions(props.name)
])
