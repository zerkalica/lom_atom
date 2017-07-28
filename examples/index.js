// @flow

import './setupReact'

import {AtomWait, mem, force} from 'lom_atom'

import {render} from 'preact'

import {CounterView, Counter} from './counter'
import {HelloView, Hello} from './hello'
import {TodoApp, todoMocks} from './todomvc'
import {AutocompleteView, autocompleteMocks} from './autocomplete'

import {ItemView, Locale, mockFetch} from './common'

mockFetch(localStorage, 500, [
    todoMocks,
    autocompleteMocks
])

class Store {
    links = ['hello', 'counter', 'error', 'todomvc', 'autocomplete']
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

        case 'autocomplete':
            page = <AutocompleteView initialValue={store.name} />
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
        <div style={{border: '1px solid gray', padding: '1em', margin: '0 1em'}}>
            <h1>{store.route}</h1>
            {page}
        </div>
        <ItemView>
            <ItemView.Key>APPName:</ItemView.Key>
            <ItemView.Value><input value={store.name} onInput={({target}: Event) => {
                store.name = (target: any).value
            }} /></ItemView.Value>
        </ItemView>
    </div>
}
AppView.provide = (props: AppProps) => ([
    new Locale(props.lang)
])

const store = new Store()

render(<AppView store={store} lang="ru" />, document.getElementById('app'))
