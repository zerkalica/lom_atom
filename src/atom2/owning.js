// @flow

interface IDistructable {
    destructor(): void;
}

class Owning {
    map: WeakMap<any, any> = new WeakMap()

    allow<Having>(having: Having): boolean {
        return !!having
            && typeof having === 'object'
            && 'destructor' in having
    }

    get<Owner, Having>(having: Having): ?Owner {
        return this.allow(having) ? this.map.get(having) : undefined
    }

    check<Owner, Having>(owner: Owner, having: Having): boolean {
        return this.allow(having)
            && this.map.get(having) === owner
    }

    catch<Owner, Having>(owner: Owner, having: Having): void {
        if (this.allow(having) && this.map.get(having) !== owner)
            this.map.set(having, owner)
    }
}

const owning = new Owning()

export default owning
