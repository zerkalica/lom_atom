// @flow

import './setupReact'

import {AtomWait, mem, force} from 'lom_atom'

import ReactDOM from 'react-dom'

import {CounterView, Counter} from './counter'
import {HelloView, Hello} from './hello'
import {TodoApp} from './todomvc'
import {Locale} from './common'

class Store {
    links = ['hello', 'counter', 'error', 'todomvc']
    @mem route: string = 'hello'
    @mem name = 'vvv'
    counter = new Counter()
    hello = new Hello()
}

interface AppProps {
    store: Store;
    lang: string;
}

function AppView({store}: AppProps) {
    let page
    switch (store.route) {
        case 'hello':
            page = <HelloView hello={store.hello} name={store.name} />
            break

        case 'counter':
            page = <CounterView counter={store.counter} />
            break

        case 'todomvc':
            page = <TodoApp />
            break

        default:
            throw new Error('Unknown page')
    }

    return <div style={{dislay: 'flex', justifyContent: 'center'}}>
        <div style={{padding: '1em'}}>
            {store.links.map((link: string) =>
                <button
                    key={link}
                    style={{margin: '0.3em'}}
                    id={link}
                    onClick={() => store.route = link }
                >{link}</button>
            )}
        </div>
        <div style={{border: '1px solid gray', padding: '0.5em', margin: '0 1em'}}>
            <h1>{store.route}</h1>
            {page}
        </div>
        <div className="kv">
            <div className="kv-key">APPName:</div>
            <div className="kv-value"><input value={store.name} onInput={({target}: Event) => {
                store.name = (target: any).value
            }} /></div>
        </div>
    </div>
}
AppView.provide = (props: AppProps) => ([
    new Locale(props.lang)
])

const store = new Store()

ReactDOM.render(<AppView store={store} lang="ru" />, document.getElementById('app'))
