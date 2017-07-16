// @flow

import './setupReact'

import {AtomWait, mem, force} from 'lom-atom'

import ReactDOM from 'react-dom'

import {CounterView, Counter} from './counter'
import {HelloView, Hello} from './hello'

import {Locale} from './common'

class Store {
    links = ['hello', 'counter', 'error']
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

        default:
            throw new Error('Unknown page')
    }

    return <div>
        <h1>{store.route}</h1>
        {page}
        <div>
            APPName: <input value={store.name} onInput={({target}: Event) => {
                store.name = (target: any).value
            }} />
            <br/>
            {store.links.map((link: string) =>
                <button
                    key={link}
                    id={link}
                    onClick={() => store.route = link }
                >{link}</button>
            )}
        </div>
    </div>
}
AppView.provide = (props: AppProps) => ([
    new Locale(props.lang)
])

const store = new Store()

ReactDOM.render(<AppView store={store} lang="ru" />, document.getElementById('app'))
