// @flow

import './setupReact'

import {AtomWait, mem, force} from 'lom-atom'

import ReactDOM from 'react-dom'

import {CounterView, Counter} from './counter'
import {HelloView, Hello} from './hello'

class Store {
    links = ['hello', 'counter']
    @mem route: string = 'hello'
    counter = new Counter()
    hello = new Hello()
}

function AppView({store}: {
    store: Store;
}) {
    let page
    switch (store.route) {
        case 'hello':
            page = <HelloView hello={store.hello} />
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

const store = new Store()

ReactDOM.render(<AppView store={store}/>, document.getElementById('app'))
