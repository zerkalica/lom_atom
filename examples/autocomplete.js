// @flow

import {AtomWait, force, mem} from 'lom_atom'

interface IAutocompleteProps {
    initialValue: string;
}

class AutocompleteProps implements IAutocompleteProps {
    initialValue: string
}

class AutocompleteService {
    @mem nameToSearch: string
    @force get $(): this {return this}

    static deps = [AutocompleteProps]

    constructor({initialValue}: AutocompleteProps) {
        this.nameToSearch = initialValue
    }

    _handler: number = 0

    _destroy() {
        clearTimeout(this._handler)
    }

    @mem get searchResults(): string[] {
        clearTimeout(this._handler)
        const name = this.nameToSearch
        this._handler = setTimeout(() => {
            fetch(`/api/autocomplete?q=${name}`)
                .then((r: Response) => r.json())
                .then((data: string[]) => {
                    this.$.searchResults = data
                })
                .catch((e: Error) => {
                    this.$.searchResults = e
                })
        }, 500)

        throw new AtomWait()
    }
    @mem
    set searchResults(searchResults: string[] | Error) {}

    setValue = (e: Event) => {
        this.nameToSearch = (e.target: any).value
    }
}

function AutocompleteResultsView(
    {searchResults}: {
        searchResults: string[];
    }
) {
    return <ul>
        {searchResults.map((result: string, i: number) =>
            <li key={result + i}>
                {result}
            </li>
        )}
    </ul>
}

export function AutocompleteView(
    _: IAutocompleteProps,
    {service}: {
        service: AutocompleteService;
    }
) {
    return <div>
        <div>
            Filter:
            <input value={service.nameToSearch} onInput={service.setValue}/>
        </div>
        Values:
        <AutocompleteResultsView searchResults={service.searchResults} />
    </div>
}
AutocompleteView.deps = [{service: AutocompleteService}]
AutocompleteView.props = AutocompleteProps

export function autocompleteMocks(
    rawStorage: Storage
) {
    const fixture = [
        'John Doe',
        'Vasia Pupkin'
    ]

    return [
        {
            method: 'GET',
            matcher: new RegExp('/api/autocomplete'),
            response(url: string, params: RequestOptions) { // eslint-disable-line
                const names = url.match(new RegExp('/api/autocomplete\\?q=(.+)'))
                const name = names && names.length ? names[1] : ''

                return name
                    ? fixture.filter((userName: string) => userName.indexOf(name) === 0)
                    : fixture
            }
        }
    ]
}
