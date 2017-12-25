// @flow

export const handlers: Map<mixed, Function> = new Map([
    [
        Array,
        function arrayHandler<Target: mixed[], Source: mixed[]>(target: Target, source: Source, stack: mixed[]) {
            let equal = target.length === source.length

            for(let i = 0; i < target.length; ++i) {
                const conformed = target[i] = conform(target[i], source[i], stack)
                if (equal && conformed !== source[i]) equal = false
            }

            return equal ? source : target
        }
    ],
    [
        Object,
        function objectHandler<Target: Object, Source: Object>(target: Target, source: Source, stack: mixed[]) {
            let count = 0
            let equal = true

            for (let key in target) {
                const conformed = target[key] = conform(target[key], source[key], stack)
                if (equal && conformed !== source[key]) equal = false
                ++count
            }

            for (let key in source) if (--count < 0) break

            return (equal && count === 0) ? source : target
        }
    ],
    [
        Date,
        function dateHandler<Target: Date, Source: Date>(target: Target, source: Source) {
            return target.getTime() === source.getTime() ? source : target
        }
    ],
    [
        RegExp,
        function dateHandler<Target: Date, Source: Date>(target: Target, source: Source) {
            return target.toString() === source.toString() ? source : target
        }
    ]
])

export const processed: WeakMap<mixed, boolean> = new WeakMap()

export default function conform<Target, Source>(
    target: Target,
    source: Source,
    stack: mixed[] = []
): Target {
    if (target === source) return (source: any)
    if (
        !target || typeof target !== 'object'
        || !source || typeof source !== 'object'
        || target instanceof Error
        || source instanceof Error
        || target.constructor !== source.constructor
        || processed.has(target)
    ) return target

    processed.set(target, true)
    const conformHandler = handlers.get(target.constructor)

    if (!conformHandler) return target

    if (stack.indexOf(target) !== -1) return target
    stack.push(target)
    const res = conformHandler(target, source, stack)
    stack.pop()

    return res
}
