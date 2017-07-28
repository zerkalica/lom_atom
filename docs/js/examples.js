(function () {
'use strict';

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  head.appendChild(style);
  
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  return returnValue;
}

var global$1 = typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {};

var ATOM_STATUS = {
    DESTROYED: 0,
    OBSOLETE: 1,
    CHECKING: 2,
    PULLING: 3,
    ACTUAL: 4
}; // eslint-disable-line


var catchedId = Symbol('lom_atom_catched');
//  | Error

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};







var objectDestructuringEmpty = function (obj) {
  if (obj == null) throw new TypeError("Cannot destructure undefined");
};



var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var throwOnAccess = {
    get: function get$$1(target) {
        throw target.valueOf();
    },
    ownKeys: function ownKeys(target) {
        throw target.valueOf();
    }
};

function createMock(error) {
    return new Proxy(error, throwOnAccess);
}

function defaultNormalize(next, prev) {
    if (next === prev) return next;

    if (next instanceof Array && prev instanceof Array && next.length === prev.length) {
        for (var i = 0; i < next.length; i++) {
            if (next[i] !== prev[i]) {
                return next;
            }
        }

        return prev;
    }

    return next;
}

var AtomWait = function (_Error) {
    inherits(AtomWait, _Error);

    function AtomWait() {
        var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Wait...';
        classCallCheck(this, AtomWait);

        var _this = possibleConstructorReturn(this, _Error.call(this, message)
        // $FlowFixMe new.target
        );

        _this.name = 'AtomWait';
        _this['__proto__'] = new.target.prototype;_this[catchedId] = true;
        return _this;
    }

    return AtomWait;
}(Error);

function shouldUpdate(oldProps, props) {
    if (oldProps === props) {
        return false;
    }
    if (!oldProps && props || !props && oldProps) {
        return true;
    }

    var lpKeys = 0;
    for (var k in oldProps) {
        // eslint-disable-line
        if (oldProps[k] !== props[k]) {
            return true;
        }
        lpKeys++;
    }
    for (var _k in props) {
        // eslint-disable-line
        lpKeys--;
    }

    return lpKeys !== 0;
}

function checkSlave(slave) {
    slave.check();
}

function obsoleteSlave(slave) {
    slave.obsolete();
}

function disleadThis(master) {
    master.dislead(this);
}

function actualizeMaster(master) {
    if (this.status === ATOM_STATUS.CHECKING) {
        master.actualize();
    }
}

var Atom = function () {
    function Atom(field, handler, host, isComponent, context, normalize) {
        classCallCheck(this, Atom);
        this.status = ATOM_STATUS.OBSOLETE;
        this._masters = null;
        this._slaves = null;
        this._cached = undefined;

        this.field = field;
        this._handler = handler;
        this._host = host;
        this.isComponent = isComponent || false;
        this._normalize = normalize || defaultNormalize;
        this._context = context;
    }

    Atom.prototype.destroyed = function destroyed(isDestroyed) {
        if (isDestroyed === undefined) {
            return this.status === ATOM_STATUS.DESTROYED;
        }

        if (isDestroyed) {
            if (this.status !== ATOM_STATUS.DESTROYED) {
                // console.log('destroy', this.field)
                if (this._masters) {
                    this._masters.forEach(disleadThis, this);
                    this._masters = null;
                }
                this._checkSlaves();
                this._cached = undefined;
                this.status = ATOM_STATUS.DESTROYED;
                var host = this._host;
                if (host !== undefined) {
                    this._context.destroyHost(host, this.field);
                }
            }

            return true;
        }

        return false;
    };

    Atom.prototype.get = function get$$1(force) {
        if (force || this._context.force) {
            this._context.force = false;
            this._pullPush(undefined, true);
        } else {
            this.actualize();
        }

        var slave = this._context.last;
        if (slave && (!slave.isComponent || !this.isComponent)) {
            var slaves = this._slaves;
            if (!slaves) {
                // console.log('unreap', this.field)
                this._context.unreap(this);
                slaves = this._slaves = new Set();
            }
            console.log('add slave', slave.field, 'to master', this.field);
            slaves.add(slave);
            slave.addMaster(this);
        }

        return this._cached;
    };

    Atom.prototype.set = function set$$1(v, force) {
        var normalized = this._normalize(v, this._cached);

        if (this._cached === normalized) {
            return normalized;
        }
        if (normalized === undefined) {
            return this._cached;
        }

        // console.log('set', this.field, 'value', normalized)

        if (force || this._context.force || normalized instanceof Error) {
            this._context.force = false;
            this.status = ATOM_STATUS.ACTUAL;
            this._context.newValue(this, this._cached, normalized);
            this._cached = normalized instanceof Error ? createMock(normalized) : normalized;
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave);
            }
        } else {
            this.obsolete();
            this.actualize(normalized);
        }

        return this._cached;
    };

    Atom.prototype.actualize = function actualize(proposedValue) {
        if (this.status === ATOM_STATUS.ACTUAL) {
            return;
        }

        if (this.status === ATOM_STATUS.CHECKING) {
            if (this._masters) {
                this._masters.forEach(actualizeMaster, this);
            }

            if (this.status === ATOM_STATUS.CHECKING) {
                this.status = ATOM_STATUS.ACTUAL;
            }
        }

        if (this.status !== ATOM_STATUS.ACTUAL) {
            this._pullPush(proposedValue);
        }
    };

    Atom.prototype._pullPush = function _pullPush(proposedValue, force) {
        if (this._masters) {
            this._masters.forEach(disleadThis, this);
        }
        var newValue = void 0;

        this.status = ATOM_STATUS.PULLING;

        var context = this._context;
        var slave = context.last;
        context.last = this;
        try {
            newValue = this._normalize(this._host === undefined ? this._handler(proposedValue, force) : this._handler.call(this._host, proposedValue, force), this._cached);
        } catch (error) {
            if (error[catchedId] === undefined) {
                error[catchedId] = true;
                console.error(error.stack || error);
            }
            newValue = createMock(error);
        }

        context.last = slave;

        this.status = ATOM_STATUS.ACTUAL;

        if (newValue !== undefined && this._cached !== newValue) {
            this._context.newValue(this, this._cached, newValue);
            this._cached = newValue;
            if (this._slaves) {
                this._slaves.forEach(obsoleteSlave);
            }
        }
    };

    Atom.prototype.dislead = function dislead(slave) {
        var slaves = this._slaves;
        if (slaves) {
            if (slaves.size === 1) {
                this._slaves = null;
                console.log('reap (slaves === null)', this.field);
                this._context.proposeToReap(this);
            } else {
                console.log('delete slave', slave.field, 'from', this.field);
                slaves.delete(slave);
            }
        }
    };

    Atom.prototype._checkSlaves = function _checkSlaves() {
        if (this._slaves) {
            this._slaves.forEach(checkSlave);
        } else {
            // console.log('pull', this.field)
            this._context.proposeToPull(this);
        }
    };

    Atom.prototype.check = function check() {
        if (this.status === ATOM_STATUS.ACTUAL) {
            this.status = ATOM_STATUS.CHECKING;
            this._checkSlaves();
        }
    };

    Atom.prototype.obsolete = function obsolete() {
        if (this.status !== ATOM_STATUS.OBSOLETE) {
            this.status = ATOM_STATUS.OBSOLETE;
            this._checkSlaves();
        }
    };

    Atom.prototype.addMaster = function addMaster(master) {
        if (!this._masters) {
            this._masters = new Set();
        }
        this._masters.add(master);
    };

    Atom.prototype.value = function value(next, force) {
        return next === undefined ? this.get(force) : this.set(next, force);
    };

    return Atom;
}();

function reap(atom, key, reaping) {
    reaping.delete(atom);
    atom.destroyed(true);
}

var animationFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : function (fn) {
    return setTimeout(fn, 0);
};

function createKeyedHandler(host, handler, key) {
    return function keyedHandler(next, force) {
        return handler.call(host, key, next, force);
    };
}

var Context = function () {
    function Context() {
        var _this = this;

        classCallCheck(this, Context);
        this.last = null;
        this.force = false;
        this._logger = null;
        this._updating = [];
        this._reaping = new Set();
        this._scheduled = false;
        this._atomMap = new WeakMap();

        this._run = function () {
            if (_this._scheduled) {
                _this.run();
            }
        };
    }

    Context.prototype.getKeyAtom = function getKeyAtom(host, keyHandler, key) {
        var map = this._atomMap.get(host);
        if (map === undefined) {
            map = new Map();
            this._atomMap.set(host, map);
        }
        var atom = map.get(key);
        if (atom === undefined) {
            atom = new Atom(key, createKeyedHandler(host, keyHandler, key), host, undefined, this);
            map.set(key, atom);
            // host[key + '@'] = atom
        }

        return atom;
    };

    Context.prototype.getAtom = function getAtom(host, handler, key, isComponent) {
        var map = this._atomMap.get(host);
        if (map === undefined) {
            map = new Map();
            this._atomMap.set(host, map);
        }
        var atom = map.get(key);
        if (atom === undefined) {
            atom = new Atom(key, handler, host, isComponent, this);
            map.set(key, atom);
            // host[key + '@'] = atom
        }

        return atom;
    };

    Context.prototype.destroyHost = function destroyHost(host, key) {
        var map = this._atomMap.get(host);
        if (map !== undefined) {
            map.delete(key);
            if (map.size === 0) {
                if (host._destroy !== undefined) {
                    host._destroy();
                }
                this._atomMap.delete(host);
            }
        }
    };

    Context.prototype.setLogger = function setLogger(logger) {
        this._logger = logger;
    };

    Context.prototype.newValue = function newValue(atom, from, to) {
        if (this._logger) {
            if (to instanceof AtomWait) {
                this._logger.pulling(atom);
            } else if (to instanceof Error) {
                this._logger.error(atom, to);
            } else {
                this._logger.newValue(atom, from, to);
            }
        }
    };

    Context.prototype.proposeToPull = function proposeToPull(atom) {
        // this.logger.pull(atom)
        this._updating.push(atom);
        this._schedule();
    };

    Context.prototype.proposeToReap = function proposeToReap(atom) {
        // this.logger.reap(atom)
        this._reaping.add(atom);
        this._schedule();
    };

    Context.prototype.unreap = function unreap(atom) {
        // this.logger.unreap(atom)
        this._reaping.delete(atom);
    };

    Context.prototype._schedule = function _schedule() {
        if (this._scheduled) {
            return;
        }
        this._scheduled = true;
        animationFrame(this._run);
    };

    Context.prototype.run = function run() {
        var reaping = this._reaping;
        var updating = this._updating;
        var start = 0;
        do {
            var end = updating.length;

            for (var i = start; i < end; i++) {
                var atom = updating[i];
                if (!reaping.has(atom) && !atom.destroyed()) {
                    atom.actualize();
                }
            }

            start = end;
        } while (updating.length > start);
        updating.length = 0;

        while (reaping.size > 0) {
            reaping.forEach(reap);
        }
        // console.log('---------------------------- state changed\n')
        this._scheduled = false;
    };

    return Context;
}();

var defaultContext = new Context();

function memMethod(proto, name, descr, isComponent) {
    proto[name + '$'] = descr.value;
    var handler = descr.value;
    if (handler === undefined) {
        throw new TypeError(name + ' is not an function (next?: V)');
    }

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value: function value(next, force) {
            return defaultContext.getAtom(this, handler, name, isComponent).value(next, force);
        }
    };
}

function createGetSetHandler(get, set) {
    return function getSetHandler(next) {
        if (next === undefined) {
            return get.call(this);
        }
        set.call(this, next);
        return next;
    };
}

function createValueHandler(initializer) {
    return function valueHandler(next) {
        return next === undefined && initializer !== undefined ? initializer.call(this) : next;
    };
}

function memProp(proto, name, descr) {
    var handlerKey = name + '$';
    if (proto[handlerKey] !== undefined) {
        return;
    }

    var handler = proto[handlerKey] = descr.get === undefined && descr.set === undefined ? createValueHandler(descr.initializer) : createGetSetHandler(descr.get, descr.set);

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get: function get() {
            return defaultContext.getAtom(this, handler, name).get();
        },
        set: function set(val) {
            defaultContext.getAtom(this, handler, name).set(val);
        }
    };
}

function getKey(params) {
    if (!params) {
        return '';
    }

    return typeof params === 'object' ? Object.keys(params).sort().map(function (key) {
        return key + ':' + JSON.stringify(params[key]);
    }).join('.') : JSON.stringify(params);
}

function memkey(proto, name, descr) {
    var handler = descr.value;
    if (handler === undefined) {
        throw new TypeError(name + ' is not an function (rawKey: K, next?: V)');
    }

    proto[name + '$'] = handler;

    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        value: function value(rawKey, next, force) {
            return defaultContext.getKeyAtom(this, handler, typeof rawKey === 'function' ? rawKey : name + '(' + getKey(rawKey) + ')').value(next, force);
        }
    };
}

function forceGet() {
    defaultContext.force = true;
    return this;
}

function force(proto, name, descr) {
    return {
        enumerable: descr.enumerable,
        configurable: descr.configurable,
        get: forceGet
    };
}

function mem(proto, name, descr) {
    return descr.value === undefined ? memProp(proto, name, descr) : memMethod(proto, name, descr);
}

function detached(proto, name, descr) {
    return memMethod(proto, name, descr, true);
}

var ThemeProvider = function () {
    function ThemeProvider(themeFn, resolver, processor) {
        classCallCheck(this, ThemeProvider);

        this._themeFn = themeFn;
        this._processor = processor;
        this._resolver = resolver;
    }

    // @mem


    ThemeProvider.prototype.theme = function theme() {
        if (this._sheet) {
            // return this._sheet.classes
            this._sheet.detach();
        }
        var sheet = this._sheet = this._processor.createStyleSheet(this._resolver.instance(this._themeFn));
        sheet.attach();

        return sheet.classes;
    };

    ThemeProvider.prototype._destroy = function _destroy() {
        if (this._sheet) {
            this._sheet.detach();
        }
        this._themeFn = undefined;
        this._processor = undefined;
        this._resolver = undefined;
        this._sheet = undefined;
    };

    return ThemeProvider;
}();

var ThemeFactory = function () {
    function ThemeFactory(processor) {
        classCallCheck(this, ThemeFactory);

        this._processor = processor;
    }

    ThemeFactory.prototype.createTheme = function createTheme(themeFn, resolver) {
        if (this._processor === undefined) {
            return {};
        }
        themeFn.cached = themeFn.cached || new ThemeProvider(themeFn, resolver, this._processor).theme();
        return themeFn.cached;
    };

    return ThemeFactory;
}();

var _class$1;

function _applyDecoratedDescriptor$2(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var chainCount = 0;

var Injector = (_class$1 = function () {
    function Injector(parent, items, themeFactory) {
        classCallCheck(this, Injector);

        this.parent = parent;
        this.top = parent ? parent.top : this;
        this._themeFactory = themeFactory;
        if (items !== undefined) {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item instanceof Array) {
                    this.value(item[0], item[1], true);
                } else if (typeof item === 'function') {
                    this.value(item, null, true);
                } else {
                    this.value(item.constructor, item, true);
                }
            }
        }
    }

    Injector.prototype.value = function value(key, next, force$$1) {
        if (next !== undefined) return next;

        if (key.theme === true) {
            if (this.top === this) {
                return this._themeFactory.createTheme(key, this);
            }
            return this.top.value(key);
        }

        if (this.parent !== undefined) {
            chainCount++;
            var value = this.parent.value(key);
            chainCount--;
            if (value !== undefined) {
                return value;
            }
        }
        if (chainCount === 0) {
            return this.instance(key);
        }
    };

    Injector.prototype._destroy = function _destroy() {
        this.parent = undefined;
        this.map = undefined;
        this.top = undefined;
        this._themeFactory = undefined;
    };

    Injector.prototype._fastCall = function _fastCall(key, args) {
        switch (args.length) {
            case 1:
                return new key(args[0]);
            case 2:
                return new key(args[0], args[1]);
            case 3:
                return new key(args[0], args[1], args[2]);
            case 4:
                return new key(args[0], args[1], args[2], args[3]);
            case 5:
                return new key(args[0], args[1], args[2], args[3], args[4]);
            default:
                return new (Function.prototype.bind.apply(key, [null].concat(args)))();
        }
    };

    Injector.prototype.instance = function instance(key) {
        return this._fastCall(key, this.resolve(key.deps));
    };

    Injector.prototype.copy = function copy(items) {
        return new Injector(this, items, this._themeFactory);
    };

    Injector.prototype.resolve = function resolve(argDeps) {
        var result = [];
        if (argDeps !== undefined) {
            for (var i = 0, l = argDeps.length; i < l; i++) {
                var argDep = argDeps[i];
                if (typeof argDep === 'object') {
                    var obj = {};
                    for (var prop in argDep) {
                        // eslint-disable-line
                        obj[prop] = this.value(argDep[prop]);
                    }
                    result.push(obj);
                } else {
                    result.push(this.value(argDep));
                }
            }
        }

        return result;
    };

    return Injector;
}(), (_applyDecoratedDescriptor$2(_class$1.prototype, 'value', [memkey], Object.getOwnPropertyDescriptor(_class$1.prototype, 'value'), _class$1.prototype)), _class$1);

function _applyDecoratedDescriptor$1(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

function createEventFix(origin) {
    function fixEvent(e) {
        origin(e);
        defaultContext.run();
    }
    fixEvent.displayName = origin.displayName || origin.name;

    return fixEvent;
}

var parentContext = undefined;

function createCreateElement(atomize, createElement) {
    return function lomCreateElement() {
        var el = arguments[0];
        var attrs = arguments[1];

        var newEl = void 0;
        var isAtomic = typeof el === 'function' && el.prototype.render === undefined;
        if (isAtomic) {
            if (el.__lom === undefined) {
                el.__lom = atomize(el);
            }
            newEl = el.__lom;
            if (!attrs) {
                attrs = { __lom_ctx: parentContext };
            } else {
                attrs.__lom_ctx = parentContext;
            }
        } else {
            newEl = el;
        }
        if (attrs) {
            if (attrs.onKeyPress) {
                attrs.onKeyPress = createEventFix(attrs.onKeyPress);
            }
            if (attrs.onKeyDown) {
                attrs.onKeyDown = createEventFix(attrs.onKeyDown);
            }
            if (attrs.onKeyUp) {
                attrs.onKeyUp = createEventFix(attrs.onKeyUp);
            }
            if (attrs.onInput) {
                attrs.onChange = createEventFix(attrs.onInput);
            }
            if (attrs.onChange) {
                attrs.onChange = createEventFix(attrs.onChange);
            }
        }

        switch (arguments.length) {
            case 2:
                return createElement(newEl, attrs);
            case 3:
                return createElement(newEl, attrs, arguments[2]);
            case 4:
                return createElement(newEl, attrs, arguments[2], arguments[3]);
            case 5:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4]);
            case 6:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4], arguments[5]);
            case 7:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
            case 8:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7]);
            case 9:
                return createElement(newEl, attrs, arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8]);
            default:
                if (isAtomic === false) {
                    return createElement.apply(null, arguments);
                }
                var args = [newEl, attrs];
                for (var i = 2, l = arguments.length; i < l; i++) {
                    args.push(arguments[i]);
                }
                return createElement.apply(null, args);
        }
    };
}

function createReactWrapper(BaseComponent, defaultFromError, themeProcessor, rootDeps) {
    var _desc, _value, _class;

    var rootInjector = new Injector(undefined, rootDeps, new ThemeFactory(themeProcessor));

    var AtomizedComponent = (_class = function (_BaseComponent) {
        inherits(AtomizedComponent, _BaseComponent);

        function AtomizedComponent(props, reactContext, render) {
            classCallCheck(this, AtomizedComponent);

            var _this = possibleConstructorReturn(this, _BaseComponent.call(this, props, reactContext));

            _this._propsChanged = true;
            _this._injector = undefined;
            _this._el = undefined;

            _this._render = render;
            if (render.deps !== undefined || render.props !== undefined) {
                _this.constructor.instances++;
            }
            return _this;
        }

        AtomizedComponent.prototype.shouldComponentUpdate = function shouldComponentUpdate(props) {
            this._propsChanged = shouldUpdate(this.props, props);
            return this._propsChanged;
        };

        AtomizedComponent.prototype.componentWillUnmount = function componentWillUnmount() {
            this._el = undefined;
            this.props = undefined;
            this._injector = undefined;
            var render = this._render;
            if (render.deps !== undefined || render.props !== undefined) {
                this.constructor.instances--;
            }
            this._render = undefined;
            defaultContext.getAtom(this, this.r, 'r').destroyed(true);
        };

        AtomizedComponent.prototype._getInjector = function _getInjector() {
            var parentInjector = this.props.__lom_ctx || rootInjector;
            // Autodetect separate state per component instance
            this._injector = this.constructor.instances > 0 || this._render.localState !== undefined ? parentInjector.copy() : parentInjector;

            return this._injector;
        };

        AtomizedComponent.prototype._state = function _state(next, force$$1) {
            var injector = this._injector || this._getInjector();
            if (this._render.props && force$$1) {
                injector.value(this._render.props, this.props, true);
            }

            return injector.resolve(this._render.deps)[0];
        };

        AtomizedComponent.prototype.r = function r(element, force$$1) {
            var data = void 0;

            var render = this._render;

            var prevContext = parentContext;
            parentContext = this._injector || this._getInjector();

            var state = render.deps !== undefined ? this._state(undefined, force$$1) : undefined;

            try {
                data = render(this.props, state);
            } catch (error) {
                data = (this._render.onError || defaultFromError)({ error: error });
            }
            parentContext = prevContext;

            if (!force$$1) {
                this._el = data;
                this.forceUpdate();
                this._el = undefined;
            }
            this._propsChanged = false;

            return data;
        };

        AtomizedComponent.prototype.render = function render() {
            return this._el === undefined ? this.r(undefined, this._propsChanged) : this._el;
        };

        return AtomizedComponent;
    }(BaseComponent), (_applyDecoratedDescriptor$1(_class.prototype, '_state', [mem], Object.getOwnPropertyDescriptor(_class.prototype, '_state'), _class.prototype), _applyDecoratedDescriptor$1(_class.prototype, 'r', [detached], Object.getOwnPropertyDescriptor(_class.prototype, 'r'), _class.prototype)), _class);


    return function reactWrapper(render) {
        function WrappedComponent(props, context) {
            AtomizedComponent.call(this, props, context, render);
        }
        WrappedComponent.instances = 0;
        WrappedComponent.displayName = render.displayName || render.name;
        WrappedComponent.prototype = Object.create(AtomizedComponent.prototype);
        WrappedComponent.prototype.constructor = WrappedComponent;

        return WrappedComponent;
    };
}

/** Virtual DOM Node */
function VNode() {}

/** Global options
 *	@public
 *	@namespace options {Object}
 */
var options = {

	/** If `true`, `prop` changes trigger synchronous component updates.
  *	@name syncComponentUpdates
  *	@type Boolean
  *	@default true
  */
	//syncComponentUpdates: true,

	/** Processes all created VNodes.
  *	@param {VNode} vnode	A newly-created VNode to normalize/process
  */
	//vnode(vnode) { }

	/** Hook invoked after a component is mounted. */
	// afterMount(component) { }

	/** Hook invoked after the DOM is updated with a component's latest render. */
	// afterUpdate(component) { }

	/** Hook invoked immediately before a component is unmounted. */
	// beforeUnmount(component) { }
};

var stack = [];

var EMPTY_CHILDREN = [];

/** JSX/hyperscript reviver
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 */
function h(nodeName, attributes) {
	var children = EMPTY_CHILDREN,
	    lastSimple,
	    child,
	    simple,
	    i;
	for (i = arguments.length; i-- > 2;) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children != null) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) && child.pop !== undefined) {
			for (i = child.length; i--;) {
				stack.push(child[i]);
			}
		} else {
			if (typeof child === 'boolean') child = null;

			if (simple = typeof nodeName !== 'function') {
				if (child == null) child = '';else if (typeof child === 'number') child = String(child);else if (typeof child !== 'string') simple = false;
			}

			if (simple && lastSimple) {
				children[children.length - 1] += child;
			} else if (children === EMPTY_CHILDREN) {
				children = [child];
			} else {
				children.push(child);
			}

			lastSimple = simple;
		}
	}

	var p = new VNode();
	p.nodeName = nodeName;
	p.children = children;
	p.attributes = attributes == null ? undefined : attributes;
	p.key = attributes == null ? undefined : attributes.key;

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode !== undefined) options.vnode(p);

	return p;
}

/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
function extend(obj, props) {
  for (var i in props) {
    obj[i] = props[i];
  }return obj;
}

/** Call a function asynchronously, as soon as possible.
 *	@param {Function} callback
 */
var defer = typeof Promise == 'function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;

// DOM properties that should NOT have "px" added when numeric
var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

/** Managed queue of dirty components to be re-rendered */

var items = [];

function enqueueRender(component) {
	if (!component._dirty && (component._dirty = true) && items.push(component) == 1) {
		(options.debounceRendering || defer)(rerender);
	}
}

function rerender() {
	var p,
	    list = items;
	items = [];
	while (p = list.pop()) {
		if (p._dirty) renderComponent(p);
	}
}

/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
function isSameNodeType(node, vnode, hydrating) {
	if (typeof vnode === 'string' || typeof vnode === 'number') {
		return node.splitText !== undefined;
	}
	if (typeof vnode.nodeName === 'string') {
		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
	}
	return hydrating || node._componentConstructor === vnode.nodeName;
}

/** Check if an Element has a given normalized name.
*	@param {Element} node
*	@param {String} nodeName
 */
function isNamedNode(node, nodeName) {
	return node.normalizedNodeName === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
}

/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
function getNodeProps(vnode) {
	var props = extend({}, vnode.attributes);
	props.children = vnode.children;

	var defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps !== undefined) {
		for (var i in defaultProps) {
			if (props[i] === undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}

/** Create an element with the given nodeName.
 *	@param {String} nodeName
 *	@param {Boolean} [isSvg=false]	If `true`, creates an element within the SVG namespace.
 *	@returns {Element} node
 */
function createNode(nodeName, isSvg) {
	var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
	node.normalizedNodeName = nodeName;
	return node;
}

/** Remove a child node from its parent if attached.
 *	@param {Element} node		The node to remove
 */
function removeNode(node) {
	var parentNode = node.parentNode;
	if (parentNode) parentNode.removeChild(node);
}

/** Set a named attribute on the given Node, with special behavior for some names and event handlers.
 *	If `value` is `null`, the attribute/handler will be removed.
 *	@param {Element} node	An element to mutate
 *	@param {string} name	The name/key to set, such as an event or attribute name
 *	@param {any} old	The last value that was set for this name/node pair
 *	@param {any} value	An attribute value, such as a function to be used as an event handler
 *	@param {Boolean} isSvg	Are we currently diffing inside an svg?
 *	@private
 */
function setAccessor(node, name, old, value, isSvg) {
	if (name === 'className') name = 'class';

	if (name === 'key') {
		// ignore
	} else if (name === 'ref') {
		if (old) old(null);
		if (value) value(node);
	} else if (name === 'class' && !isSvg) {
		node.className = value || '';
	} else if (name === 'style') {
		if (!value || typeof value === 'string' || typeof old === 'string') {
			node.style.cssText = value || '';
		}
		if (value && typeof value === 'object') {
			if (typeof old !== 'string') {
				for (var i in old) {
					if (!(i in value)) node.style[i] = '';
				}
			}
			for (var i in value) {
				node.style[i] = typeof value[i] === 'number' && IS_NON_DIMENSIONAL.test(i) === false ? value[i] + 'px' : value[i];
			}
		}
	} else if (name === 'dangerouslySetInnerHTML') {
		if (value) node.innerHTML = value.__html || '';
	} else if (name[0] == 'o' && name[1] == 'n') {
		var useCapture = name !== (name = name.replace(/Capture$/, ''));
		name = name.toLowerCase().substring(2);
		if (value) {
			if (!old) node.addEventListener(name, eventProxy, useCapture);
		} else {
			node.removeEventListener(name, eventProxy, useCapture);
		}
		(node._listeners || (node._listeners = {}))[name] = value;
	} else if (name !== 'list' && name !== 'type' && !isSvg && name in node) {
		setProperty(node, name, value == null ? '' : value);
		if (value == null || value === false) node.removeAttribute(name);
	} else {
		var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
		if (value == null || value === false) {
			if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());else node.removeAttribute(name);
		} else if (typeof value !== 'function') {
			if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);else node.setAttribute(name, value);
		}
	}
}

/** Attempt to set a DOM property to the given value.
 *	IE & FF throw for certain property-value combinations.
 */
function setProperty(node, name, value) {
	try {
		node[name] = value;
	} catch (e) {}
}

/** Proxy an event to hooked event handlers
 *	@private
 */
function eventProxy(e) {
	return this._listeners[e.type](options.event && options.event(e) || e);
}

/** Queue of components that have been mounted and are awaiting componentDidMount */
var mounts = [];

/** Diff recursion count, used to track the end of the diff cycle. */
var diffLevel = 0;

/** Global flag indicating if the diff is currently within an SVG */
var isSvgMode = false;

/** Global flag indicating if the diff is performing hydration */
var hydrating = false;

/** Invoke queued componentDidMount lifecycle methods */
function flushMounts() {
	var c;
	while (c = mounts.pop()) {
		if (options.afterMount) options.afterMount(c);
		if (c.componentDidMount) c.componentDidMount();
	}
}

/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
function diff(dom, vnode, context, mountAll, parent, componentRoot) {
	// diffLevel having been 0 here indicates initial entry into the diff (not a subdiff)
	if (!diffLevel++) {
		// when first starting the diff, check if we're diffing an SVG or within an SVG
		isSvgMode = parent != null && parent.ownerSVGElement !== undefined;

		// hydration is indicated by the existing element to be diffed not having a prop cache
		hydrating = dom != null && !('__preactattr_' in dom);
	}

	var ret = idiff(dom, vnode, context, mountAll, componentRoot);

	// append the element if its a new parent
	if (parent && ret.parentNode !== parent) parent.appendChild(ret);

	// diffLevel being reduced to 0 means we're exiting the diff
	if (! --diffLevel) {
		hydrating = false;
		// invoke queued componentDidMount lifecycle methods
		if (!componentRoot) flushMounts();
	}

	return ret;
}

/** Internals of `diff()`, separated to allow bypassing diffLevel / mount flushing. */
function idiff(dom, vnode, context, mountAll, componentRoot) {
	var out = dom,
	    prevSvgMode = isSvgMode;

	// empty values (null, undefined, booleans) render as empty Text nodes
	if (vnode == null || typeof vnode === 'boolean') vnode = '';

	// Fast case: Strings & Numbers create/update Text nodes.
	if (typeof vnode === 'string' || typeof vnode === 'number') {

		// update if it's already a Text node:
		if (dom && dom.splitText !== undefined && dom.parentNode && (!dom._component || componentRoot)) {
			/* istanbul ignore if */ /* Browser quirk that can't be covered: https://github.com/developit/preact/commit/fd4f21f5c45dfd75151bd27b4c217d8003aa5eb9 */
			if (dom.nodeValue != vnode) {
				dom.nodeValue = vnode;
			}
		} else {
			// it wasn't a Text node: replace it with one and recycle the old Element
			out = document.createTextNode(vnode);
			if (dom) {
				if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
				recollectNodeTree(dom, true);
			}
		}

		out['__preactattr_'] = true;

		return out;
	}

	// If the VNode represents a Component, perform a component diff:
	var vnodeName = vnode.nodeName;
	if (typeof vnodeName === 'function') {
		return buildComponentFromVNode(dom, vnode, context, mountAll);
	}

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvgMode = vnodeName === 'svg' ? true : vnodeName === 'foreignObject' ? false : isSvgMode;

	// If there's no existing element or it's the wrong type, create a new one:
	vnodeName = String(vnodeName);
	if (!dom || !isNamedNode(dom, vnodeName)) {
		out = createNode(vnodeName, isSvgMode);

		if (dom) {
			// move children into the replacement node
			while (dom.firstChild) {
				out.appendChild(dom.firstChild);
			} // if the previous Element was mounted into the DOM, replace it inline
			if (dom.parentNode) dom.parentNode.replaceChild(out, dom);

			// recycle the old element (skips non-Element node types)
			recollectNodeTree(dom, true);
		}
	}

	var fc = out.firstChild,
	    props = out['__preactattr_'],
	    vchildren = vnode.children;

	if (props == null) {
		props = out['__preactattr_'] = {};
		for (var a = out.attributes, i = a.length; i--;) {
			props[a[i].name] = a[i].value;
		}
	}

	// Optimization: fast-path for elements containing a single TextNode:
	if (!hydrating && vchildren && vchildren.length === 1 && typeof vchildren[0] === 'string' && fc != null && fc.splitText !== undefined && fc.nextSibling == null) {
		if (fc.nodeValue != vchildren[0]) {
			fc.nodeValue = vchildren[0];
		}
	}
	// otherwise, if there are existing or new children, diff them:
	else if (vchildren && vchildren.length || fc != null) {
			innerDiffNode(out, vchildren, context, mountAll, hydrating || props.dangerouslySetInnerHTML != null);
		}

	// Apply attributes/props from VNode to the DOM Element:
	diffAttributes(out, vnode.attributes, props);

	// restore previous SVG mode: (in case we're exiting an SVG namespace)
	isSvgMode = prevSvgMode;

	return out;
}

/** Apply child and attribute changes between a VNode and a DOM Node to the DOM.
 *	@param {Element} dom			Element whose children should be compared & mutated
 *	@param {Array} vchildren		Array of VNodes to compare to `dom.childNodes`
 *	@param {Object} context			Implicitly descendant context object (from most recent `getChildContext()`)
 *	@param {Boolean} mountAll
 *	@param {Boolean} isHydrating	If `true`, consumes externally created elements similar to hydration
 */
function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
	var originalChildren = dom.childNodes,
	    children = [],
	    keyed = {},
	    keyedLen = 0,
	    min = 0,
	    len = originalChildren.length,
	    childrenLen = 0,
	    vlen = vchildren ? vchildren.length : 0,
	    j,
	    c,
	    f,
	    vchild,
	    child;

	// Build up a map of keyed children and an Array of unkeyed children:
	if (len !== 0) {
		for (var i = 0; i < len; i++) {
			var _child = originalChildren[i],
			    props = _child['__preactattr_'],
			    key = vlen && props ? _child._component ? _child._component.__key : props.key : null;
			if (key != null) {
				keyedLen++;
				keyed[key] = _child;
			} else if (props || (_child.splitText !== undefined ? isHydrating ? _child.nodeValue.trim() : true : isHydrating)) {
				children[childrenLen++] = _child;
			}
		}
	}

	if (vlen !== 0) {
		for (var i = 0; i < vlen; i++) {
			vchild = vchildren[i];
			child = null;

			// attempt to find a node based on key matching
			var key = vchild.key;
			if (key != null) {
				if (keyedLen && keyed[key] !== undefined) {
					child = keyed[key];
					keyed[key] = undefined;
					keyedLen--;
				}
			}
			// attempt to pluck a node of the same type from the existing children
			else if (!child && min < childrenLen) {
					for (j = min; j < childrenLen; j++) {
						if (children[j] !== undefined && isSameNodeType(c = children[j], vchild, isHydrating)) {
							child = c;
							children[j] = undefined;
							if (j === childrenLen - 1) childrenLen--;
							if (j === min) min++;
							break;
						}
					}
				}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = idiff(child, vchild, context, mountAll);

			f = originalChildren[i];
			if (child && child !== dom && child !== f) {
				if (f == null) {
					dom.appendChild(child);
				} else if (child === f.nextSibling) {
					removeNode(f);
				} else {
					dom.insertBefore(child, f);
				}
			}
		}
	}

	// remove unused keyed children:
	if (keyedLen) {
		for (var i in keyed) {
			if (keyed[i] !== undefined) recollectNodeTree(keyed[i], false);
		}
	}

	// remove orphaned unkeyed children:
	while (min <= childrenLen) {
		if ((child = children[childrenLen--]) !== undefined) recollectNodeTree(child, false);
	}
}

/** Recursively recycle (or just unmount) a node and its descendants.
 *	@param {Node} node						DOM node to start unmount/removal from
 *	@param {Boolean} [unmountOnly=false]	If `true`, only triggers unmount lifecycle, skips removal
 */
function recollectNodeTree(node, unmountOnly) {
	var component = node._component;
	if (component) {
		// if node is owned by a Component, unmount that component (ends up recursing back here)
		unmountComponent(component);
	} else {
		// If the node's VNode had a ref function, invoke it with null here.
		// (this is part of the React spec, and smart for unsetting references)
		if (node['__preactattr_'] != null && node['__preactattr_'].ref) node['__preactattr_'].ref(null);

		if (unmountOnly === false || node['__preactattr_'] == null) {
			removeNode(node);
		}

		removeChildren(node);
	}
}

/** Recollect/unmount all children.
 *	- we use .lastChild here because it causes less reflow than .firstChild
 *	- it's also cheaper than accessing the .childNodes Live NodeList
 */
function removeChildren(node) {
	node = node.lastChild;
	while (node) {
		var next = node.previousSibling;
		recollectNodeTree(node, true);
		node = next;
	}
}

/** Apply differences in attributes from a VNode to the given DOM Element.
 *	@param {Element} dom		Element with attributes to diff `attrs` against
 *	@param {Object} attrs		The desired end-state key-value attribute pairs
 *	@param {Object} old			Current/previous attributes (from previous VNode or element's prop cache)
 */
function diffAttributes(dom, attrs, old) {
	var name;

	// remove attributes no longer present on the vnode by setting them to undefined
	for (name in old) {
		if (!(attrs && attrs[name] != null) && old[name] != null) {
			setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
		}
	}

	// add new & update changed attributes
	for (name in attrs) {
		if (name !== 'children' && name !== 'innerHTML' && (!(name in old) || attrs[name] !== (name === 'value' || name === 'checked' ? dom[name] : old[name]))) {
			setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
		}
	}
}

/** Retains a pool of Components for re-use, keyed on component name.
 *	Note: since component names are not unique or even necessarily available, these are primarily a form of sharding.
 *	@private
 */
var components = {};

/** Reclaim a component for later re-use by the recycler. */
function collectComponent(component) {
	var name = component.constructor.name;
	(components[name] || (components[name] = [])).push(component);
}

/** Create a component. Normalizes differences between PFC's and classful Components. */
function createComponent(Ctor, props, context) {
	var list = components[Ctor.name],
	    inst;

	if (Ctor.prototype && Ctor.prototype.render) {
		inst = new Ctor(props, context);
		Component.call(inst, props, context);
	} else {
		inst = new Component(props, context);
		inst.constructor = Ctor;
		inst.render = doRender;
	}

	if (list) {
		for (var i = list.length; i--;) {
			if (list[i].constructor === Ctor) {
				inst.nextBase = list[i].nextBase;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}

/** Set a component's `props` (generally derived from JSX attributes).
 *	@param {Object} props
 *	@param {Object} [opts]
 *	@param {boolean} [opts.renderSync=false]	If `true` and {@link options.syncComponentUpdates} is `true`, triggers synchronous rendering.
 *	@param {boolean} [opts.render=true]			If `false`, no render will be triggered.
 */
function setComponentProps(component, props, opts, context, mountAll) {
	if (component._disable) return;
	component._disable = true;

	if (component.__ref = props.ref) delete props.ref;
	if (component.__key = props.key) delete props.key;

	if (!component.base || mountAll) {
		if (component.componentWillMount) component.componentWillMount();
	} else if (component.componentWillReceiveProps) {
		component.componentWillReceiveProps(props, context);
	}

	if (context && context !== component.context) {
		if (!component.prevContext) component.prevContext = component.context;
		component.context = context;
	}

	if (!component.prevProps) component.prevProps = component.props;
	component.props = props;

	component._disable = false;

	if (opts !== 0) {
		if (opts === 1 || options.syncComponentUpdates !== false || !component.base) {
			renderComponent(component, 1, mountAll);
		} else {
			enqueueRender(component);
		}
	}

	if (component.__ref) component.__ref(component);
}

/** Render a Component, triggering necessary lifecycle events and taking High-Order Components into account.
 *	@param {Component} component
 *	@param {Object} [opts]
 *	@param {boolean} [opts.build=false]		If `true`, component will build and store a DOM node if not already associated with one.
 *	@private
 */
function renderComponent(component, opts, mountAll, isChild) {
	if (component._disable) return;

	var props = component.props,
	    state = component.state,
	    context = component.context,
	    previousProps = component.prevProps || props,
	    previousState = component.prevState || state,
	    previousContext = component.prevContext || context,
	    isUpdate = component.base,
	    nextBase = component.nextBase,
	    initialBase = isUpdate || nextBase,
	    initialChildComponent = component._component,
	    skip = false,
	    rendered,
	    inst,
	    cbase;

	// if updating
	if (isUpdate) {
		component.props = previousProps;
		component.state = previousState;
		component.context = previousContext;
		if (opts !== 2 && component.shouldComponentUpdate && component.shouldComponentUpdate(props, state, context) === false) {
			skip = true;
		} else if (component.componentWillUpdate) {
			component.componentWillUpdate(props, state, context);
		}
		component.props = props;
		component.state = state;
		component.context = context;
	}

	component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
	component._dirty = false;

	if (!skip) {
		rendered = component.render(props, state, context);

		// context to pass to the child, can be updated via (grand-)parent component
		if (component.getChildContext) {
			context = extend(extend({}, context), component.getChildContext());
		}

		var childComponent = rendered && rendered.nodeName,
		    toUnmount,
		    base;

		if (typeof childComponent === 'function') {
			// set up high order component link

			var childProps = getNodeProps(rendered);
			inst = initialChildComponent;

			if (inst && inst.constructor === childComponent && childProps.key == inst.__key) {
				setComponentProps(inst, childProps, 1, context, false);
			} else {
				toUnmount = inst;

				component._component = inst = createComponent(childComponent, childProps, context);
				inst.nextBase = inst.nextBase || nextBase;
				inst._parentComponent = component;
				setComponentProps(inst, childProps, 0, context, false);
				renderComponent(inst, 1, mountAll, true);
			}

			base = inst.base;
		} else {
			cbase = initialBase;

			// destroy high order component link
			toUnmount = initialChildComponent;
			if (toUnmount) {
				cbase = component._component = null;
			}

			if (initialBase || opts === 1) {
				if (cbase) cbase._component = null;
				base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, true);
			}
		}

		if (initialBase && base !== initialBase && inst !== initialChildComponent) {
			var baseParent = initialBase.parentNode;
			if (baseParent && base !== baseParent) {
				baseParent.replaceChild(base, initialBase);

				if (!toUnmount) {
					initialBase._component = null;
					recollectNodeTree(initialBase, false);
				}
			}
		}

		if (toUnmount) {
			unmountComponent(toUnmount);
		}

		component.base = base;
		if (base && !isChild) {
			var componentRef = component,
			    t = component;
			while (t = t._parentComponent) {
				(componentRef = t).base = base;
			}
			base._component = componentRef;
			base._componentConstructor = componentRef.constructor;
		}
	}

	if (!isUpdate || mountAll) {
		mounts.unshift(component);
	} else if (!skip) {
		// Ensure that pending componentDidMount() hooks of child components
		// are called before the componentDidUpdate() hook in the parent.
		// Note: disabled as it causes duplicate hooks, see https://github.com/developit/preact/issues/750
		// flushMounts();

		if (component.componentDidUpdate) {
			component.componentDidUpdate(previousProps, previousState, previousContext);
		}
		if (options.afterUpdate) options.afterUpdate(component);
	}

	if (component._renderCallbacks != null) {
		while (component._renderCallbacks.length) {
			component._renderCallbacks.pop().call(component);
		}
	}

	if (!diffLevel && !isChild) flushMounts();
}

/** Apply the Component referenced by a VNode to the DOM.
 *	@param {Element} dom	The DOM node to mutate
 *	@param {VNode} vnode	A Component-referencing VNode
 *	@returns {Element} dom	The created/mutated element
 *	@private
 */
function buildComponentFromVNode(dom, vnode, context, mountAll) {
	var c = dom && dom._component,
	    originalComponent = c,
	    oldDom = dom,
	    isDirectOwner = c && dom._componentConstructor === vnode.nodeName,
	    isOwner = isDirectOwner,
	    props = getNodeProps(vnode);
	while (c && !isOwner && (c = c._parentComponent)) {
		isOwner = c.constructor === vnode.nodeName;
	}

	if (c && isOwner && (!mountAll || c._component)) {
		setComponentProps(c, props, 3, context, mountAll);
		dom = c.base;
	} else {
		if (originalComponent && !isDirectOwner) {
			unmountComponent(originalComponent);
			dom = oldDom = null;
		}

		c = createComponent(vnode.nodeName, props, context);
		if (dom && !c.nextBase) {
			c.nextBase = dom;
			// passing dom/oldDom as nextBase will recycle it if unused, so bypass recycling on L229:
			oldDom = null;
		}
		setComponentProps(c, props, 1, context, mountAll);
		dom = c.base;

		if (oldDom && dom !== oldDom) {
			oldDom._component = null;
			recollectNodeTree(oldDom, false);
		}
	}

	return dom;
}

/** Remove a component from the DOM and recycle it.
 *	@param {Component} component	The Component instance to unmount
 *	@private
 */
function unmountComponent(component) {
	if (options.beforeUnmount) options.beforeUnmount(component);

	var base = component.base;

	component._disable = true;

	if (component.componentWillUnmount) component.componentWillUnmount();

	component.base = null;

	// recursively tear down & recollect high-order component children:
	var inner = component._component;
	if (inner) {
		unmountComponent(inner);
	} else if (base) {
		if (base['__preactattr_'] && base['__preactattr_'].ref) base['__preactattr_'].ref(null);

		component.nextBase = base;

		removeNode(base);
		collectComponent(component);

		removeChildren(base);
	}

	if (component.__ref) component.__ref(null);
}

/** Base Component class.
 *	Provides `setState()` and `forceUpdate()`, which trigger rendering.
 *	@public
 *
 *	@example
 *	class MyFoo extends Component {
 *		render(props, state) {
 *			return <div />;
 *		}
 *	}
 */
function Component(props, context) {
	this._dirty = true;

	/** @public
  *	@type {object}
  */
	this.context = context;

	/** @public
  *	@type {object}
  */
	this.props = props;

	/** @public
  *	@type {object}
  */
	this.state = this.state || {};
}

extend(Component.prototype, {

	/** Returns a `boolean` indicating if the component should re-render when receiving the given `props` and `state`.
  *	@param {object} nextProps
  *	@param {object} nextState
  *	@param {object} nextContext
  *	@returns {Boolean} should the component re-render
  *	@name shouldComponentUpdate
  *	@function
  */

	/** Update component state by copying properties from `state` to `this.state`.
  *	@param {object} state		A hash of state properties to update with new values
  *	@param {function} callback	A function to be called once component state is updated
  */
	setState: function setState(state, callback) {
		var s = this.state;
		if (!this.prevState) this.prevState = extend({}, s);
		extend(s, typeof state === 'function' ? state(s, this.props) : state);
		if (callback) (this._renderCallbacks = this._renderCallbacks || []).push(callback);
		enqueueRender(this);
	},


	/** Immediately perform a synchronous re-render of the component.
  *	@param {function} callback		A function to be called after component is re-rendered.
  *	@private
  */
	forceUpdate: function forceUpdate(callback) {
		if (callback) (this._renderCallbacks = this._renderCallbacks || []).push(callback);
		renderComponent(this, 2);
	},


	/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
  *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
  *	@param {object} props		Props (eg: JSX attributes) received from parent element/component
  *	@param {object} state		The component's current state
  *	@param {object} context		Context object (if a parent component has provided context)
  *	@returns VNode
  */
	render: function render() {}
});

/** Render JSX into a `parent` Element.
 *	@param {VNode} vnode		A (JSX) VNode to render
 *	@param {Element} parent		DOM element to render into
 *	@param {Element} [merge]	Attempt to re-use an existing DOM tree rooted at `merge`
 *	@public
 *
 *	@example
 *	// render a div into <body>:
 *	render(<div id="hello">hello!</div>, document.body);
 *
 *	@example
 *	// render a "Thing" component into #foo:
 *	const Thing = ({ name }) => <span>{ name }</span>;
 *	render(<Thing name="one" />, document.querySelector('#foo'));
 */
function render(vnode, parent, merge) {
  return diff(merge, vnode, {}, false, parent, false);
}

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var getDynamicStyles = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Extracts a styles object with only props that contain function values.
 */
exports['default'] = function (styles) {
  // eslint-disable-next-line no-shadow
  function extract(styles) {
    var to = null;

    for (var key in styles) {
      var value = styles[key];
      var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

      if (type === 'function') {
        if (!to) to = {};
        to[key] = value;
      } else if (type === 'object' && value !== null && !Array.isArray(value)) {
        var extracted = extract(value);
        if (extracted) {
          if (!to) to = {};
          to[key] = extracted;
        }
      }
    }

    return to;
  }

  return extract(styles);
};
});

var SheetsRegistry_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Sheets registry to access them all at one place.
 */
var SheetsRegistry = function () {
  function SheetsRegistry() {
    _classCallCheck(this, SheetsRegistry);

    this.registry = [];
  }

  _createClass(SheetsRegistry, [{
    key: 'add',


    /**
     * Register a Style Sheet.
     */
    value: function add(sheet) {
      var registry = this.registry;
      var index = sheet.options.index;


      if (registry.indexOf(sheet) !== -1) return;

      if (registry.length === 0 || index >= this.index) {
        registry.push(sheet);
        return;
      }

      // Find a position.
      for (var i = 0; i < registry.length; i++) {
        if (registry[i].options.index > index) {
          registry.splice(i, 0, sheet);
          return;
        }
      }
    }

    /**
     * Reset the registry.
     */

  }, {
    key: 'reset',
    value: function reset() {
      this.registry = [];
    }

    /**
     * Remove a Style Sheet.
     */

  }, {
    key: 'remove',
    value: function remove(sheet) {
      var index = this.registry.indexOf(sheet);
      this.registry.splice(index, 1);
    }

    /**
     * Convert all attached sheets to a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString(options) {
      return this.registry.filter(function (sheet) {
        return sheet.attached;
      }).map(function (sheet) {
        return sheet.toString(options);
      }).join('\n');
    }
  }, {
    key: 'index',


    /**
     * Current highest index number.
     */
    get: function get() {
      return this.registry.length === 0 ? 0 : this.registry[this.registry.length - 1].options.index;
    }
  }]);

  return SheetsRegistry;
}();

exports['default'] = SheetsRegistry;
});

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}






 // empty string to avoid regexp issues


















// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = global$1.performance || {};
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = function() {};

{
  warning = function(condition, format, args) {
    var len = arguments.length;
    args = new Array(len > 2 ? len - 2 : 0);
    for (var key = 2; key < len; key++) {
      args[key - 2] = arguments[key];
    }
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || (/^[s\W]*$/).test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' +
        format.replace(/%s/g, function() {
          return args[argIndex++];
        });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

var browser = warning;

var SheetsManager_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _warning2 = _interopRequireDefault(browser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * SheetsManager is like a WeakMap which is designed to count StyleSheet
 * instances and attach/detach automatically.
 */
var SheetsManager = function () {
  function SheetsManager() {
    _classCallCheck(this, SheetsManager);

    this.sheets = [];
    this.refs = [];
    this.keys = [];
  }

  _createClass(SheetsManager, [{
    key: 'get',
    value: function get(key) {
      var index = this.keys.indexOf(key);
      return this.sheets[index];
    }
  }, {
    key: 'add',
    value: function add(key, sheet) {
      var sheets = this.sheets,
          refs = this.refs,
          keys = this.keys;

      var index = sheets.indexOf(sheet);

      if (index !== -1) return index;

      sheets.push(sheet);
      refs.push(0);
      keys.push(key);

      return sheets.length - 1;
    }
  }, {
    key: 'manage',
    value: function manage(key) {
      var index = this.keys.indexOf(key);
      var sheet = this.sheets[index];
      if (this.refs[index] === 0) sheet.attach();
      this.refs[index]++;
      if (!this.keys[index]) this.keys.splice(index, 0, key);
      return sheet;
    }
  }, {
    key: 'unmanage',
    value: function unmanage(key) {
      var index = this.keys.indexOf(key);
      if (index === -1) {
        // eslint-ignore-next-line no-console
        (0, _warning2['default'])('SheetsManager: can\'t find sheet to unmanage');
        return;
      }
      if (this.refs[index] > 0) {
        this.refs[index]--;
        if (this.refs[index] === 0) this.sheets[index].detach();
      }
    }
  }]);

  return SheetsManager;
}();

exports['default'] = SheetsManager;
});

var toCssValue_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = toCssValue;
var joinWithSpace = function joinWithSpace(value) {
  return value.join(' ');
};

/**
 * Converts array values to string.
 *
 * `margin: [['5px', '10px']]` > `margin: 5px 10px;`
 * `border: ['1px', '2px']` > `border: 1px, 2px;`
 */
function toCssValue(value) {
  if (!Array.isArray(value)) return value;

  // Support space separated values.
  if (Array.isArray(value[0])) {
    return toCssValue(value.map(joinWithSpace));
  }

  return value.join(', ');
}
});

var toCss_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = toCss;



var _toCssValue2 = _interopRequireDefault(toCssValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Indent a string.
 * http://jsperf.com/array-join-vs-for
 */
function indentStr(str, indent) {
  var result = '';
  for (var index = 0; index < indent; index++) {
    result += '  ';
  }return result + str;
}

/**
 * Converts a Rule to CSS string.
 */

function toCss(selector, style) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var result = '';

  if (!style) return result;

  var _options$indent = options.indent,
      indent = _options$indent === undefined ? 0 : _options$indent;
  var fallbacks = style.fallbacks;


  indent++;

  // Apply fallbacks first.
  if (fallbacks) {
    // Array syntax {fallbacks: [{prop: value}]}
    if (Array.isArray(fallbacks)) {
      for (var index = 0; index < fallbacks.length; index++) {
        var fallback = fallbacks[index];
        for (var prop in fallback) {
          var value = fallback[prop];
          if (value != null) {
            result += '\n' + indentStr(prop + ': ' + (0, _toCssValue2['default'])(value) + ';', indent);
          }
        }
      }
    }
    // Object syntax {fallbacks: {prop: value}}
    else {
        for (var _prop in fallbacks) {
          var _value = fallbacks[_prop];
          if (_value != null) {
            result += '\n' + indentStr(_prop + ': ' + (0, _toCssValue2['default'])(_value) + ';', indent);
          }
        }
      }
  }

  var hasFunctionValue = false;

  for (var _prop2 in style) {
    var _value2 = style[_prop2];
    if (typeof _value2 === 'function') {
      _value2 = style['$' + _prop2];
      hasFunctionValue = true;
    }
    if (_value2 != null && _prop2 !== 'fallbacks') {
      result += '\n' + indentStr(_prop2 + ': ' + (0, _toCssValue2['default'])(_value2) + ';', indent);
    }
  }

  if (!result && !hasFunctionValue) return result;

  indent--;
  result = indentStr(selector + ' {' + result + '\n', indent) + indentStr('}', indent);

  return result;
}
});

var StyleRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _toCss2 = _interopRequireDefault(toCss_1);



var _toCssValue2 = _interopRequireDefault(toCssValue_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleRule = function () {
  function StyleRule(key, style, options) {
    _classCallCheck(this, StyleRule);

    this.type = 'style';
    this.isProcessed = false;
    var generateClassName = options.generateClassName,
        sheet = options.sheet,
        Renderer = options.Renderer,
        selector = options.selector;

    this.key = key;
    this.options = options;
    this.style = style;
    this.selectorText = selector || '.' + generateClassName(this, sheet);
    this.renderer = sheet ? sheet.renderer : new Renderer();
  }

  /**
   * Set selector string.
   * TODO rewrite this #419
   * Attention: use this with caution. Most browsers didn't implement
   * selectorText setter, so this may result in rerendering of entire Style Sheet.
   */


  _createClass(StyleRule, [{
    key: 'prop',


    /**
     * Get or set a style property.
     */
    value: function prop(name, nextValue) {
      var $name = typeof this.style[name] === 'function' ? '$' + name : name;
      var currValue = this.style[$name];

      // Its a setter.
      if (nextValue != null) {
        // Don't do anything if the value has not changed.
        if (currValue !== nextValue) {
          nextValue = this.options.jss.plugins.onChangeValue(nextValue, name, this);
          Object.defineProperty(this.style, $name, {
            value: nextValue,
            writable: true
          });
          // Defined if StyleSheet option `link` is true.
          if (this.renderable) this.renderer.setStyle(this.renderable, name, nextValue);
        }
        return this;
      }

      // Its a getter, read the value from the DOM if its not cached.
      if (this.renderable && currValue == null) {
        // Cache the value after we have got it from the DOM first time.
        Object.defineProperty(this.style, $name, {
          value: this.renderer.getStyle(this.renderable, name),
          writable: true
        });
      }

      return this.style[$name];
    }

    /**
     * Apply rule to an element inline.
     */

  }, {
    key: 'applyTo',
    value: function applyTo(renderable) {
      var json = this.toJSON();
      for (var prop in json) {
        this.renderer.setStyle(renderable, prop, json[prop]);
      }return this;
    }

    /**
     * Returns JSON representation of the rule.
     * Fallbacks are not supported.
     * Useful for inline styles.
     */

  }, {
    key: 'toJSON',
    value: function toJSON() {
      var json = {};
      for (var prop in this.style) {
        var value = this.style[prop];
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
        if (type === 'function') json[prop] = this.style['$' + prop];else if (type !== 'object') json[prop] = value;else if (Array.isArray(value)) json[prop] = (0, _toCssValue2['default'])(value);
      }
      return json;
    }

    /**
     * Generates a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString(options) {
      return (0, _toCss2['default'])(this.selector, this.style, options);
    }
  }, {
    key: 'selector',
    set: function set(selector) {
      var sheet = this.options.sheet;

      // After we modify a selector, ref by old selector needs to be removed.

      if (sheet) sheet.rules.unregister(this);

      this.selectorText = selector;

      if (!this.renderable) {
        // Register the rule with new selector.
        if (sheet) sheet.rules.register(this);
        return;
      }

      var changed = this.renderer.setSelector(this.renderable, selector);

      if (changed && sheet) {
        sheet.rules.register(this);
        return;
      }

      // If selector setter is not implemented, rerender the sheet.
      // We need to delete renderable from the rule, because when sheet.deploy()
      // calls rule.toString, it will get the old selector.
      delete this.renderable;
      if (sheet) {
        sheet.rules.register(this);
        sheet.deploy().link();
      }
    }

    /**
     * Get selector string.
     */
    ,
    get: function get() {
      if (this.renderable) {
        return this.renderer.getSelector(this.renderable);
      }

      return this.selectorText;
    }
  }]);

  return StyleRule;
}();

exports['default'] = StyleRule;
});

var cloneStyle_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = cloneStyle;
var isArray = Array.isArray;
function cloneStyle(style) {
  // Support empty values in case user ends up with them by accident.
  if (style == null) return style;

  // Support string value for SimpleRule.
  var typeOfStyle = typeof style === 'undefined' ? 'undefined' : _typeof(style);
  if (typeOfStyle === 'string' || typeOfStyle === 'number') return style;

  // Support array for FontFaceRule.
  if (isArray(style)) return style.map(cloneStyle);

  var newStyle = {};
  for (var name in style) {
    var value = style[name];
    if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
      newStyle[name] = cloneStyle(value);
      continue;
    }
    newStyle[name] = value;
  }

  return newStyle;
}
});

var createRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = createRule;



var _warning2 = _interopRequireDefault(browser);



var _StyleRule2 = _interopRequireDefault(StyleRule_1);



var _cloneStyle2 = _interopRequireDefault(cloneStyle_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Create a rule instance.
 */
function createRule() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unnamed';
  var decl = arguments[1];
  var options = arguments[2];
  var jss = options.jss;

  var declCopy = (0, _cloneStyle2['default'])(decl);

  var rule = jss.plugins.onCreateRule(name, declCopy, options);
  if (rule) return rule;

  // It is an at-rule and it has no instance.
  if (name[0] === '@') {
    (0, _warning2['default'])(false, '[JSS] Unknown at-rule %s', name);
  }

  return new _StyleRule2['default'](name, declCopy, options);
}
});

var updateRule = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports['default'] = function (rule, data, RuleList) {
  if (rule.type === 'style') {
    for (var prop in rule.style) {
      var value = rule.style[prop];
      if (typeof value === 'function') {
        rule.prop(prop, value(data));
      }
    }
  } else if (rule.rules instanceof RuleList) {
    rule.rules.update(data);
  }
};
});

var linkRule_1 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = linkRule;
/**
 * Link rule with CSSStyleRule and nested rules with corresponding nested cssRules if both exists.
 */
function linkRule(rule, cssRule) {
  rule.renderable = cssRule;
  if (rule.rules && cssRule.cssRules) rule.rules.link(cssRule.cssRules);
}
});

var RuleList_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _createRule2$$1 = _interopRequireDefault(createRule_1);



var _updateRule2 = _interopRequireDefault(updateRule);



var _linkRule2 = _interopRequireDefault(linkRule_1);



var _StyleRule2 = _interopRequireDefault(StyleRule_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Contains rules objects and allows adding/removing etc.
 * Is used for e.g. by `StyleSheet` or `ConditionalRule`.
 */
var RuleList = function () {

  // Original styles object.
  function RuleList(options) {
    _classCallCheck(this, RuleList);

    this.map = {};
    this.raw = {};
    this.index = [];

    this.options = options;
    this.classes = options.classes;
  }

  /**
   * Create and register rule.
   *
   * Will not render after Style Sheet was rendered the first time.
   */


  // Used to ensure correct rules order.

  // Rules registry for access by .get() method.
  // It contains the same rule registered by name and by selector.


  _createClass(RuleList, [{
    key: 'add',
    value: function add(name, decl, options) {
      var _options = this.options,
          parent = _options.parent,
          sheet = _options.sheet,
          jss = _options.jss,
          Renderer = _options.Renderer,
          generateClassName = _options.generateClassName;


      options = _extends({
        classes: this.classes,
        parent: parent,
        sheet: sheet,
        jss: jss,
        Renderer: Renderer,
        generateClassName: generateClassName
      }, options);

      if (!options.selector && this.classes[name]) options.selector = '.' + this.classes[name];

      this.raw[name] = decl;

      var rule = (0, _createRule2$$1['default'])(name, decl, options);
      this.register(rule);

      var index = options.index === undefined ? this.index.length : options.index;
      this.index.splice(index, 0, rule);

      return rule;
    }

    /**
     * Get a rule.
     */

  }, {
    key: 'get',
    value: function get(name) {
      return this.map[name];
    }

    /**
     * Delete a rule.
     */

  }, {
    key: 'remove',
    value: function remove(rule) {
      this.unregister(rule);
      this.index.splice(this.indexOf(rule), 1);
    }

    /**
     * Get index of a rule.
     */

  }, {
    key: 'indexOf',
    value: function indexOf(rule) {
      return this.index.indexOf(rule);
    }

    /**
     * Run `onProcessRule()` plugins on every rule.
     */

  }, {
    key: 'process',
    value: function process() {
      var plugins = this.options.jss.plugins;
      // We need to clone array because if we modify the index somewhere else during a loop
      // we end up with very hard-to-track-down side effects.

      this.index.slice(0).forEach(plugins.onProcessRule, plugins);
    }

    /**
     * Register a rule in `.map` and `.classes` maps.
     */

  }, {
    key: 'register',
    value: function register(rule) {
      this.map[rule.key] = rule;
      if (rule instanceof _StyleRule2['default']) {
        this.map[rule.selector] = rule;
        this.classes[rule.key] = rule.selector.substr(1);
      }
    }

    /**
     * Unregister a rule.
     */

  }, {
    key: 'unregister',
    value: function unregister(rule) {
      delete this.map[rule.key];
      delete this.classes[rule.key];
      if (rule instanceof _StyleRule2['default']) delete this.map[rule.selector];
    }

    /**
     * Update the function values with a new data.
     */

  }, {
    key: 'update',
    value: function update(name, data) {
      if (typeof name === 'string') {
        (0, _updateRule2['default'])(this.get(name), data, RuleList);
        return;
      }

      for (var index = 0; index < this.index.length; index++) {
        (0, _updateRule2['default'])(this.index[index], name, RuleList);
      }
    }

    /**
     * Link renderable rules with CSSRuleList.
     */

  }, {
    key: 'link',
    value: function link(cssRules) {
      for (var i = 0; i < cssRules.length; i++) {
        var cssRule = cssRules[i];
        var rule = this.get(this.options.sheet.renderer.getSelector(cssRule));
        if (rule) (0, _linkRule2['default'])(rule, cssRule);
      }
    }

    /**
     * Convert rules to a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString(options) {
      var str = '';

      for (var index = 0; index < this.index.length; index++) {
        var rule = this.index[index];
        var css = rule.toString(options);

        // No need to render an empty rule.
        if (!css) continue;

        if (str) str += '\n';
        str += css;
      }

      return str;
    }
  }]);

  return RuleList;
}();

exports['default'] = RuleList;
});

var sheets = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});



var _SheetsRegistry2 = _interopRequireDefault(SheetsRegistry_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * This is a global sheets registry. Only DomRenderer will add sheets to it.
 * On the server one should use an own SheetsRegistry instance and add the
 * sheets to it, because you need to make sure to create a new registry for
 * each request in order to not leak sheets across requests.
 */
exports['default'] = new _SheetsRegistry2['default']();
});

var StyleSheet_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _linkRule2 = _interopRequireDefault(linkRule_1);



var _RuleList2 = _interopRequireDefault(RuleList_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleSheet = function () {
  function StyleSheet(styles, options) {
    _classCallCheck(this, StyleSheet);

    this.attached = false;
    this.deployed = false;
    this.linked = false;
    this.classes = {};
    this.options = _extends({}, options, {
      sheet: this,
      parent: this,
      classes: this.classes
    });
    this.renderer = new options.Renderer(this);
    this.rules = new _RuleList2['default'](this.options);

    for (var name in styles) {
      this.rules.add(name, styles[name]);
    }

    this.rules.process();
  }

  /**
   * Attach renderable to the render tree.
   */


  _createClass(StyleSheet, [{
    key: 'attach',
    value: function attach() {
      if (this.attached) return this;
      if (!this.deployed) this.deploy();
      this.renderer.attach();
      if (!this.linked && this.options.link) this.link();
      this.attached = true;
      return this;
    }

    /**
     * Remove renderable from render tree.
     */

  }, {
    key: 'detach',
    value: function detach() {
      if (!this.attached) return this;
      this.renderer.detach();
      this.attached = false;
      return this;
    }

    /**
     * Add a rule to the current stylesheet.
     * Will insert a rule also after the stylesheet has been rendered first time.
     */

  }, {
    key: 'addRule',
    value: function addRule(name, decl, options) {
      var queue = this.queue;

      // Plugins can create rules.
      // In order to preserve the right order, we need to queue all `.addRule` calls,
      // which happen after the first `rules.add()` call.

      if (this.attached && !queue) this.queue = [];

      var rule = this.rules.add(name, decl, options);
      this.options.jss.plugins.onProcessRule(rule);

      if (this.attached) {
        if (!this.deployed) return rule;
        // Don't insert rule directly if there is no stringified version yet.
        // It will be inserted all together when .attach is called.
        if (queue) queue.push(rule);else {
          this.insertRule(rule);
          if (this.queue) {
            this.queue.forEach(this.insertRule, this);
            this.queue = undefined;
          }
        }
        return rule;
      }

      // We can't add rules to a detached style node.
      // We will redeploy the sheet once user will attach it.
      this.deployed = false;

      return rule;
    }

    /**
     * Insert rule into the StyleSheet
     */

  }, {
    key: 'insertRule',
    value: function insertRule(rule) {
      var renderable = this.renderer.insertRule(rule);
      if (renderable && this.options.link) (0, _linkRule2['default'])(rule, renderable);
    }

    /**
     * Create and add rules.
     * Will render also after Style Sheet was rendered the first time.
     */

  }, {
    key: 'addRules',
    value: function addRules(styles, options) {
      var added = [];
      for (var name in styles) {
        added.push(this.addRule(name, styles[name], options));
      }
      return added;
    }

    /**
     * Get a rule by name.
     */

  }, {
    key: 'getRule',
    value: function getRule(name) {
      return this.rules.get(name);
    }

    /**
     * Delete a rule by name.
     * Returns `true`: if rule has been deleted from the DOM.
     */

  }, {
    key: 'deleteRule',
    value: function deleteRule(name) {
      var rule = this.rules.get(name);

      if (!rule) return false;

      this.rules.remove(rule);

      if (this.attached && rule.renderable) {
        return this.renderer.deleteRule(rule.renderable);
      }

      return true;
    }

    /**
     * Get index of a rule.
     */

  }, {
    key: 'indexOf',
    value: function indexOf(rule) {
      return this.rules.indexOf(rule);
    }

    /**
     * Deploy pure CSS string to a renderable.
     */

  }, {
    key: 'deploy',
    value: function deploy() {
      this.renderer.deploy();
      this.deployed = true;
      return this;
    }

    /**
     * Link renderable CSS rules from sheet with their corresponding models.
     */

  }, {
    key: 'link',
    value: function link() {
      var cssRules = this.renderer.getRules();

      // Is undefined when VirtualRenderer is used.
      if (cssRules) this.rules.link(cssRules);
      this.linked = true;
      return this;
    }

    /**
     * Update the function values with a new data.
     */

  }, {
    key: 'update',
    value: function update(name, data) {
      this.rules.update(name, data);
      return this;
    }

    /**
     * Convert rules to a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString(options) {
      return this.rules.toString(options);
    }
  }]);

  return StyleSheet;
}();

exports['default'] = StyleSheet;
});

var PluginsRegistry_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _warning2 = _interopRequireDefault(browser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PluginsRegistry = function () {
  function PluginsRegistry() {
    _classCallCheck(this, PluginsRegistry);

    this.hooks = {
      onCreateRule: [],
      onProcessRule: [],
      onProcessStyle: [],
      onProcessSheet: [],
      onChangeValue: []

      /**
       * Call `onCreateRule` hooks and return an object if returned by a hook.
       */
    };
  }

  _createClass(PluginsRegistry, [{
    key: 'onCreateRule',
    value: function onCreateRule(name, decl, options) {
      for (var i = 0; i < this.hooks.onCreateRule.length; i++) {
        var rule = this.hooks.onCreateRule[i](name, decl, options);
        if (rule) return rule;
      }
      return null;
    }

    /**
     * Call `onProcessRule` hooks.
     */

  }, {
    key: 'onProcessRule',
    value: function onProcessRule(rule) {
      if (rule.isProcessed) return;
      var sheet = rule.options.sheet;

      for (var i = 0; i < this.hooks.onProcessRule.length; i++) {
        this.hooks.onProcessRule[i](rule, sheet);
      }

      // $FlowFixMe
      if (rule.style) this.onProcessStyle(rule.style, rule, sheet);

      rule.isProcessed = true;
    }

    /**
     * Call `onProcessStyle` hooks.
     */

  }, {
    key: 'onProcessStyle',
    value: function onProcessStyle(style, rule, sheet) {
      var nextStyle = style;

      for (var i = 0; i < this.hooks.onProcessStyle.length; i++) {
        nextStyle = this.hooks.onProcessStyle[i](nextStyle, rule, sheet);
        // $FlowFixMe
        rule.style = nextStyle;
      }
    }

    /**
     * Call `onProcessSheet` hooks.
     */

  }, {
    key: 'onProcessSheet',
    value: function onProcessSheet(sheet) {
      for (var i = 0; i < this.hooks.onProcessSheet.length; i++) {
        this.hooks.onProcessSheet[i](sheet);
      }
    }

    /**
     * Call `onChangeValue` hooks.
     */

  }, {
    key: 'onChangeValue',
    value: function onChangeValue(value, prop, rule) {
      var processedValue = value;
      for (var i = 0; i < this.hooks.onChangeValue.length; i++) {
        processedValue = this.hooks.onChangeValue[i](processedValue, prop, rule);
      }
      return processedValue;
    }

    /**
     * Register a plugin.
     * If function is passed, it is a shortcut for `{onProcessRule}`.
     */

  }, {
    key: 'use',
    value: function use(plugin) {
      for (var name in plugin) {
        if (this.hooks[name]) this.hooks[name].push(plugin[name]);else (0, _warning2['default'])(false, '[JSS] Unknown hook "%s".', name);
      }
    }
  }]);

  return PluginsRegistry;
}();

exports['default'] = PluginsRegistry;
});

var SimpleRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SimpleRule = function () {
  function SimpleRule(key, value, options) {
    _classCallCheck(this, SimpleRule);

    this.type = 'simple';
    this.isProcessed = false;

    this.key = key;
    this.value = value;
    this.options = options;
  }

  /**
   * Generates a CSS string.
   */
  // eslint-disable-next-line no-unused-vars


  _createClass(SimpleRule, [{
    key: 'toString',
    value: function toString(options) {
      if (Array.isArray(this.value)) {
        var str = '';
        for (var index = 0; index < this.value.length; index++) {
          str += this.key + ' ' + this.value[index] + ';';
          if (this.value[index + 1]) str += '\n';
        }
        return str;
      }

      return this.key + ' ' + this.value + ';';
    }
  }]);

  return SimpleRule;
}();

exports['default'] = SimpleRule;
});

var KeyframesRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _RuleList2 = _interopRequireDefault(RuleList_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Rule for @keyframes
 */
var KeyframesRule = function () {
  function KeyframesRule(key, frames, options) {
    _classCallCheck(this, KeyframesRule);

    this.type = 'keyframes';
    this.isProcessed = false;

    this.key = key;
    this.options = options;
    this.rules = new _RuleList2['default'](_extends({}, options, { parent: this }));

    for (var name in frames) {
      this.rules.add(name, frames[name], _extends({}, this.options, {
        parent: this,
        selector: name
      }));
    }

    this.rules.process();
  }

  /**
   * Generates a CSS string.
   */


  _createClass(KeyframesRule, [{
    key: 'toString',
    value: function toString() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { indent: 1 };

      var inner = this.rules.toString(options);
      if (inner) inner += '\n';
      return this.key + ' {\n' + inner + '}';
    }
  }]);

  return KeyframesRule;
}();

exports['default'] = KeyframesRule;
});

var ConditionalRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _RuleList2 = _interopRequireDefault(RuleList_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Conditional rule for @media, @supports
 */
var ConditionalRule = function () {
  function ConditionalRule(key, styles, options) {
    _classCallCheck(this, ConditionalRule);

    this.type = 'conditional';
    this.isProcessed = false;

    this.key = key;
    this.options = options;
    this.rules = new _RuleList2['default'](_extends({}, options, { parent: this }));

    for (var name in styles) {
      this.rules.add(name, styles[name]);
    }

    this.rules.process();
  }

  /**
   * Get a rule.
   */


  _createClass(ConditionalRule, [{
    key: 'getRule',
    value: function getRule(name) {
      return this.rules.get(name);
    }

    /**
     * Get index of a rule.
     */

  }, {
    key: 'indexOf',
    value: function indexOf(rule) {
      return this.rules.indexOf(rule);
    }

    /**
     * Create and register rule, run plugins.
     */

  }, {
    key: 'addRule',
    value: function addRule(name, style, options) {
      var rule = this.rules.add(name, style, options);
      this.options.jss.plugins.onProcessRule(rule);
      return rule;
    }

    /**
     * Generates a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { indent: 1 };

      var inner = this.rules.toString(options);
      return inner ? this.key + ' {\n' + inner + '\n}' : '';
    }
  }]);

  return ConditionalRule;
}();

exports['default'] = ConditionalRule;
});

var FontFaceRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _toCss2 = _interopRequireDefault(toCss_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FontFaceRule = function () {
  function FontFaceRule(key, style, options) {
    _classCallCheck(this, FontFaceRule);

    this.type = 'font-face';
    this.isProcessed = false;

    this.key = key;
    this.style = style;
    this.options = options;
  }

  /**
   * Generates a CSS string.
   */


  _createClass(FontFaceRule, [{
    key: 'toString',
    value: function toString(options) {
      if (Array.isArray(this.style)) {
        var str = '';
        for (var index = 0; index < this.style.length; index++) {
          str += (0, _toCss2['default'])(this.key, this.style[index]);
          if (this.style[index + 1]) str += '\n';
        }
        return str;
      }

      return (0, _toCss2['default'])(this.key, this.style, options);
    }
  }]);

  return FontFaceRule;
}();

exports['default'] = FontFaceRule;
});

var ViewportRule_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _toCss2 = _interopRequireDefault(toCss_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ViewportRule = function () {
  function ViewportRule(key, style, options) {
    _classCallCheck(this, ViewportRule);

    this.type = 'viewport';
    this.isProcessed = false;

    this.key = key;
    this.style = style;
    this.options = options;
  }

  /**
   * Generates a CSS string.
   */


  _createClass(ViewportRule, [{
    key: 'toString',
    value: function toString(options) {
      return (0, _toCss2['default'])(this.key, this.style, options);
    }
  }]);

  return ViewportRule;
}();

exports['default'] = ViewportRule;
});

var rules = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});



var _SimpleRule2 = _interopRequireDefault(SimpleRule_1);



var _KeyframesRule2 = _interopRequireDefault(KeyframesRule_1);



var _ConditionalRule2 = _interopRequireDefault(ConditionalRule_1);



var _FontFaceRule2 = _interopRequireDefault(FontFaceRule_1);



var _ViewportRule2 = _interopRequireDefault(ViewportRule_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var classes = {
  '@charset': _SimpleRule2['default'],
  '@import': _SimpleRule2['default'],
  '@namespace': _SimpleRule2['default'],
  '@keyframes': _KeyframesRule2['default'],
  '@media': _ConditionalRule2['default'],
  '@supports': _ConditionalRule2['default'],
  '@font-face': _FontFaceRule2['default'],
  '@viewport': _ViewportRule2['default'],
  '@-ms-viewport': _ViewportRule2['default']

  /**
   * Generate plugins which will register all rules.
   */
};
exports['default'] = Object.keys(classes).map(function (key) {
  // https://jsperf.com/indexof-vs-substr-vs-regex-at-the-beginning-3
  var re = new RegExp('^' + key);
  var onCreateRule = function onCreateRule(name, decl, options) {
    return re.test(name) ? new classes[key](name, decl, options) : null;
  };
  return { onCreateRule: onCreateRule };
});
});

var createGenerateClassName = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});


var globalRef = typeof window === 'undefined' ? commonjsGlobal : window;

var namespace = '__JSS_VERSION_COUNTER__';
if (globalRef[namespace] == null) globalRef[namespace] = 0;
// In case we have more than one JSS version.
var jssCounter = globalRef[namespace]++;

/**
 * Returns a function which generates unique class names based on counters.
 * When new generator function is created, rule counter is reseted.
 * We need to reset the rule counter for SSR for each request.
 */

exports['default'] = function () {
  var ruleCounter = 0;

  return function (rule) {
    return rule.key + '-' + jssCounter + '-' + ruleCounter++;
  };
};
});

var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var isBrowser = (typeof window === "undefined" ? "undefined" : _typeof$1(window)) === "object" && (typeof document === "undefined" ? "undefined" : _typeof$1(document)) === 'object' && document.nodeType === 9;




var module$1 = Object.freeze({
	isBrowser: isBrowser,
	default: isBrowser
});

var DomRenderer_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _warning2 = _interopRequireDefault(browser);



var _sheets2 = _interopRequireDefault(sheets);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Get a style property.
 */
function getStyle(rule, prop) {
  try {
    return rule.style.getPropertyValue(prop);
  } catch (err) {
    // IE may throw if property is unknown.
    return '';
  }
}

/**
 * Set a style property.
 */
function setStyle(rule, prop, value) {
  try {
    rule.style.setProperty(prop, value);
  } catch (err) {
    // IE may throw if property is unknown.
    return false;
  }
  return true;
}

function extractSelector(cssText) {
  var from = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  return cssText.substr(from, cssText.indexOf('{') - 1);
}

var CSSRuleTypes = {
  STYLE_RULE: 1,
  KEYFRAMES_RULE: 7

  /**
   * Get the selector.
   */
};function getSelector(rule) {
  if (rule.type === CSSRuleTypes.STYLE_RULE) return rule.selectorText;
  if (rule.type === CSSRuleTypes.KEYFRAMES_RULE) {
    var name = rule.name;

    if (name) return '@keyframes ' + name;

    // There is no rule.name in the following browsers:
    // - IE 9
    // - Safari 7.1.8
    // - Mobile Safari 9.0.0
    var cssText = rule.cssText;

    return '@' + extractSelector(cssText, cssText.indexOf('keyframes'));
  }

  return extractSelector(rule.cssText);
}

/**
 * Set the selector.
 */
function setSelector(rule, selectorText) {
  rule.selectorText = selectorText;

  // Return false if setter was not successful.
  // Currently works in chrome only.
  return rule.selectorText === selectorText;
}

/**
 * Gets the `head` element upon the first call and caches it.
 */
var getHead = function () {
  var head = void 0;
  return function () {
    if (!head) head = document.head || document.getElementsByTagName('head')[0];
    return head;
  };
}();

/**
 * Find attached sheet with an index higher than the passed one.
 */
function findHigherSheet(registry, options) {
  for (var i = 0; i < registry.length; i++) {
    var sheet = registry[i];
    if (sheet.attached && sheet.options.index > options.index && sheet.options.insertionPoint === options.insertionPoint) {
      return sheet;
    }
  }
  return null;
}

/**
 * Find attached sheet with the highest index.
 */
function findHighestSheet(registry, options) {
  for (var i = registry.length - 1; i >= 0; i--) {
    var sheet = registry[i];
    if (sheet.attached && sheet.options.insertionPoint === options.insertionPoint) {
      return sheet;
    }
  }
  return null;
}

/**
 * Find a comment with "jss" inside.
 */
function findCommentNode(text) {
  var head = getHead();
  for (var i = 0; i < head.childNodes.length; i++) {
    var node = head.childNodes[i];
    if (node.nodeType === 8 && node.nodeValue.trim() === text) {
      return node;
    }
  }
  return null;
}

/**
 * Find a node before which we can insert the sheet.
 */
function findPrevNode(options) {
  var registry = _sheets2['default'].registry;


  if (registry.length > 0) {
    // Try to insert before the next higher sheet.
    var sheet = findHigherSheet(registry, options);
    if (sheet) return sheet.renderer.element;

    // Otherwise insert after the last attached.
    sheet = findHighestSheet(registry, options);
    if (sheet) return sheet.renderer.element.nextElementSibling;
  }

  // Try to find a comment placeholder if registry is empty.
  var insertionPoint = options.insertionPoint;

  if (insertionPoint && typeof insertionPoint === 'string') {
    var comment = findCommentNode(insertionPoint);
    if (comment) return comment.nextSibling;
    // If user specifies an insertion point and it can't be found in the document -
    // bad specificity issues may appear.
    (0, _warning2['default'])(insertionPoint === 'jss', '[JSS] Insertion point "%s" not found.', insertionPoint);
  }

  return null;
}

/**
 * Insert style element into the DOM.
 */
function insertStyle(style, options) {
  var insertionPoint = options.insertionPoint;

  var prevNode = findPrevNode(options);

  if (prevNode) {
    var parentNode = prevNode.parentNode;

    if (parentNode) parentNode.insertBefore(style, prevNode);
    return;
  }

  // Works with iframes and any node types.
  if (insertionPoint && typeof insertionPoint.nodeType === 'number') {
    // https://stackoverflow.com/questions/41328728/force-casting-in-flow
    var insertionPointElement = insertionPoint;
    var _parentNode = insertionPointElement.parentNode;

    if (_parentNode) _parentNode.insertBefore(style, insertionPointElement.nextSibling);else (0, _warning2['default'])(false, '[JSS] Insertion point is not in the DOM.');
    return;
  }

  getHead().insertBefore(style, prevNode);
}

var DomRenderer = function () {
  function DomRenderer(sheet) {
    _classCallCheck(this, DomRenderer);

    this.getStyle = getStyle;
    this.setStyle = setStyle;
    this.setSelector = setSelector;
    this.getSelector = getSelector;
    this.hasInsertedRules = false;

    // There is no sheet when the renderer is used from a standalone StyleRule.
    if (sheet) _sheets2['default'].add(sheet);

    this.sheet = sheet;

    var _ref = this.sheet ? this.sheet.options : {},
        media = _ref.media,
        meta = _ref.meta,
        element = _ref.element;

    this.element = element || document.createElement('style');
    this.element.type = 'text/css';
    this.element.setAttribute('data-jss', '');
    if (media) this.element.setAttribute('media', media);
    if (meta) this.element.setAttribute('data-meta', meta);
  }

  /**
   * Insert style element into render tree.
   */


  // HTMLStyleElement needs fixing https://github.com/facebook/flow/issues/2696


  _createClass(DomRenderer, [{
    key: 'attach',
    value: function attach() {
      // In the case the element node is external and it is already in the DOM.
      if (this.element.parentNode || !this.sheet) return;

      // When rules are inserted using `insertRule` API, after `sheet.detach().attach()`
      // browsers remove those rules.
      // TODO figure out if its a bug and if it is known.
      // Workaround is to redeploy the sheet before attaching as a string.
      if (this.hasInsertedRules) {
        this.deploy();
        this.hasInsertedRules = false;
      }

      insertStyle(this.element, this.sheet.options);
    }

    /**
     * Remove style element from render tree.
     */

  }, {
    key: 'detach',
    value: function detach() {
      this.element.parentNode.removeChild(this.element);
    }

    /**
     * Inject CSS string into element.
     */

  }, {
    key: 'deploy',
    value: function deploy() {
      if (!this.sheet) return;
      this.element.textContent = '\n' + this.sheet.toString() + '\n';
    }

    /**
     * Insert a rule into element.
     */

  }, {
    key: 'insertRule',
    value: function insertRule(rule) {
      var sheet = this.element.sheet;
      var cssRules = sheet.cssRules;

      var index = cssRules.length;
      var str = rule.toString();

      if (!str) return false;

      try {
        sheet.insertRule(str, index);
      } catch (err) {
        (0, _warning2['default'])(false, '[JSS] Can not insert an unsupported rule \n\r%s', rule);
        return false;
      }

      this.hasInsertedRules = true;

      return cssRules[index];
    }

    /**
     * Delete a rule.
     */

  }, {
    key: 'deleteRule',
    value: function deleteRule(rule) {
      var sheet = this.element.sheet;
      var cssRules = sheet.cssRules;

      for (var _index = 0; _index < cssRules.length; _index++) {
        if (rule === cssRules[_index]) {
          sheet.deleteRule(_index);
          return true;
        }
      }
      return false;
    }

    /**
     * Get all rules elements.
     */

  }, {
    key: 'getRules',
    value: function getRules() {
      return this.element.sheet.cssRules;
    }
  }]);

  return DomRenderer;
}();

exports['default'] = DomRenderer;
});

var VirtualRenderer_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable class-methods-use-this */

/**
 * Rendering backend to do nothing in nodejs.
 */
var VirtualRenderer = function () {
  function VirtualRenderer() {
    _classCallCheck(this, VirtualRenderer);
  }

  _createClass(VirtualRenderer, [{
    key: 'setStyle',
    value: function setStyle() {
      return true;
    }
  }, {
    key: 'getStyle',
    value: function getStyle() {
      return '';
    }
  }, {
    key: 'setSelector',
    value: function setSelector() {
      return true;
    }
  }, {
    key: 'getSelector',
    value: function getSelector() {
      return '';
    }
  }, {
    key: 'attach',
    value: function attach() {}
  }, {
    key: 'detach',
    value: function detach() {}
  }, {
    key: 'deploy',
    value: function deploy() {}
  }, {
    key: 'insertRule',
    value: function insertRule() {
      return false;
    }
  }, {
    key: 'deleteRule',
    value: function deleteRule() {
      return true;
    }
  }, {
    key: 'getRules',
    value: function getRules() {}
  }]);

  return VirtualRenderer;
}();

exports['default'] = VirtualRenderer;
});

var _isInBrowser = ( module$1 && isBrowser ) || module$1;

var findRenderer_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports['default'] = findRenderer;



var _isInBrowser2 = _interopRequireDefault(_isInBrowser);



var _DomRenderer2 = _interopRequireDefault(DomRenderer_1);



var _VirtualRenderer2 = _interopRequireDefault(VirtualRenderer_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Find proper renderer.
 * Option `virtual` is used to force use of VirtualRenderer even if DOM is
 * detected, used for testing only.
 */
function findRenderer() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (options.Renderer) return options.Renderer;
  var useVirtual = options.virtual || !_isInBrowser2['default'];
  return useVirtual ? _VirtualRenderer2['default'] : _DomRenderer2['default'];
}
});

var Jss_1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _StyleSheet2 = _interopRequireDefault(StyleSheet_1);



var _PluginsRegistry2 = _interopRequireDefault(PluginsRegistry_1);



var _rules2 = _interopRequireDefault(rules);



var _sheets2 = _interopRequireDefault(sheets);



var _createGenerateClassName2 = _interopRequireDefault(createGenerateClassName);



var _createRule3 = _interopRequireDefault(createRule_1);



var _findRenderer2 = _interopRequireDefault(findRenderer_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Jss = function () {
  function Jss(options) {
    _classCallCheck(this, Jss);

    this.version = "8.1.0";
    this.plugins = new _PluginsRegistry2['default']();

    // eslint-disable-next-line prefer-spread
    this.use.apply(this, _rules2['default']);
    this.setup(options);
  }

  _createClass(Jss, [{
    key: 'setup',
    value: function setup() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var createGenerateClassName$$1 = options.createGenerateClassName || _createGenerateClassName2['default'];
      this.generateClassName = createGenerateClassName$$1();
      this.options = _extends({}, options, {
        createGenerateClassName: createGenerateClassName$$1,
        Renderer: (0, _findRenderer2['default'])(options)
        // eslint-disable-next-line prefer-spread
      });if (options.plugins) this.use.apply(this, options.plugins);
      return this;
    }

    /**
     * Create a Style Sheet.
     */

  }, {
    key: 'createStyleSheet',
    value: function createStyleSheet(styles) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var index = options.index;
      if (typeof index !== 'number') {
        index = _sheets2['default'].index === 0 ? 0 : _sheets2['default'].index + 1;
      }
      var sheet = new _StyleSheet2['default'](styles, _extends({}, options, {
        jss: this,
        generateClassName: options.generateClassName || this.generateClassName,
        insertionPoint: this.options.insertionPoint,
        Renderer: this.options.Renderer,
        index: index
      }));
      this.plugins.onProcessSheet(sheet);
      return sheet;
    }

    /**
     * Detach the Style Sheet and remove it from the registry.
     */

  }, {
    key: 'removeStyleSheet',
    value: function removeStyleSheet(sheet) {
      sheet.detach();
      _sheets2['default'].remove(sheet);
      return this;
    }

    /**
     * Create a rule without a Style Sheet.
     */

  }, {
    key: 'createRule',
    value: function createRule(name) {
      var style = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      // Enable rule without name for inline styles.
      if ((typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
        options = style;
        style = name;
        name = undefined;
      }

      // Cast from RuleFactoryOptions to RuleOptions
      // https://stackoverflow.com/questions/41328728/force-casting-in-flow
      var ruleOptions = options;

      ruleOptions.jss = this;
      ruleOptions.Renderer = this.options.Renderer;
      if (!ruleOptions.generateClassName) ruleOptions.generateClassName = this.generateClassName;
      if (!ruleOptions.classes) ruleOptions.classes = {};
      var rule = (0, _createRule3['default'])(name, style, ruleOptions);
      this.plugins.onProcessRule(rule);

      return rule;
    }

    /**
     * Register plugin. Passed function will be invoked with a rule instance.
     */

  }, {
    key: 'use',
    value: function use() {
      var _this = this;

      for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
        plugins[_key] = arguments[_key];
      }

      plugins.forEach(function (plugin) {
        return _this.plugins.use(plugin);
      });
      return this;
    }
  }]);

  return Jss;
}();

exports['default'] = Jss;
});

var index$1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = exports.sheets = exports.RuleList = exports.SheetsManager = exports.SheetsRegistry = exports.getDynamicStyles = undefined;



Object.defineProperty(exports, 'getDynamicStyles', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(getDynamicStyles)['default'];
  }
});



Object.defineProperty(exports, 'SheetsRegistry', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(SheetsRegistry_1)['default'];
  }
});



Object.defineProperty(exports, 'SheetsManager', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(SheetsManager_1)['default'];
  }
});



Object.defineProperty(exports, 'RuleList', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(RuleList_1)['default'];
  }
});



Object.defineProperty(exports, 'sheets', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(sheets)['default'];
  }
});



var _Jss2 = _interopRequireDefault(Jss_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Creates a new instance of Jss.
 */
var create = exports.create = function create(options) {
  return new _Jss2['default'](options);
};

/**
 * A global Jss instance.
 */
exports['default'] = create();
});

var index_1 = index$1.create;

var index$3 = createCommonjsModule(function (module, exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = camelCase;
var regExp = /([A-Z])/g;

/**
 * Replace a string passed from String#replace.
 * @param {String} str
 * @return {String}
 */
function replace(str) {
  return "-" + str.toLowerCase();
}

/**
 * Convert camel cased property names to dash separated.
 *
 * @param {Object} style
 * @return {Object}
 */
function convertCase(style) {
  var converted = {};

  for (var prop in style) {
    converted[prop.replace(regExp, replace)] = style[prop];
  }

  if (style.fallbacks) {
    if (Array.isArray(style.fallbacks)) converted.fallbacks = style.fallbacks.map(convertCase);else converted.fallbacks = convertCase(style.fallbacks);
  }

  return converted;
}

/**
 * Allow camel cased property names by converting them back to dasherized.
 *
 * @param {Rule} rule
 */
function camelCase() {
  function onProcessStyle(style) {
    if (Array.isArray(style)) {
      // Handle rules like @font-face, which can have multiple styles in an array
      for (var index = 0; index < style.length; index++) {
        style[index] = convertCase(style[index]);
      }
      return style;
    }

    return convertCase(style);
  }

  return { onProcessStyle: onProcessStyle };
}
});

var jssCamel = unwrapExports(index$3);

var index$4 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports['default'] = jssGlobal;



function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var propKey = '@global';
var prefixKey = '@global ';

var GlobalContainerRule = function () {
  function GlobalContainerRule(key, styles, options) {
    _classCallCheck(this, GlobalContainerRule);

    this.type = 'global';

    this.key = key;
    this.options = options;
    this.rules = new index$1.RuleList(_extends({}, options, {
      parent: this
    }));

    for (var selector in styles) {
      this.rules.add(selector, styles[selector], { selector: selector });
    }

    this.rules.process();
  }

  /**
   * Get a rule.
   */


  _createClass(GlobalContainerRule, [{
    key: 'getRule',
    value: function getRule(name) {
      return this.rules.get(name);
    }

    /**
     * Create and register rule, run plugins.
     */

  }, {
    key: 'addRule',
    value: function addRule(name, style, options) {
      var rule = this.rules.add(name, style, options);
      this.options.jss.plugins.onProcessRule(rule);
      return rule;
    }

    /**
     * Get index of a rule.
     */

  }, {
    key: 'indexOf',
    value: function indexOf(rule) {
      return this.rules.indexOf(rule);
    }

    /**
     * Generates a CSS string.
     */

  }, {
    key: 'toString',
    value: function toString() {
      return this.rules.toString();
    }
  }]);

  return GlobalContainerRule;
}();

var GlobalPrefixedRule = function () {
  function GlobalPrefixedRule(name, style, options) {
    _classCallCheck(this, GlobalPrefixedRule);

    this.name = name;
    this.options = options;
    var selector = name.substr(prefixKey.length);
    this.rule = options.jss.createRule(selector, style, _extends({}, options, {
      parent: this,
      selector: selector
    }));
  }

  _createClass(GlobalPrefixedRule, [{
    key: 'toString',
    value: function toString(options) {
      return this.rule.toString(options);
    }
  }]);

  return GlobalPrefixedRule;
}();

var separatorRegExp = /\s*,\s*/g;

function addScope(selector, scope) {
  var parts = selector.split(separatorRegExp);
  var scoped = '';
  for (var i = 0; i < parts.length; i++) {
    scoped += scope + ' ' + parts[i].trim();
    if (parts[i + 1]) scoped += ', ';
  }
  return scoped;
}

function handleNestedGlobalContainerRule(rule) {
  var options = rule.options,
      style = rule.style;

  var rules = style[propKey];

  if (!rules) return;

  for (var name in rules) {
    options.sheet.addRule(name, rules[name], _extends({}, options, {
      selector: addScope(name, rule.selector)
    }));
  }

  delete style[propKey];
}

function handlePrefixedGlobalRule(rule) {
  var options = rule.options,
      style = rule.style;

  for (var prop in style) {
    if (prop.substr(0, propKey.length) !== propKey) continue;

    var selector = addScope(prop.substr(propKey.length), rule.selector);
    options.sheet.addRule(selector, style[prop], _extends({}, options, {
      selector: selector
    }));
    delete style[prop];
  }
}

/**
 * Convert nested rules to separate, remove them from original styles.
 *
 * @param {Rule} rule
 * @api public
 */
function jssGlobal() {
  function onCreateRule(name, styles, options) {
    if (name === propKey) {
      return new GlobalContainerRule(name, styles, options);
    }

    if (name[0] === '@' && name.substr(0, prefixKey.length) === prefixKey) {
      return new GlobalPrefixedRule(name, styles, options);
    }

    var parent = options.parent;


    if (parent) {
      if (parent.type === 'global' || parent.options.parent.type === 'global') {
        options.global = true;
      }
    }

    if (options.global) options.selector = name;

    return null;
  }

  function onProcessRule(rule) {
    if (rule.type !== 'style') return;

    handleNestedGlobalContainerRule(rule);
    handlePrefixedGlobalRule(rule);
  }

  return { onCreateRule: onCreateRule, onProcessRule: onProcessRule };
}
});

var jssGlobal = unwrapExports(index$4);

var index$5 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = jssNested;



var _warning2 = _interopRequireDefault(browser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var separatorRegExp = /\s*,\s*/g;
var parentRegExp = /&/g;
var refRegExp = /\$([\w-]+)/g;

/**
 * Convert nested rules to separate, remove them from original styles.
 *
 * @param {Rule} rule
 * @api public
 */
function jssNested() {
  // Get a function to be used for $ref replacement.
  function getReplaceRef(container) {
    return function (match, key) {
      var rule = container.getRule(key);
      if (rule) return rule.selector;
      (0, _warning2.default)(false, '[JSS] Could not find the referenced rule %s in %s.', key, container.options.meta || container);
      return key;
    };
  }

  var hasAnd = function hasAnd(str) {
    return str.indexOf('&') !== -1;
  };

  function replaceParentRefs(nestedProp, parentProp) {
    var parentSelectors = parentProp.split(separatorRegExp);
    var nestedSelectors = nestedProp.split(separatorRegExp);

    var result = '';

    for (var i = 0; i < parentSelectors.length; i++) {
      var parent = parentSelectors[i];

      for (var j = 0; j < nestedSelectors.length; j++) {
        var nested = nestedSelectors[j];
        if (result) result += ', ';
        // Replace all & by the parent or prefix & with the parent.
        result += hasAnd(nested) ? nested.replace(parentRegExp, parent) : parent + ' ' + nested;
      }
    }

    return result;
  }

  function getOptions(rule, container, options) {
    // Options has been already created, now we only increase index.
    if (options) return _extends({}, options, { index: options.index + 1 });

    var nestingLevel = rule.options.nestingLevel;

    nestingLevel = nestingLevel === undefined ? 1 : nestingLevel + 1;

    return _extends({}, rule.options, {
      nestingLevel: nestingLevel,
      index: container.indexOf(rule) + 1
    });
  }

  function onProcessStyle(style, rule) {
    if (rule.type !== 'style') return style;
    var container = rule.options.parent;
    var options = void 0;
    var replaceRef = void 0;
    for (var prop in style) {
      var isNested = hasAnd(prop);
      var isNestedConditional = prop[0] === '@';

      if (!isNested && !isNestedConditional) continue;

      options = getOptions(rule, container, options);

      if (isNested) {
        var selector = replaceParentRefs(prop, rule.selector
        // Lazily create the ref replacer function just once for
        // all nested rules within the sheet.
        );if (!replaceRef) replaceRef = getReplaceRef(container
        // Replace all $refs.
        );selector = selector.replace(refRegExp, replaceRef);

        container.addRule(selector, style[prop], _extends({}, options, { selector: selector }));
      } else if (isNestedConditional) {
        // Place conditional right after the parent rule to ensure right ordering.
        container.addRule(prop, _defineProperty({}, rule.key, style[prop]), options);
      }

      delete style[prop];
    }

    return style;
  }

  return { onProcessStyle: onProcessStyle };
}
});

var jssNested = unwrapExports(index$5);

function ErrorableView(_ref) {
    var error = _ref.error;

    return lom_h(
        'div',
        null,
        error instanceof AtomWait ? lom_h(
            'div',
            null,
            'Loading...'
        ) : lom_h(
            'div',
            null,
            lom_h(
                'h3',
                null,
                'Fatal error !'
            ),
            lom_h(
                'div',
                null,
                error.message
            ),
            lom_h(
                'pre',
                null,
                error.stack.toString()
            )
        )
    );
}

var jss = index_1({
    plugins: [jssNested(), jssCamel(), jssGlobal()]
});

var atomize = createReactWrapper(Component, ErrorableView, jss);
var lomCreateElement = createCreateElement(atomize, h);
global$1['lom_h'] = lomCreateElement;

var _class$2;

function _applyDecoratedDescriptor$3(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var Counter = (_class$2 = function () {
    function Counter() {
        classCallCheck(this, Counter);
    }

    createClass(Counter, [{
        key: 'value',
        get: function get$$1() {
            var _this = this;

            setTimeout(function () {
                _this.value = 1;
                // this.value = new Error('loading error')
            }, 500);

            throw new AtomWait();
        },
        set: function set$$1(v) {
            if (typeof v === 'string') {
                throw new TypeError('Test error');
            }
        }
    }]);
    return Counter;
}(), (_applyDecoratedDescriptor$3(_class$2.prototype, 'value', [mem], Object.getOwnPropertyDescriptor(_class$2.prototype, 'value'), _class$2.prototype), _applyDecoratedDescriptor$3(_class$2.prototype, 'value', [mem], Object.getOwnPropertyDescriptor(_class$2.prototype, 'value'), _class$2.prototype)), _class$2);

function CounterView(_ref) {
    var counter = _ref.counter;

    return lom_h(
        'div',
        null,
        lom_h(
            'div',
            null,
            'Count: ',
            counter.value
        ),
        lom_h(
            'button',
            { onClick: function onClick() {
                    counter.value++;
                } },
            'Add'
        ),
        lom_h(
            'button',
            { onClick: function onClick() {
                    counter.value = 'error';
                } },
            'Gen error'
        )
    );
}

var index$6 = function (glob, opts) {
  if (typeof glob !== 'string') {
    throw new TypeError('Expected a string');
  }

  var str = String(glob);

  // The regexp we are building, as a string.
  var reStr = "";

  // Whether we are matching so called "extended" globs (like bash) and should
  // support single character matching, matching ranges of characters, group
  // matching, etc.
  var extended = opts ? !!opts.extended : false;

  // When globstar is _false_ (default), '/foo/*' is translated a regexp like
  // '^\/foo\/.*$' which will match any string beginning with '/foo/'
  // When globstar is _true_, '/foo/*' is translated to regexp like
  // '^\/foo\/[^/]*$' which will match any string beginning with '/foo/' BUT
  // which does not have a '/' to the right of it.
  // E.g. with '/foo/*' these will match: '/foo/bar', '/foo/bar.txt' but
  // these will not '/foo/bar/baz', '/foo/bar/baz.txt'
  // Lastely, when globstar is _true_, '/foo/**' is equivelant to '/foo/*' when
  // globstar is _false_
  var globstar = opts ? !!opts.globstar : false;

  // If we are doing extended matching, this boolean is true when we are inside
  // a group (eg {*.html,*.js}), and false otherwise.
  var inGroup = false;

  // RegExp flags (eg "i" ) to pass in to RegExp constructor.
  var flags = opts && typeof( opts.flags ) === "string" ? opts.flags : "";

  var c;
  for (var i = 0, len = str.length; i < len; i++) {
    c = str[i];

    switch (c) {
    case "\\":
    case "/":
    case "$":
    case "^":
    case "+":
    case ".":
    case "(":
    case ")":
    case "=":
    case "!":
    case "|":
      reStr += "\\" + c;
      break;

    case "?":
      if (extended) {
        reStr += ".";
	    break;
      }

    case "[":
    case "]":
      if (extended) {
        reStr += c;
	    break;
      }

    case "{":
      if (extended) {
        inGroup = true;
	    reStr += "(";
	    break;
      }

    case "}":
      if (extended) {
        inGroup = false;
	    reStr += ")";
	    break;
      }

    case ",":
      if (inGroup) {
        reStr += "|";
	    break;
      }
      reStr += "\\" + c;
      break;

    case "*":
      // Move over all consecutive "*"'s.
      // Also store the previous and next characters
      var prevChar = str[i - 1];
      var starCount = 1;
      while(str[i + 1] === "*") {
        starCount++;
        i++;
      }
      var nextChar = str[i + 1];

      if (!globstar) {
        // globstar is disabled, so treat any number of "*" as one
        reStr += ".*";
      } else {
        // globstar is enabled, so determine if this is a globstar segment
        var isGlobstar = starCount > 1                      // multiple "*"'s
          && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
          && (nextChar === "/" || nextChar === undefined);   // to the end of the segment

        if (isGlobstar) {
          // it's a globstar, so match zero or more path segments
          reStr += "(?:[^/]*(?:\/|$))*";
          i++; // move over the "/"
        } else {
          // it's not a globstar, so only match one path segment
          reStr += "[^/]*";
        }
      }
      break;

    default:
      reStr += c;
    }
  }

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};

var index$10 = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

/**
 * Expose `pathToRegexp`.
 */
var index$8 = pathToRegexp;
var parse_1 = parse;
var compile_1 = compile;
var tokensToFunction_1 = tokensToFunction;
var tokensToRegExp_1 = tokensToRegExp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var defaultDelimiter = options && options.delimiter || '/';
  var res;

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      continue
    }

    var next = str[index];
    var prefix = res[2];
    var name = res[3];
    var capture = res[4];
    var group = res[5];
    var modifier = res[6];
    var asterisk = res[7];

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
    }

    var partial = prefix != null && next != null && next !== prefix;
    var repeat = modifier === '+' || modifier === '*';
    var optional = modifier === '?' || modifier === '*';
    var delimiter = res[2] || defaultDelimiter;
    var pattern = capture || group;

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: !!asterisk,
      pattern: pattern ? escapeGroup(pattern) : (asterisk ? '.*' : '[^' + escapeString(delimiter) + ']+?')
    });
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index);
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path);
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
function compile (str, options) {
  return tokensToFunction(parse(str, options))
}

/**
 * Prettier encoding of URI path segments.
 *
 * @param  {string}
 * @return {string}
 */
function encodeURIComponentPretty (str) {
  return encodeURI(str).replace(/[\/?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
 *
 * @param  {string}
 * @return {string}
 */
function encodeAsterisk (str) {
  return encodeURI(str).replace(/[?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
    }
  }

  return function (obj, opts) {
    var path = '';
    var data = obj || {};
    var options = opts || {};
    var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;

        continue
      }

      var value = data[token.name];
      var segment;

      if (value == null) {
        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) {
            path += token.prefix;
          }

          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (index$10(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j]);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue
      }

      segment = token.asterisk ? encodeAsterisk(value) : encode(value);

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment;
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {!RegExp} re
 * @param  {Array}   keys
 * @return {!RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys;
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {!Array}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      });
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array}   keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {!Array}  keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  return tokensToRegExp(parse(path, options), keys, options)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}          tokens
 * @param  {(Array|Object)=} keys
 * @param  {Object=}         options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  if (!index$10(keys)) {
    options = /** @type {!Object} */ (keys || options);
    keys = [];
  }

  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var route = '';

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var prefix = escapeString(token.prefix);
      var capture = '(?:' + token.pattern + ')';

      keys.push(token);

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*';
      }

      if (token.optional) {
        if (!token.partial) {
          capture = '(?:' + prefix + '(' + capture + '))?';
        } else {
          capture = prefix + '(' + capture + ')?';
        }
      } else {
        capture = prefix + '(' + capture + ')';
      }

      route += capture;
    }
  }

  var delimiter = escapeString(options.delimiter || '/');
  var endsWithDelimiter = route.slice(-delimiter.length) === delimiter;

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + '(?:' + delimiter + '(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithDelimiter ? '' : '(?=' + delimiter + '|$)';
  }

  return attachKeys(new RegExp('^' + route, flags(options)), keys)
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {(Array|Object)=}       keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  if (!index$10(keys)) {
    options = /** @type {!Object} */ (keys || options);
    keys = [];
  }

  options = options || {};

  if (path instanceof RegExp) {
    return regexpToRegexp(path, /** @type {!Array} */ (keys))
  }

  if (index$10(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), /** @type {!Array} */ (keys), options)
  }

  return stringToRegexp(/** @type {string} */ (path), /** @type {!Array} */ (keys), options)
}

index$8.parse = parse_1;
index$8.compile = compile_1;
index$8.tokensToFunction = tokensToFunction_1;
index$8.tokensToRegExp = tokensToRegExp_1;

var _extends$2 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };




var stringMatchers = {
	begin: function begin(targetString) {
		return function (url) {
			return url.indexOf(targetString) === 0;
		};
	},
	end: function end(targetString) {
		return function (url) {
			return url.substr(-targetString.length) === targetString;
		};
	},
	glob: function glob(targetString) {
		var urlRX = index$6(targetString.replace(/^glob:/, ''));
		return function (url) {
			return urlRX.test(url);
		};
	},
	express: function express(targetString) {
		var urlRX = index$8(targetString.replace(/^express:/, ''));
		return function (url) {
			return urlRX.test(url);
		};
	}
};

function getHeaderMatcher(expectedHeaders, HeadersConstructor) {
	var expectation = Object.keys(expectedHeaders).map(function (k) {
		return { key: k.toLowerCase(), val: expectedHeaders[k] };
	});
	return function (headers) {
		if (!headers) {
			headers = {};
		}

		if (headers instanceof HeadersConstructor) {
			headers = headers.raw();
		}

		var lowerCaseHeaders = Object.keys(headers).reduce(function (obj, k) {
			obj[k.toLowerCase()] = headers[k];
			return obj;
		}, {});

		return expectation.every(function (header) {
			return areHeadersEqual(lowerCaseHeaders, header);
		});
	};
}

function areHeadersEqual(currentHeader, expectedHeader) {
	var key = expectedHeader.key;
	var val = expectedHeader.val;
	var currentHeaderValue = Array.isArray(currentHeader[key]) ? currentHeader[key] : [currentHeader[key]];
	var expectedHeaderValue = Array.isArray(val) ? val : [val];

	if (currentHeaderValue.length !== expectedHeaderValue.length) {
		return false;
	}

	for (var i = 0; i < currentHeaderValue.length; ++i) {
		if (currentHeaderValue[i] !== expectedHeaderValue[i]) {
			return false;
		}
	}

	return true;
}

function normalizeRequest(url, options, Request) {
	if (Request.prototype.isPrototypeOf(url)) {
		return {
			url: url.url,
			method: url.method,
			headers: function () {
				var headers = {};
				url.headers.forEach(function (name) {
					return headers[name] = url.headers.name;
				});
				return headers;
			}()
		};
	} else {
		return {
			url: url,
			method: options && options.method || 'GET',
			headers: options && options.headers
		};
	}
}

var compileRoute = function (route, Request, HeadersConstructor) {
	route = _extends$2({}, route);

	if (typeof route.response === 'undefined') {
		throw new Error('Each route must define a response');
	}

	if (!route.matcher) {
		throw new Error('each route must specify a string, regex or function to match calls to fetch');
	}

	if (!route.name) {
		route.name = route.matcher.toString();
		route.__unnamed = true;
	}

	// If user has provided a function as a matcher we assume they are handling all the
	// matching logic they need
	if (typeof route.matcher === 'function') {
		return route;
	}

	var expectedMethod = route.method && route.method.toLowerCase();

	function matchMethod(method) {
		return !expectedMethod || expectedMethod === (method ? method.toLowerCase() : 'get');
	}

	var matchHeaders = route.headers ? getHeaderMatcher(route.headers, HeadersConstructor) : function () {
		return true;
	};

	var matchUrl = void 0;

	if (typeof route.matcher === 'string') {

		Object.keys(stringMatchers).some(function (name) {
			if (route.matcher.indexOf(name + ':') === 0) {
				var url = route.matcher.replace(new RegExp('^' + name + ':'), '');
				matchUrl = stringMatchers[name](url);
				return true;
			}
		});
		if (!matchUrl) {
			if (route.matcher === '*') {
				matchUrl = function matchUrl() {
					return true;
				};
			} else if (route.matcher.indexOf('^') === 0) {
				(function () {
					console.warn('Using \'^\' to denote the start of a url is deprecated. Use \'begin:\' instead');
					var expectedUrl = route.matcher.substr(1);
					matchUrl = function matchUrl(url) {
						return url.indexOf(expectedUrl) === 0;
					};
				})();
			} else {
				(function () {
					var expectedUrl = route.matcher;
					matchUrl = function matchUrl(url) {
						return url === expectedUrl;
					};
				})();
			}
		}
	} else if (route.matcher instanceof RegExp) {
		(function () {
			var urlRX = route.matcher;
			matchUrl = function matchUrl(url) {
				return urlRX.test(url);
			};
		})();
	}

	var matcher = function matcher(url, options) {
		var req = normalizeRequest(url, options, Request);
		return matchHeaders(req.headers) && matchMethod(req.method) && matchUrl(req.url);
	};

	if (route.times) {
		(function () {
			var timesLeft = route.times;
			route.matcher = function (url, options) {
				var match = timesLeft && matcher(url, options);
				if (match) {
					timesLeft--;
					return true;
				}
			};
			route.reset = function () {
				return timesLeft = route.times;
			};
		})();
	} else {
		route.matcher = matcher;
	}

	return route;
};

var _typeof$2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends$1 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };



var FetchMock = function FetchMock() {

	this.routes = [];
	this._calls = {};
	this._matchedCalls = [];
	this._unmatchedCalls = [];
	this._holdingPromises = [];
	this.bindMethods();
};

FetchMock.prototype.bindMethods = function () {
	this.fetchMock = FetchMock.prototype.fetchMock.bind(this);
	this.restore = FetchMock.prototype.restore.bind(this);
	this.reset = FetchMock.prototype.reset.bind(this);
};

FetchMock.prototype.mock = function (matcher, response, options) {

	var route = void 0;

	// Handle the variety of parameters accepted by mock (see README)
	if (matcher && response && options) {
		route = _extends$1({
			matcher: matcher,
			response: response
		}, options);
	} else if (matcher && response) {
		route = {
			matcher: matcher,
			response: response
		};
	} else if (matcher && matcher.matcher) {
		route = matcher;
	} else {
		throw new Error('Invalid parameters passed to fetch-mock');
	}

	this.addRoute(route);

	return this._mock();
};

FetchMock.prototype.once = function (matcher, response, options) {
	return this.mock(matcher, response, _extends$1({}, options, { times: 1 }));
};

FetchMock.prototype._mock = function () {
	if (!this.isSandbox) {
		// Do this here rather than in the constructor to ensure it's scoped to the test
		this.realFetch = this.realFetch || FetchMock.global.fetch;
		FetchMock.global.fetch = this.fetchMock;
	}
	return this;
};

FetchMock.prototype._unMock = function () {
	if (this.realFetch) {
		FetchMock.global.fetch = this.realFetch;
		this.realFetch = null;
	}
	this.fallbackResponse = null;
	return this;
};

FetchMock.prototype.catch = function (response) {
	if (this.fallbackResponse) {
		console.warn('calling fetchMock.catch() twice - are you sure you want to overwrite the previous fallback response');
	}
	this.fallbackResponse = response || 'ok';
	return this._mock();
};

FetchMock.prototype.spy = function () {
	this._mock();
	return this.catch(this.realFetch);
};

FetchMock.prototype.fetchMock = function (url, opts) {
	var _this = this;

	var Promise = this.Promise || FetchMock.Promise;
	var resolveHoldingPromise = void 0;
	var holdingPromise = new Promise(function (res) {
		return resolveHoldingPromise = res;
	});
	this._holdingPromises.push(holdingPromise);
	var response = this.router(url, opts);

	if (!response) {
		console.warn('Unmatched ' + (opts && opts.method || 'GET') + ' to ' + url);
		this.push(null, [url, opts]);

		if (this.fallbackResponse) {
			response = this.fallbackResponse;
		} else {
			throw new Error('No fallback response defined for ' + (opts && opts.method || 'GET') + ' to ' + url);
		}
	}

	if (typeof response === 'function') {
		response = response(url, opts);
	}

	if (typeof response.then === 'function') {
		var responsePromise = response.then(function (response) {
			return _this.mockResponse(url, response, opts, resolveHoldingPromise);
		});
		return Promise.resolve(responsePromise); // Ensure Promise is always our implementation.
	} else {
		return this.mockResponse(url, response, opts, resolveHoldingPromise);
	}
};

FetchMock.prototype.router = function (url, opts) {
	var route = void 0;
	for (var i = 0, il = this.routes.length; i < il; i++) {
		route = this.routes[i];
		if (route.matcher(url, opts)) {
			this.push(route.name, [url, opts]);
			return route.response;
		}
	}
};

FetchMock.prototype.addRoute = function (route) {

	if (!route) {
		throw new Error('.mock() must be passed configuration for a route');
	}

	// Allows selective application of some of the preregistered routes
	this.routes.push(compileRoute(route, FetchMock.Request, FetchMock.Headers));
};

FetchMock.prototype.mockResponse = function (url, responseConfig, fetchOpts, resolveHoldingPromise) {
	var Promise = this.Promise || FetchMock.Promise;

	// It seems odd to call this in here even though it's already called within fetchMock
	// It's to handle the fact that because we want to support making it very easy to add a
	// delay to any sort of response (including responses which are defined with a function)
	// while also allowing function responses to return a Promise for a response config.
	if (typeof responseConfig === 'function') {
		responseConfig = responseConfig(url, fetchOpts);
	}

	// If the response is a pre-made Response, respond with it
	if (FetchMock.Response.prototype.isPrototypeOf(responseConfig)) {
		return this.respond(Promise.resolve(responseConfig), resolveHoldingPromise);
	}

	// If the response says to throw an error, throw it
	if (responseConfig.throws) {
		return this.respond(Promise.reject(responseConfig.throws), resolveHoldingPromise);
	}

	// If the response config looks like a status, start to generate a simple response
	if (typeof responseConfig === 'number') {
		responseConfig = {
			status: responseConfig
		};
		// If the response config is not an object, or is an object that doesn't use
		// any reserved properties, assume it is meant to be the body of the response
	} else if (typeof responseConfig === 'string' || !(responseConfig.body || responseConfig.headers || responseConfig.throws || responseConfig.status || responseConfig.__redirectUrl)) {
		responseConfig = {
			body: responseConfig
		};
	}

	// Now we are sure we're dealing with a response config object, so start to
	// construct a real response from it
	var opts = responseConfig.opts || {};

	// set the response url
	opts.url = responseConfig.__redirectUrl || url;

	// Handle a reasonably common misuse of the library - returning an object
	// with the property 'status'
	if (responseConfig.status && (typeof responseConfig.status !== 'number' || parseInt(responseConfig.status, 10) !== responseConfig.status || responseConfig.status < 200 || responseConfig.status > 599)) {
		throw new TypeError('Invalid status ' + responseConfig.status + ' passed on response object.\nTo respond with a JSON object that has status as a property assign the object to body\ne.g. {"body": {"status: "registered"}}');
	}

	// set up the response status
	opts.status = responseConfig.status || 200;
	opts.statusText = FetchMock.statusTextMap['' + opts.status];

	// Set up response headers. The ternary operator is to cope with
	// new Headers(undefined) throwing in Chrome
	// https://code.google.com/p/chromium/issues/detail?id=335871
	opts.headers = responseConfig.headers ? new FetchMock.Headers(responseConfig.headers) : new FetchMock.Headers();

	// start to construct the body
	var body = responseConfig.body;

	// convert to json if we need to
	opts.sendAsJson = responseConfig.sendAsJson === undefined ? FetchMock.config.sendAsJson : responseConfig.sendAsJson;
	if (opts.sendAsJson && responseConfig.body != null && (typeof body === 'undefined' ? 'undefined' : _typeof$2(body)) === 'object') {
		//eslint-disable-line
		body = JSON.stringify(body);
	}

	// On the server we need to manually construct the readable stream for the
	// Response object (on the client this is done automatically)
	if (FetchMock.stream) {
		var s = new FetchMock.stream.Readable();
		if (body != null) {
			//eslint-disable-line
			s.push(body, 'utf-8');
		}
		s.push(null);
		body = s;
	}
	var response = new FetchMock.Response(body, opts);

	// When mocking a followed redirect we must wrap the response in an object
	// which sets the redirected flag (not a writable property on the actual response)
	if (responseConfig.__redirectUrl) {
		response = Object.create(response, {
			redirected: {
				value: true
			}
		});
	}

	return this.respond(Promise.resolve(response), resolveHoldingPromise);
};

FetchMock.prototype.respond = function (response, resolveHoldingPromise) {
	response.then(resolveHoldingPromise, resolveHoldingPromise);

	return response;
};

FetchMock.prototype.flush = function () {
	return Promise.all(this._holdingPromises);
};

FetchMock.prototype.push = function (name, call) {
	if (name) {
		this._calls[name] = this._calls[name] || [];
		this._calls[name].push(call);
		this._matchedCalls.push(call);
	} else {
		this._unmatchedCalls.push(call);
	}
};

FetchMock.prototype.restore = function () {
	this._unMock();
	this.reset();
	this.routes = [];
	return this;
};

FetchMock.prototype.reset = function () {
	this._calls = {};
	this._matchedCalls = [];
	this._unmatchedCalls = [];
	this._holdingPromises = [];
	this.routes.forEach(function (route) {
		return route.reset && route.reset();
	});
	return this;
};

FetchMock.prototype.calls = function (name) {
	return name ? this._calls[name] || [] : {
		matched: this._matchedCalls,
		unmatched: this._unmatchedCalls
	};
};

FetchMock.prototype.lastCall = function (name) {
	var calls = name ? this.calls(name) : this.calls().matched;
	if (calls && calls.length) {
		return calls[calls.length - 1];
	} else {
		return undefined;
	}
};

FetchMock.prototype.lastUrl = function (name) {
	var call = this.lastCall(name);
	return call && call[0];
};

FetchMock.prototype.lastOptions = function (name) {
	var call = this.lastCall(name);
	return call && call[1];
};

FetchMock.prototype.called = function (name) {
	if (!name) {
		return !!(this._matchedCalls.length || this._unmatchedCalls.length);
	}
	return !!(this._calls[name] && this._calls[name].length);
};

FetchMock.prototype.done = function (name) {
	var _this2 = this;

	var names = name ? [name] : this.routes.map(function (r) {
		return r.name;
	});
	// Can't use array.every because
	// a) not widely supported
	// b) would exit after first failure, which would break the logging
	return names.map(function (name) {
		if (!_this2.called(name)) {
			console.warn('Warning: ' + name + ' not called');
			return false;
		}
		// would use array.find... but again not so widely supported
		var expectedTimes = (_this2.routes.filter(function (r) {
			return r.name === name;
		}) || [{}])[0].times;

		if (!expectedTimes) {
			return true;
		}

		var actualTimes = _this2.calls(name).length;
		if (expectedTimes > actualTimes) {
			console.warn('Warning: ' + name + ' only called ' + actualTimes + ' times, but ' + expectedTimes + ' expected');
			return false;
		} else {
			return true;
		}
	}).filter(function (bool) {
		return !bool;
	}).length === 0;
};

FetchMock.config = {
	sendAsJson: true
};

FetchMock.prototype.configure = function (opts) {
	_extends$1(FetchMock.config, opts);
};

FetchMock.setImplementations = FetchMock.prototype.setImplementations = function (implementations) {
	FetchMock.Headers = implementations.Headers || FetchMock.Headers;
	FetchMock.Request = implementations.Request || FetchMock.Request;
	FetchMock.Response = implementations.Response || FetchMock.Response;
	FetchMock.Promise = implementations.Promise || FetchMock.Promise;
};

FetchMock.prototype.sandbox = function (Promise) {
	if (this.routes.length || this.fallbackResponse) {
		throw new Error('.sandbox() can only be called on fetch-mock instances that don\'t have routes configured already');
	}
	var instance = new FetchMock();

	// this construct allows us to create a fetch-mock instance which is also
	// a callable function, while circumventing circularity when defining the
	// object that this function should be bound to
	var boundMock = void 0;
	var proxy = function proxy() {
		return boundMock.apply(null, arguments);
	};

	var functionInstance = _extends$1(proxy, // Ensures that the entire returned object is a callable function
	FetchMock.prototype, // all prototype methods
	instance // instance data
	);
	functionInstance.bindMethods();
	boundMock = functionInstance.fetchMock;
	functionInstance.isSandbox = true;
	if (Promise) {
		functionInstance.Promise = Promise;
	}

	return functionInstance;
};

['get', 'post', 'put', 'delete', 'head', 'patch'].forEach(function (method) {
	FetchMock.prototype[method] = function (matcher, response, options) {
		return this.mock(matcher, response, _extends$1({}, options, { method: method.toUpperCase() }));
	};
	FetchMock.prototype[method + 'Once'] = function (matcher, response, options) {
		return this.once(matcher, response, _extends$1({}, options, { method: method.toUpperCase() }));
	};
});

var fetchMock$1 = FetchMock;

var statusTextMap = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',
  '208': 'Already Reported',
  '226': 'IM Used',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '414': 'URI Too Long',
  '415': 'Unsupported Media Type',
  '416': 'Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': 'I\'m a teapot',
  '421': 'Misdirected Request',
  '422': 'Unprocessable Entity',
  '423': 'Locked',
  '424': 'Failed Dependency',
  '425': 'Unordered Collection',
  '426': 'Upgrade Required',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '431': 'Request Header Fields Too Large',
  '451': 'Unavailable For Legal Reasons',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  '505': 'HTTP Version Not Supported',
  '506': 'Variant Also Negotiates',
  '507': 'Insufficient Storage',
  '508': 'Loop Detected',
  '509': 'Bandwidth Limit Exceeded',
  '510': 'Not Extended',
  '511': 'Network Authentication Required'
};

var statusText = statusTextMap;

var theGlobal = typeof window !== 'undefined' ? window : self;

fetchMock$1.global = theGlobal;
fetchMock$1.statusTextMap = statusText;

fetchMock$1.setImplementations({
	Promise: theGlobal.Promise,
	Request: theGlobal.Request,
	Response: theGlobal.Response,
	Headers: theGlobal.Headers
});

var client = new fetchMock$1();

var _class$4;
var _descriptor$2;

function _initDefineProp$2(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$5(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

function KeyValueTheme() {
    return {
        item: {
            display: 'flex'
        },
        key: {
            width: '20%'
        },
        value: {
            width: '80%'
        }
    };
}
KeyValueTheme.theme = true;

function KeyView(_ref, _ref2) {
    var children = _ref.children;
    var theme = _ref2.theme;

    return lom_h(
        'div',
        { className: theme.key },
        children
    );
}
KeyView.deps = [{ theme: KeyValueTheme }];

function ValueView(_ref3, _ref4) {
    var children = _ref3.children;
    var theme = _ref4.theme;

    return lom_h(
        'div',
        { className: theme.value },
        children
    );
}
ValueView.deps = [{ theme: KeyValueTheme }];

function ItemView(_ref5, _ref6) {
    var children = _ref5.children;
    var theme = _ref6.theme;

    return lom_h(
        'div',
        { className: theme.item },
        children
    );
}
ItemView.deps = [{ theme: KeyValueTheme }];
ItemView.Key = KeyView;
ItemView.Value = ValueView;

var Locale = (_class$4 = function () {
    createClass(Locale, [{
        key: 'lang',
        get: function get$$1() {
            var _this = this;

            setTimeout(function () {
                _this.$.lang = 'gb';
            }, 400);

            return this._defaultLang;
        },
        set: function set$$1(lang) {}
    }]);

    function Locale(lang) {
        classCallCheck(this, Locale);

        _initDefineProp$2(this, '$', _descriptor$2, this);

        this._defaultLang = lang;
    }

    return Locale;
}(), (_descriptor$2 = _applyDecoratedDescriptor$5(_class$4.prototype, '$', [force], {
    enumerable: true,
    initializer: null
}), _applyDecoratedDescriptor$5(_class$4.prototype, 'lang', [mem], Object.getOwnPropertyDescriptor(_class$4.prototype, 'lang'), _class$4.prototype), _applyDecoratedDescriptor$5(_class$4.prototype, 'lang', [mem], Object.getOwnPropertyDescriptor(_class$4.prototype, 'lang'), _class$4.prototype)), _class$4);

var BrowserLocalStorage = function () {
    function BrowserLocalStorage(storage, key) {
        classCallCheck(this, BrowserLocalStorage);

        this._storage = storage;
        this._key = key;
    }

    BrowserLocalStorage.prototype.get = function get$$1() {
        var value = this._storage.getItem(this._key);
        return !value ? null : JSON.parse(value || '');
    };

    BrowserLocalStorage.prototype.set = function set$$1(value) {
        this._storage.setItem(this._key, JSON.stringify(value));
    };

    BrowserLocalStorage.prototype.clear = function clear() {
        this._storage.removeItem(this._key);
    };

    BrowserLocalStorage.prototype.clearAll = function clearAll() {
        this._storage.clear();
    };

    return BrowserLocalStorage;
}();

function delayed(v, delay) {
    return function resp(url, params) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve(v);
            }, delay);
        });
    };
}

function mockFetch(storage) {
    var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 500;
    var mocks = arguments[2];

    mocks.forEach(function (createMock) {
        createMock(storage).forEach(function (data) {
            client.mock(Object.assign({}, data, { response: delayed(data.response, delay) }));
        });
    });
}

var _class$3;
var _descriptor$1;
var _class4;
var _descriptor2$1;
var _class5;
var _temp;
var _class6;
var _temp2;

function _initDefineProp$1(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$4(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var Hello = (_class$3 = function Hello() {
    classCallCheck(this, Hello);

    _initDefineProp$1(this, 'name', _descriptor$1, this);
}, (_descriptor$1 = _applyDecoratedDescriptor$4(_class$3.prototype, 'name', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return 'test';
    }
})), _class$3);

var HelloProps = function HelloProps() {
    classCallCheck(this, HelloProps);
};

var HelloOptions = (_class4 = (_temp = _class5 = function HelloOptions(_ref) {
    var name = _ref.name;
    classCallCheck(this, HelloOptions);

    _initDefineProp$1(this, 'actionName', _descriptor2$1, this);

    this.actionName = name + '-hello';
}, _class5.deps = [HelloProps], _temp), (_descriptor2$1 = _applyDecoratedDescriptor$4(_class4.prototype, 'actionName', [mem], {
    enumerable: true,
    initializer: null
})), _class4);
var SomeService = (_temp2 = _class6 = function () {
    function SomeService(opts) {
        classCallCheck(this, SomeService);

        this._opts = opts;
    }

    SomeService.prototype.value = function value() {
        return this._opts.actionName + '-srv';
    };

    return SomeService;
}(), _class6.deps = [HelloOptions], _temp2);


function HelloView(_ref2, _ref3) {
    var hello = _ref2.hello;
    var options = _ref3.options,
        locale = _ref3.locale,
        service = _ref3.service;

    return lom_h(
        'div',
        null,
        lom_h(
            'h3',
            null,
            options.actionName,
            ', ',
            hello.name
        ),
        lom_h(
            ItemView,
            null,
            lom_h(
                ItemView.Key,
                null,
                'Lang:'
            ),
            lom_h(
                ItemView.Value,
                null,
                locale.lang
            )
        ),
        lom_h(
            ItemView,
            null,
            lom_h(
                ItemView.Key,
                null,
                'Srv:'
            ),
            lom_h(
                ItemView.Value,
                null,
                service.value()
            )
        ),
        lom_h(
            ItemView,
            null,
            lom_h(
                ItemView.Key,
                null,
                'Name:'
            ),
            lom_h(
                ItemView.Value,
                null,
                lom_h('input', { value: hello.name, onInput: function onInput(_ref4) {
                        var target = _ref4.target;

                        hello.name = target.value;
                    } })
            )
        ),
        lom_h(
            ItemView,
            null,
            lom_h(
                ItemView.Key,
                null,
                'Action:'
            ),
            lom_h(
                ItemView.Value,
                null,
                lom_h('input', { value: options.actionName, onInput: function onInput(_ref5) {
                        var target = _ref5.target;

                        options.actionName = target.value;
                    } })
            )
        )
    );
}

HelloView.deps = [{ options: HelloOptions, locale: Locale, service: SomeService }];
HelloView.props = HelloProps;

// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = commonjsGlobal.crypto || commonjsGlobal.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

var rngBrowser = rng;

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

var bytesToUuid_1 = bytesToUuid;

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rngBrowser)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid_1(rnds);
}

var v4_1 = v4;

function getBody(body) {
    return typeof body === 'string' ? JSON.parse(body) : body || {};
}

function sortByDate(el1, el2) {
    if (!el2.created || el1.created) {
        return 0;
    }

    if (String(el1.created) > String(el2.created)) {
        return 1;
    }
    if (String(el1.created) < String(el2.created)) {
        return -1;
    }
    return 0;
}

function todoMocks(rawStorage) {
    var storage = new BrowserLocalStorage(rawStorage, 'lom_todomvc');
    var defaultTodos = [{
        id: 't1',
        title: 'test todo #1',
        completed: false
    }, {
        id: 't2',
        title: 'test todo #2',
        completed: true
    }];

    return [{
        method: 'GET',
        matcher: new RegExp('/api/todos'),
        response: function response(url, params) {
            // eslint-disable-line
            var newTodos = storage.get();
            if (!newTodos) {
                newTodos = defaultTodos;
                storage.set(newTodos);
            }
            return newTodos.sort(sortByDate);
        }
    }, {
        method: 'PUT',
        matcher: new RegExp('/api/todos'),
        response: function response(url, params) {
            // eslint-disable-line
            var data = storage.get();
            var todos = data || defaultTodos;
            var updates = new Map(getBody(params.body));

            var newTodos = todos.map(function (todo) {
                return updates.has(todo.id) ? todo : Object.assign({}, todo, updates.get(todo.id));
            }).sort(sortByDate);
            storage.set(newTodos);

            return newTodos;
        }
    }, {
        method: 'DELETE',
        matcher: new RegExp('/api/todos'),
        response: function response(url, params) {
            // eslint-disable-line
            var data = storage.get();
            var todos = data || defaultTodos;
            var ids = getBody(params.body);
            var newTodos = todos.filter(function (todo) {
                return ids.indexOf(todo.id) === -1;
            });
            storage.set(newTodos);

            return newTodos.map(function (_ref) {
                var id = _ref.id;
                return id;
            });
        }
    }, {
        method: 'DELETE',
        matcher: new RegExp('/api/todo/(.*)'),
        response: function response(url, params) {
            // eslint-disable-line
            var data = storage.get();
            var todos = data || [];
            var id = url.match(new RegExp('/api/todo/(.+)'))[1];
            var newTodos = todos.filter(function (todo) {
                return todo.id !== id;
            });
            storage.set(newTodos.sort(sortByDate));

            return { id: id };
        }
    }, {
        method: 'POST',
        matcher: new RegExp('/api/todo/(.*)'),
        response: function response(url, params) {
            // eslint-disable-line
            var data = storage.get();
            var id = url.match(new RegExp('/api/todo/(.+)'))[1];
            var newTodo = getBody(params.body);
            var newTodos = (data || []).map(function (todo) {
                return todo.id === id ? newTodo : todo;
            });
            storage.set(newTodos);

            return newTodo;
        }
    }, {
        method: 'PUT',
        matcher: new RegExp('/api/todo'),
        response: function response(url, params) {
            // eslint-disable-line
            var todos = storage.get();
            var body = getBody(params.body);
            var newTodo = Object.assign({}, body, {
                id: v4_1()
            });
            todos.push(newTodo);
            storage.set(todos);

            return newTodo;
        }
    }];
}

var _class2;
var _descriptor$3;

function _initDefineProp$3(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$6(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

function toJson(r) {
    return r.json();
}

var TodoModel = function () {
    function TodoModel() {
        var todo = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var store = arguments[1];
        classCallCheck(this, TodoModel);

        this._title = todo.title || '';
        this.id = todo.id || v4_1();
        this.completed = todo.completed || false;
        this._store = store;
    }

    TodoModel.prototype.destroy = function destroy() {
        this._store.remove(this.id);
    };

    TodoModel.prototype.toggle = function toggle() {
        this.completed = !this.completed;
        this._store.saveTodo(this.toJSON());
    };

    TodoModel.prototype.toJSON = function toJSON() {
        return {
            completed: this.completed,
            title: this._title,
            id: this.id
        };
    };

    createClass(TodoModel, [{
        key: 'title',
        get: function get$$1() {
            return this._title;
        },
        set: function set$$1(t) {
            this._title = t;
            this._store.saveTodo(this.toJSON());
        }
    }]);
    return TodoModel;
}();

var TodoStore = (_class2 = function () {
    function TodoStore() {
        classCallCheck(this, TodoStore);

        _initDefineProp$3(this, 'opCount', _descriptor$3, this);
    }

    TodoStore.prototype._handlePromise = function _handlePromise(p) {
        var _this = this;

        this.opCount++;
        return p.then(function () {
            _this.opCount--;
        }).catch(function (e) {
            _this.opCount--;
            _this.todos = e;
        });
    };

    TodoStore.prototype.addTodo = function addTodo(title) {
        var _this2 = this;

        var todo = new TodoModel({ title: title }, this);
        this.todos = this.todos.concat([todo]);
        this._handlePromise(fetch('/api/todo', {
            method: 'PUT',
            body: JSON.stringify(todo)
        }).then(toJson).then(function (updatedTodo) {
            _this2.todos = _this2.todos.map(function (t) {
                return t.id === todo.id ? new TodoModel(updatedTodo, _this2) : t;
            });
        }));
    };

    TodoStore.prototype.saveTodo = function saveTodo(todo) {
        var _this3 = this;

        this.todos = this.todos.map(function (t) {
            return t.id === todo.id ? new TodoModel(todo, _this3) : t;
        });
        this._handlePromise(fetch('/api/todo/' + todo.id, {
            method: 'POST',
            body: JSON.stringify(todo)
        }).then(toJson).then(function (updatedTodo) {
            _this3.todos = _this3.todos.map(function (t) {
                return t.id === todo.id ? new TodoModel(updatedTodo, _this3) : t;
            });
        }));
    };

    TodoStore.prototype.remove = function remove(id) {
        this.todos = this.todos.filter(function (todo) {
            return todo.id !== id;
        });

        this._handlePromise(fetch('/api/todo/' + id, {
            method: 'DELETE'
        }));
    };

    TodoStore.prototype.toggleAll = function toggleAll(completed) {
        var _this4 = this;

        this.todos = this.todos.map(function (todo) {
            return new TodoModel({
                title: todo.title,
                id: todo.id,
                completed: completed
            }, _this4);
        });

        this._handlePromise(fetch('/api/todos', {
            method: 'PUT',
            body: JSON.stringify(this.todos.map(function (todo) {
                return [todo.id, { completed: completed }];
            }))
        }));
    };

    TodoStore.prototype.clearCompleted = function clearCompleted() {
        var newTodos = [];
        var delIds = [];
        for (var i = 0; i < this.todos.length; i++) {
            var todo = this.todos[i];
            if (todo.completed) {
                delIds.push(todo.id);
            } else {
                newTodos.push(todo);
            }
        }
        this.todos = newTodos;

        this._handlePromise(fetch('/api/todos', {
            method: 'DELETE',
            body: JSON.stringify(delIds)
        }));
    };

    createClass(TodoStore, [{
        key: 'isOperationRunning',
        get: function get$$1() {
            return this.opCount !== 0;
        }
    }, {
        key: 'todos',
        get: function get$$1() {
            var _this5 = this;

            fetch('/api/todos', {
                method: 'GET'
            }).then(toJson).then(function (todos) {
                _this5.todos = todos.map(function (todo) {
                    return new TodoModel(todo, _this5);
                });
            }).catch(function (e) {
                _this5.todos = e;
            });
            throw new AtomWait();
        },
        set: function set$$1(todos) {}
    }, {
        key: 'activeTodoCount',
        get: function get$$1() {
            return this.todos.reduce(function (sum, todo) {
                return sum + (todo.completed ? 0 : 1);
            }, 0);
        }
    }, {
        key: 'completedCount',
        get: function get$$1() {
            return this.todos.length - this.activeTodoCount;
        }
    }]);
    return TodoStore;
}(), (_descriptor$3 = _applyDecoratedDescriptor$6(_class2.prototype, 'opCount', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return 0;
    }
}), _applyDecoratedDescriptor$6(_class2.prototype, 'todos', [mem], Object.getOwnPropertyDescriptor(_class2.prototype, 'todos'), _class2.prototype), _applyDecoratedDescriptor$6(_class2.prototype, 'todos', [mem], Object.getOwnPropertyDescriptor(_class2.prototype, 'todos'), _class2.prototype), _applyDecoratedDescriptor$6(_class2.prototype, 'activeTodoCount', [mem], Object.getOwnPropertyDescriptor(_class2.prototype, 'activeTodoCount'), _class2.prototype)), _class2);

var _class$5;
var _class2$1;
var _temp$1;

function _applyDecoratedDescriptor$7(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var TODO_FILTER = {
    ALL: 'all',
    COMPLETE: 'complete',
    ACTIVE: 'active'
};

var ViewStore = (_class$5 = (_temp$1 = _class2$1 = function () {
    function ViewStore(todoStore) {
        classCallCheck(this, ViewStore);

        this._todoStore = todoStore;
    }

    createClass(ViewStore, [{
        key: 'filter',
        get: function get$$1() {
            var params = new URLSearchParams(location.search);
            var filter = params.get('todo_filter') || TODO_FILTER.ALL;

            return filter;
        },
        set: function set$$1(filter) {
            history.pushState(null, filter, '?todo_filter=' + filter);
        }
    }, {
        key: 'filteredTodos',
        get: function get$$1() {
            var todos = this._todoStore.todos;
            switch (this.filter) {
                case TODO_FILTER.ALL:
                    return todos;
                case TODO_FILTER.COMPLETE:
                    return todos.filter(function (todo) {
                        return !!todo.completed;
                    });
                case TODO_FILTER.ACTIVE:
                    return todos.filter(function (todo) {
                        return !todo.completed;
                    });
                default:
                    throw new Error('Unknown filter value: ' + this.filter);
            }
        }
    }]);
    return ViewStore;
}(), _class2$1.deps = [TodoStore], _temp$1), (_applyDecoratedDescriptor$7(_class$5.prototype, 'filter', [mem], Object.getOwnPropertyDescriptor(_class$5.prototype, 'filter'), _class$5.prototype), _applyDecoratedDescriptor$7(_class$5.prototype, 'filter', [mem], Object.getOwnPropertyDescriptor(_class$5.prototype, 'filter'), _class$5.prototype), _applyDecoratedDescriptor$7(_class$5.prototype, 'filteredTodos', [mem], Object.getOwnPropertyDescriptor(_class$5.prototype, 'filteredTodos'), _class$5.prototype)), _class$5);

var _class2$2;
var _descriptor$4;
var _class3;
var _temp$2;

function _initDefineProp$4(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$8(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var TodoEntryProps = function TodoEntryProps() {
    classCallCheck(this, TodoEntryProps);
};

var TodoToAdd = (_class2$2 = (_temp$2 = _class3 = function TodoToAdd(_ref) {
    var _this = this;

    var todoStore = _ref.todoStore;
    classCallCheck(this, TodoToAdd);

    _initDefineProp$4(this, 'title', _descriptor$4, this);

    this.onChange = function (_ref2) {
        var target = _ref2.target;

        _this.title = target.value;
    };

    this.onKeyDown = function (e) {
        if (e.keyCode === 13 && _this.title) {
            _this._store.addTodo(_this.title);
            _this.title = '';
        }
    };

    this._store = todoStore;
}, _class3.deps = [TodoEntryProps], _temp$2), (_descriptor$4 = _applyDecoratedDescriptor$8(_class2$2.prototype, 'title', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return '';
    }
})), _class2$2);


function TodoEntryTheme() {
    var _newTodo;

    return {
        newTodo: (_newTodo = {
            position: 'relative',
            margin: '0',
            width: '100%',
            fontSize: '24px',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            lineHeight: '1.4em',
            border: '0',
            color: 'inherit',
            padding: '16px 16px 16px 60px'
        }, _newTodo['border'] = 'none', _newTodo.background = 'rgba(0, 0, 0, 0.003)', _newTodo.boxShadow = 'inset 0 -2px 1px rgba(0,0,0,0.03)', _newTodo.boxSizing = 'border-box', _newTodo['-webkit-font-smoothing'] = 'antialiased', _newTodo['-moz-osx-font-smoothing'] = 'grayscale', _newTodo)
    };
}
TodoEntryTheme.theme = true;

function TodoEntry(_, _ref3) {
    var todoToAdd = _ref3.todoToAdd,
        theme = _ref3.theme;

    return lom_h('input', {
        className: theme.newTodo,
        placeholder: 'What needs to be done?',
        onChange: todoToAdd.onChange,
        value: todoToAdd.title,
        onKeyDown: todoToAdd.onKeyDown,
        autoFocus: true
    });
}
TodoEntry.deps = [{ todoToAdd: TodoToAdd, theme: TodoEntryTheme }];
TodoEntry.props = TodoEntryProps;

var _class2$3;
var _descriptor$5;
var _descriptor2$2;
var _class3$1;
var _temp$3;

function _initDefineProp$5(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$9(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var ESCAPE_KEY = 27;
var ENTER_KEY = 13;

var TodoProps = function TodoProps() {
    classCallCheck(this, TodoProps);
};

var TodoItemStore = (_class2$3 = (_temp$3 = _class3$1 = function TodoItemStore(_ref) {
    var _this = this;

    var todo = _ref.todo;
    classCallCheck(this, TodoItemStore);

    _initDefineProp$5(this, 'todoBeingEdited', _descriptor$5, this);

    _initDefineProp$5(this, 'editText', _descriptor2$2, this);

    this.beginEdit = function () {
        _this.todoBeingEdited = _this._todo;
        _this.editText = _this._todo.title;
    };

    this.setText = function (_ref2) {
        var target = _ref2.target;

        _this.editText = target.value;
    };

    this._focused = false;

    this.setEditInputRef = function (el) {
        if (el && !_this._focused) {
            _this._focused = true;
            el.focus();
        }
    };

    this.handleSubmit = function (event) {
        var val = _this.editText.trim();
        if (val) {
            _this._todo.title = val;
            _this.editText = '';
        } else {
            _this.handleDestroy();
        }
        _this.todoBeingEdited = null;
    };

    this.handleKeyDown = function (event) {
        if (event.which === ESCAPE_KEY) {
            _this.editText = _this._todo.title;
            _this.todoBeingEdited = null;
        } else if (event.which === ENTER_KEY) {
            _this.handleSubmit(event);
        }
    };

    this.toggle = function () {
        _this._todo.toggle();
        _this.todoBeingEdited = null;
    };

    this.handleDestroy = function () {
        _this._todo.destroy();
        _this.todoBeingEdited = null;
    };

    this._todo = todo;
}, _class3$1.deps = [TodoProps], _temp$3), (_descriptor$5 = _applyDecoratedDescriptor$9(_class2$3.prototype, 'todoBeingEdited', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return null;
    }
}), _descriptor2$2 = _applyDecoratedDescriptor$9(_class2$3.prototype, 'editText', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return '';
    }
})), _class2$3);


function TodoItemTheme() {
    var itemBase = {
        position: 'relative',
        fontSize: '24px',
        borderBottom: '1px solid #ededed',
        '&:last-child': {
            borderBottom: 'none'
        },
        '&:hover $destroy': {
            display: 'block'
        }
    };

    var viewLabelBase = {
        wordBreak: 'break-all',
        padding: '15px 15px 15px 60px',
        display: 'block',
        lineHeight: '1.2',
        transition: 'color 0.4s'
    };

    return {
        regular: Object.assign({}, itemBase),
        completed: Object.assign({}, itemBase),

        editing: {
            borderBottom: 'none',
            padding: 0,
            '&:last-child': {
                marginBottom: '-1px'
            }
        },

        edit: {
            backgroundColor: '#F2FFAB',
            display: 'block',
            border: 0,
            position: 'relative',
            fontSize: '24px',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            lineHeight: '1.4em',
            width: '406px',
            padding: '12px 16px',
            margin: '0 0 0 43px'
        },

        toggle: {
            textAlign: 'center',
            width: '40px',
            /* auto, since non-WebKit browsers doesn't support input styling */
            height: 'auto',
            position: 'absolute',
            top: 0,
            bottom: 0,
            margin: 'auto 0',
            border: 'none', /* Mobile Safari */
            '-webkit-appearance': 'none',
            appearance: 'none',
            opacity: 0,
            '& + label': {
                /*
                    Firefox requires `#` to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433
                    IE and Edge requires *everything* to be escaped to render, so we do that instead of just the `#` - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/
                */
                backgroundImage: 'url(\'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E\')',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center left'
            },

            '&:checked + label': {
                backgroundImage: 'url(\'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E\')'
            }
        },

        viewLabelRegular: Object.assign({}, viewLabelBase),

        viewLabelCompleted: Object.assign({}, viewLabelBase, {
            color: '#d9d9d9',
            textDecoration: 'line-through'
        }),

        destroy: {
            padding: 0,
            border: 0,
            background: 'none',
            verticalAlign: 'baseline',
            display: 'none',
            position: 'absolute',
            right: '10px',
            top: 0,
            bottom: 0,
            width: '40px',
            height: '40px',
            fontSize: '30px',
            margin: 'auto 0',
            color: '#cc9a9a',
            marginBottom: '11px',
            transition: 'color 0.2s ease-out',
            '&:hover': {
                color: '#af5b5e'
            },

            '&:after': {
                content: '\'×\''
            }
        }
    };
}
TodoItemTheme.theme = true;

function TodoItem(_ref3, _ref4) {
    var todo = _ref3.todo;
    var itemStore = _ref4.itemStore,
        theme = _ref4.theme;

    return itemStore.todoBeingEdited === todo ? lom_h(
        'li',
        { className: theme.editing },
        lom_h('input', {
            id: 'edit',
            ref: itemStore.setEditInputRef,
            className: theme.edit,
            value: itemStore.editText,
            onBlur: itemStore.handleSubmit,
            onChange: itemStore.setText,
            onKeyDown: itemStore.handleKeyDown
        })
    ) : lom_h(
        'li',
        { className: todo.completed ? theme.completed : theme.regular },
        lom_h('input', {
            id: 'toggle',
            className: theme.toggle,
            type: 'checkbox',
            checked: todo.completed,
            onChange: itemStore.toggle
        }),
        lom_h(
            'label',
            {
                className: todo.completed ? theme.viewLabelCompleted : theme.viewLabelRegular,
                id: 'beginEdit',
                onDoubleClick: itemStore.beginEdit },
            todo.title
        ),
        lom_h('button', { className: theme.destroy, id: 'destroy', onClick: itemStore.handleDestroy })
    );
}
TodoItem.deps = [{ itemStore: TodoItemStore, theme: TodoItemTheme }];
TodoItem.props = TodoProps;

function TodoOverviewTheme() {
    var toggleAll = {
        outline: 'none',
        position: 'absolute',
        top: '-55px',
        left: '-12px',
        width: '60px',
        height: '34px',
        textAlign: 'center',
        border: 'none', /* Mobile Safari */

        '&:before': {
            content: '\'❯\'',
            fontSize: '22px',
            color: '#e6e6e6',
            padding: '10px 27px 10px 27px'
        },
        '&:checked:before': {
            color: '#737373'
        }
    };

    return {
        main: {
            position: 'relative',
            zIndex: 2,
            borderTop: '1px solid #e6e6e6'
        },
        toggleAll: Object.assign({}, toggleAll),
        todoList: {
            margin: 0,
            padding: 0,
            listStyle: 'none'
        },

        /*
        Hack to remove background from Mobile Safari.
        Can't use it globally since it destroys checkboxes in Firefox
        */
        '@media screen and (-webkit-min-device-pixel-ratio:0)': {
            toggleAll: Object.assign({}, toggleAll, {
                transform: 'rotate(90deg)',
                appearance: 'none',
                '-webkit-appearance': 'none'
            })
        }
    };
}
TodoOverviewTheme.theme = true;

function TodoOverview(_ref, _ref2) {
    var todoStore = _ref.todoStore,
        viewStore = _ref.viewStore;
    var theme = _ref2.theme;

    if (!todoStore.todos.length) {
        return null;
    }

    return lom_h(
        'section',
        { className: theme.main },
        lom_h('input', {
            className: theme.toggleAll,
            type: 'checkbox',
            onChange: function onChange(_ref3) {
                var target = _ref3.target;
                return todoStore.toggleAll(target.checked);
            },
            checked: todoStore.activeTodoCount === 0
        }),
        lom_h(
            'ul',
            { className: theme.todoList },
            viewStore.filteredTodos.map(function (todo) {
                return lom_h(TodoItem, {
                    key: todo.id,
                    todo: todo,
                    viewStore: viewStore
                });
            })
        )
    );
}
TodoOverview.deps = [{ theme: TodoOverviewTheme }];

var links = [{
    id: TODO_FILTER.ALL,
    title: 'All'
}, {
    id: TODO_FILTER.ACTIVE,
    title: 'Active'
}, {
    id: TODO_FILTER.COMPLETE,
    title: 'Completed'
}];

function createHandler(viewStore, id) {
    return function handler(e) {
        e.preventDefault();
        viewStore.filter = id;
    };
}

function TodoFooterTheme() {
    var linkBase = {
        color: 'inherit',
        margin: '3px',
        padding: '3px 7px',
        textDecoration: 'none',
        border: '1px solid transparent',
        borderRadius: '3px',
        '& :hover': {
            borderColor: 'rgba(175, 47, 47, 0.1)'
        }
    };

    return {
        footer: {
            color: '#777',
            padding: '10px 15px',
            height: '20px',
            textAlign: 'center',
            borderTop: '1px solid #e6e6e6',
            '&:before': {
                content: '\'\'',
                position: 'absolute',
                right: '0',
                bottom: '0',
                left: '0',
                height: '50px',
                overflow: 'hidden',
                boxShadow: '0 1px 1px rgba(0, 0, 0, 0.2),\n                    0 8px 0 -3px #f6f6f6,\n                    0 9px 1px -3px rgba(0, 0, 0, 0.2),\n                    0 16px 0 -6px #f6f6f6,\n                    0 17px 2px -6px rgba(0, 0, 0, 0.2)'
            }
        },

        todoCount: {
            float: 'left',
            textAlign: 'left'
        },

        filters: {
            margin: 0,
            padding: 0,
            listStyle: 'none',
            position: 'absolute',
            right: 0,
            left: 0
        },

        filterItem: {
            display: 'inline'
        },

        linkRegular: Object.assign({}, linkBase),

        linkSelected: Object.assign({}, linkBase, {
            borderColor: 'rgba(175, 47, 47, 0.2)'
        }),

        clearCompleted: {
            margin: 0,
            padding: 0,
            border: 0,
            background: 'none',
            fontSize: '100%',
            verticalAlign: 'baseline',
            appearance: 'none',

            float: 'right',
            position: 'relative',
            lineHeight: '20px',
            textDecoration: 'none',
            cursor: 'pointer',

            '&:hover': {
                textDecoration: 'underline'
            }
        }
    };
}
TodoFooterTheme.theme = true;

function TodoFooter(_ref, _ref2) {
    var todoStore = _ref.todoStore,
        viewStore = _ref.viewStore;
    var theme = _ref2.theme;

    if (!todoStore.activeTodoCount && !todoStore.completedCount) {
        return null;
    }
    var filter = viewStore.filter;

    return lom_h(
        'footer',
        { className: theme.footer },
        lom_h(
            'span',
            { className: theme.todoCount },
            lom_h(
                'strong',
                null,
                todoStore.activeTodoCount
            ),
            ' item(s) left'
        ),
        lom_h(
            'ul',
            { className: theme.filters },
            links.map(function (link) {
                return lom_h(
                    'li',
                    { key: link.id, className: theme.filterItem },
                    lom_h(
                        'a',
                        {
                            id: 'todo-filter-' + link.id,
                            className: filter === link.id ? theme.linkSelected : theme.linkRegular,
                            href: '?todo_filter=' + link.id,
                            onClick: createHandler(viewStore, link.id)
                        },
                        link.title
                    )
                );
            })
        ),
        todoStore.completedCount === 0 ? null : lom_h(
            'button',
            {
                className: theme.clearCompleted,
                onClick: function onClick() {
                    return todoStore.clearCompleted();
                } },
            'Clear completed'
        )
    );
}
TodoFooter.deps = [{ theme: TodoFooterTheme }];

function TodoAppTheme() {
    return {
        todoapp: {
            background: '#fff',
            position: 'relative',
            border: '1px solid #ededed',
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1)'
        },

        '@global': {
            ':focus': {
                outline: 0
            },
            html: {
                margin: 0,
                padding: 0
            },
            body: {
                font: '14px "Helvetica Neue", Helvetica, Arial, sans-serif',
                lineHeight: '1.4em',
                background: '#f5f5f5',
                color: '#4d4d4d',
                minWidth: '230px',
                maxWidth: '550px',
                margin: '0 auto',
                padding: 0,
                '-webkit-font-smoothing': 'antialiased',
                '-moz-osx-font-smoothing': 'grayscale',
                fontWeight: '300'
            }
        }
    };
}
TodoAppTheme.theme = true;

function TodoApp(_ref, _ref2) {
    var todoStore = _ref2.todoStore,
        viewStore = _ref2.viewStore,
        theme = _ref2.theme;
    objectDestructuringEmpty(_ref);

    return lom_h(
        'div',
        null,
        todoStore.activeTodoCount > 0 ? null : null,
        lom_h(
            'div',
            { style: { padding: '0.3em 0.5em' } },
            todoStore.isOperationRunning ? 'Saving...' : 'Idle'
        ),
        lom_h(
            'div',
            { className: theme.todoapp },
            lom_h(
                'header',
                null,
                lom_h(TodoEntry, { todoStore: todoStore })
            ),
            lom_h(TodoOverview, { todoStore: todoStore, viewStore: viewStore }),
            lom_h(TodoFooter, { todoStore: todoStore, viewStore: viewStore })
        )
    );
}

TodoApp.deps = [{ todoStore: TodoStore, viewStore: ViewStore, theme: TodoAppTheme }];

var _class2$4;
var _descriptor$6;
var _class3$2;
var _temp$4;

function _initDefineProp$6(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor$10(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var AutocompleteProps = function AutocompleteProps() {
    classCallCheck(this, AutocompleteProps);
};

var AutocompleteService = (_class2$4 = (_temp$4 = _class3$2 = function () {
    createClass(AutocompleteService, [{
        key: '$',
        get: function get$$1() {
            return this;
        }
    }]);

    function AutocompleteService(_ref) {
        var _this = this;

        var initialValue = _ref.initialValue;
        classCallCheck(this, AutocompleteService);

        _initDefineProp$6(this, 'nameToSearch', _descriptor$6, this);

        this._handler = 0;

        this.setValue = function (e) {
            _this.nameToSearch = e.target.value;
        };

        this.nameToSearch = initialValue;
    }

    AutocompleteService.prototype._destroy = function _destroy() {
        clearTimeout(this._handler);
    };

    createClass(AutocompleteService, [{
        key: 'searchResults',
        get: function get$$1() {
            var _this2 = this;

            clearTimeout(this._handler);
            var name = this.nameToSearch;
            this._handler = setTimeout(function () {
                fetch('/api/autocomplete?q=' + name).then(function (r) {
                    return r.json();
                }).then(function (data) {
                    _this2.$.searchResults = data;
                }).catch(function (e) {
                    _this2.$.searchResults = e;
                });
            }, 500);

            throw new AtomWait();
        },
        set: function set$$1(searchResults) {}
    }]);
    return AutocompleteService;
}(), _class3$2.deps = [AutocompleteProps], _temp$4), (_descriptor$6 = _applyDecoratedDescriptor$10(_class2$4.prototype, 'nameToSearch', [mem], {
    enumerable: true,
    initializer: null
}), _applyDecoratedDescriptor$10(_class2$4.prototype, '$', [force], Object.getOwnPropertyDescriptor(_class2$4.prototype, '$'), _class2$4.prototype), _applyDecoratedDescriptor$10(_class2$4.prototype, 'searchResults', [mem], Object.getOwnPropertyDescriptor(_class2$4.prototype, 'searchResults'), _class2$4.prototype), _applyDecoratedDescriptor$10(_class2$4.prototype, 'searchResults', [mem], Object.getOwnPropertyDescriptor(_class2$4.prototype, 'searchResults'), _class2$4.prototype)), _class2$4);


function AutocompleteResultsView(_ref2) {
    var searchResults = _ref2.searchResults;

    return lom_h(
        'ul',
        null,
        searchResults.map(function (result, i) {
            return lom_h(
                'li',
                { key: result + i },
                result
            );
        })
    );
}

function AutocompleteView(_, _ref3) {
    var service = _ref3.service;

    return lom_h(
        'div',
        null,
        lom_h(
            'div',
            null,
            'Filter:',
            lom_h('input', { value: service.nameToSearch, onInput: service.setValue })
        ),
        'Values:',
        lom_h(AutocompleteResultsView, { searchResults: service.searchResults })
    );
}
AutocompleteView.deps = [{ service: AutocompleteService }];
AutocompleteView.props = AutocompleteProps;

function autocompleteMocks(rawStorage) {
    var fixture = ['John Doe', 'Vasia Pupkin'];

    return [{
        method: 'GET',
        matcher: new RegExp('/api/autocomplete'),
        response: function response(url, params) {
            // eslint-disable-line
            var names = url.match(new RegExp('/api/autocomplete\\?q=(.+)'));
            var name = names && names.length ? names[1] : '';

            return name ? fixture.filter(function (userName) {
                return userName.indexOf(name) === 0;
            }) : fixture;
        }
    }];
}

var _class;
var _descriptor;
var _descriptor2;

function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

mockFetch(localStorage, 500, [todoMocks, autocompleteMocks]);

var Store = (_class = function Store() {
    classCallCheck(this, Store);
    this.links = ['hello', 'counter', 'error', 'todomvc', 'autocomplete'];

    _initDefineProp(this, 'route', _descriptor, this);

    _initDefineProp(this, 'name', _descriptor2, this);

    this.counter = new Counter();
    this.hello = new Hello();
}, (_descriptor = _applyDecoratedDescriptor(_class.prototype, 'route', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return 'hello';
    }
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, 'name', [mem], {
    enumerable: true,
    initializer: function initializer() {
        return 'vvv';
    }
})), _class);


function AppView(_ref) {
    var store = _ref.store;

    var page = void 0;
    switch (store.route) {
        case 'hello':
            page = lom_h(HelloView, { hello: store.hello, name: store.name });
            break;

        case 'counter':
            page = lom_h(CounterView, { counter: store.counter });
            break;

        case 'autocomplete':
            page = lom_h(AutocompleteView, { initialValue: store.name });
            break;

        case 'todomvc':
            page = lom_h(TodoApp, null);
            break;

        default:
            throw new Error('Unknown page');
    }

    return lom_h(
        'div',
        { style: { dislay: 'flex', justifyContent: 'center' } },
        lom_h(
            'div',
            { style: { padding: '1em' } },
            store.links.map(function (link) {
                return lom_h(
                    'button',
                    {
                        key: link,
                        style: { margin: '0.3em' },
                        id: link,
                        onClick: function onClick() {
                            return store.route = link;
                        }
                    },
                    link
                );
            })
        ),
        lom_h(
            'div',
            { style: { border: '1px solid gray', padding: '1em', margin: '0 1em' } },
            lom_h(
                'h1',
                null,
                store.route
            ),
            page
        ),
        lom_h(
            ItemView,
            null,
            lom_h(
                ItemView.Key,
                null,
                'APPName:'
            ),
            lom_h(
                ItemView.Value,
                null,
                lom_h('input', { value: store.name, onInput: function onInput(_ref2) {
                        var target = _ref2.target;

                        store.name = target.value;
                    } })
            )
        )
    );
}
AppView.provide = function (props) {
    return [new Locale(props.lang)];
};

var store = new Store();

render(lom_h(AppView, { store: store, lang: 'ru' }), document.getElementById('app'));

}());
//# sourceMappingURL=examples.js.map
