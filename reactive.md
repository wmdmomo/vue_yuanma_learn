``` js
// 自定义的拦截器，在这里对调用的Map方法进行拦截
var target = new Map()
target.set('type', 'stu')
const interceptors = {
  get(key) {
    //   这个时候 因为用了我们这个interceptors拦截器，
    // Reflect.get(target, propertyKey, receiver) target为interceptors 并且
    // interceptors 里面设置了get 方法，所以这个get方法里面的this指向的就是 receiver 也就是这个proxy创建出来的对象--->map
    console.log(this===map) //true
  },
  set(key, value) {
    console.log(key, value)
  }
}
// 创建代理
const map = new Proxy(target, {
  get(target, key, receiver) {
    // 如果调用的key存在于我们自定义的拦截器里，就用我们的拦截器
    // 意思就是 如果时set 之类的方法是会在map的entries里面的 但是如果是 target['code']=1234 这样子的命名方式的话 它是在跟entries同级下面的
    target = interceptors.hasOwnProperty(key) ? interceptors : target
    return Reflect.get(target, key, receiver)
  }
})
```


```JS

function reactive(target) {
        // if trying to observe a readonly proxy, return the readonly version.
        // 这里的target['__v_isReadonly' /* IS_READONLY */]是什么意思？？
        if (target && target['__v_isReadonly' /* IS_READONLY */]) {
            return target
        }
        return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers,reactiveMap)
    }

const reactiveMap = new WeakMap();
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
      if (!isObject(target)) {
          {
              console.warn(`value cannot be made reactive: ${String(target)}`);
          }
          return target;
      }
      // target is already a Proxy, return it.
      // exception: calling readonly() on a reactive object
      if (target["__v_raw" /* RAW */] &&
          !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
          return target;
      }
      // target already has corresponding Proxy
      const existingProxy = proxyMap.get(target);
      if (existingProxy) {
          return existingProxy;
      }
      // only a whitelist of value types can be observed.
      const targetType = getTargetType(target);
      if (targetType === 0 /* INVALID */) {
          return target;
      }
      const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
      proxyMap.set(target, proxy);
      return proxy;
  }

    function targetTypeMap(rawType) {
      switch (rawType) {
          case 'Object':
          case 'Array':
              return 1 /* COMMON */;
          case 'Map':
          case 'Set':
          case 'WeakMap':
          case 'WeakSet':
              return 2 /* COLLECTION */;
          default:
              return 0 /* INVALID */;
      }
  }
  function getTargetType(value) {
      return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
          ? 0 /* INVALID */
          : targetTypeMap(toRawType(value));
  }
    
    const objectToString = Object.prototype.toString
    const toTypeString = (value) => objectToString.call(value)
    const toRawType = (value) => {
        // 他这里返回的都是[object Set]这样子的形式 
        // 如果是个数字 就是[object Number]
        return toTypeString(value).slice(8, -1)
    }
    
    const def = (obj, key, value) => {
        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: false,
            value
        })
    }

```
###### 关于 ref
```js

    function isRef(r) {
        return r ? r.__v_isRef === true : false
    }
    const convert = (val) => (isObject(val) ? reactive(val) : val)

    class RefImpl {
      constructor(_rawValue, _shallow = false) {
          this._rawValue = _rawValue;
          this._shallow = _shallow;
          this.__v_isRef = true;
          this._value = _shallow ? _rawValue : convert(_rawValue);
      }
      get value() {
          track(toRaw(this), "get" /* GET */, 'value');
          return this._value;
      }
      set value(newVal) {
          if (hasChanged(toRaw(newVal), this._rawValue)) {
              this._rawValue = newVal;
              this._value = this._shallow ? newVal : convert(newVal);
              trigger(toRaw(this), "set" /* SET */, 'value', newVal);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      if (isRef(rawValue)) {
          return rawValue;
      }
      return new RefImpl(rawValue, shallow);
  }

    // 
    function toRaw(observed) {
        return (observed && toRaw(observed['__v_raw' /* RAW */])) || observed
    }

```
```js
    // 在createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers)中
    // 这个 mutableHandlers
    const mutableHandlers = {
        get,
        set,
        deleteProperty,
        has,
        ownKeys
    }
    const get = /*#__PURE__*/ createGetter()
    // 这个get 默认的 isReadonly = false, shallow = false
    // 其中 get 方法就是下面这个方法 createGetter
    // 如果是 shallowReactive  get方法相当于createGetter(isReadonly = false, shallow = true)
    function shallowReactive(target) {
        return createReactiveObject(
            target,
            false,
            shallowReactiveHandlers,
            shallowCollectionHandlers
        )
    }
    const shallowReactiveHandlers = extend({}, mutableHandlers, {
        get: shallowGet,
        set: shallowSet
    })
    const shallowGet = /*#__PURE__*/ createGetter(false, true)
    function createGetter(isReadonly = false, shallow = false) {
        return function get(target, key, receiver) {
            if (key === '__v_isReactive' /* IS_REACTIVE */) {
                return !isReadonly
            } else if (key === '__v_isReadonly' /* IS_READONLY */) {
                return isReadonly
            // key='__v_raw'就是返回他的原始对象
            } else if (
                key === '__v_raw' /* RAW */ &&
                receiver ===
                    (isReadonly
                        ? target['__v_readonly' /* READONLY */]
                        : target['__v_reactive' /* REACTIVE */])
            ) {
                return target
            }
            const targetIsArray = isArray(target)
            if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
                // 处理程序对象中所有可以捕获的方法都有对应的反射（Reflect）API 方法
                return Reflect.get(arrayInstrumentations, key, receiver)
            }
            const res = Reflect.get(target, key, receiver)
            if (
                isSymbol(key) ? builtInSymbols.has(key) : key === `__proto__` || key === `__v_isRef`
            ) {
                return res
            }
            // 意思就是说 如果isReadonly为真 就不会触发这个track事件？？这个track在干嘛？？
            if (!isReadonly) {
                track(target, 'get' /* GET */, key)
            }
            if (shallow) {
                return res
            }
            // 这句话 就是在get的时候我们就不用了为ref 再加上.value了
            if (isRef(res)) {
                // ref unwrapping, only for Objects, not for Arrays.
                return targetIsArray ? res : res.value
            }
            // 对于 这个get的对象 他又做了一遍 proxy
            if (isObject(res)) {
                // Convert returned value into a proxy as well. we do the isObject check
                // here to avoid invalid value warning. Also need to lazy access readonly
                // and reactive here to avoid circular dependency.
                return isReadonly ? readonly(res) : reactive(res)
            }
            return res
        }
    }


    const arrayInstrumentations = {}
    ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
        arrayInstrumentations[key] = function (...args) {
            const arr = toRaw(this)
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, 'get' /* GET */, i + '')
            }
            // we run the method using the original args first (which may be reactive)
            const res = arr[key](...args)
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return arr[key](...args.map(toRaw))
            } else {
                return res
            }
        }
    })
    const set = /*#__PURE__*/ createSetter()
    const shallowSet = /*#__PURE__*/ createSetter(true)
    function createSetter(shallow = false) {
        return function set(target, key, value, receiver) {
            const oldValue = target[key]
            if (!shallow) {
                value = toRaw(value)
                if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                    oldValue.value = value
                    return true
                }
            }
            const hadKey = hasOwn(target, key)
            const result = Reflect.set(target, key, value, receiver)
            // don't trigger if target is something up in the prototype chain of original
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    trigger(target, 'add' /* ADD */, key, value)
                } else if (hasChanged(value, oldValue)) {
                    trigger(target, 'set' /* SET */, key, value, oldValue)
                }
            }
            return result
        }
    }
```

> ```Reactive Readonly``` 都是代理对象 只不过 第二个是值是只读
> 就是说 不能对第二个进行改写操作(会出现警告) 
> 但是shallowReadonly 就是说  他只是浅层只读 如果它的一个属性是对象的话 那么它其实是没有对这个对象进行设置 只读的 所以对这个对象内部的属性进行改写赋值操作是没有问题的
``` js
看这个例子 就是设置了shallowReadonly 但是你对message id 对象内部的属性进行变更是不会报错的
var obj = { name: 'wmd 真棒', id: { age: 12 } }
const message = Vue.shallowReadonly(obj)
message.name = 'wwww' // warn
message.id.ww=34  // ok
message.id=2333  // warn
return {
    message,
    obj
}
```
> 提到 props 里面用的就是这个 shallowReadonly
* ``skip = '__v_skip'`` ``markRaw``  设置为true 时 为不可代理对象
* ``isReactive = '__v_isReactive'``  判断是不是Reactive代理对象
* ``isReadonly = '__v_isReadonly'``  判断是不是Readonly代理对象
* ``raw = '__v_raw'`` ``toRaw``      得到代理对象的原始对象
* ``reactive = '__v_reactive'`` ``reactive``   引用代理对象
* ``readonly = '__v_readonly'`` ``readonly``   引用代理对象

``reactive``响应式数据不能直接解构，会使其失去响应式
可以用``torefs``
<!-- 相当于原本的是个proxy代理，现在就不用了代理了 -->
``` js
    function toRefs(object) {
        if (!isProxy(object)) {
            console.warn(`toRefs() expects a reactive object but received a plain one.`)
        }
        const ret = {}
        for (const key in object) {
            ret[key] = toRef(object, key)
        }
        return ret
    }
    function toRef(object, key) {
        return {
            __v_isRef: true,
            get value() {
                return object[key]
            },
            set value(newVal) {
                object[key] = newVal
            }
        }
    }
```

``` JS
对于 Map,Set,WeakMap,WeakSet 他们的handler是下面这样的
const mutableCollectionHandlers = {
        get: createInstrumentationGetter(false, false)
}
const instrumentations = shallow
            ? shallowInstrumentations
            : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations
// SET MAP用的映射方式是下面这个样子的
return Reflect.get(
      hasOwn(instrumentations, key) && key in target ? instrumentations : target,
      key,
      receiver
)
const mutableInstrumentations = {
        get(key) {
            return get$1(this, key, toReactive)
        },
        get size() {
            return size(this)
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
}
// observed['__v_raw' /* RAW */] 这里的设置是这个样子的
// 返回他的原始对象 其实这个proxy上面是没有这个属性的
// 是我们再源码中定义了set Map类型 get的时候 当key=__v_raw的时候 就返回 target这个对象
// 举个例子 
const message = new Map().set('name','wmd')
const re=Vue.reactive(message)
re.get('name')
就会触发这个get$1 
    function toRaw(observed) {
        return (observed && toRaw(observed['__v_raw' /* RAW */])) || observed
    }
function get$1(target, key, wrap) {
  // toRaw 就是返回原始对象
        target = toRaw(target)
        const rawKey = toRaw(key)
        if (key !== rawKey) {
            track(target, 'get' /* GET */, key)
        }
        track(target, 'get' /* GET */, rawKey)
        const { has, get } = getProto(target)
        if (has.call(target, key)) {
            return wrap(get.call(target, key))
        } else if (has.call(target, rawKey)) {
            return wrap(get.call(target, rawKey))
        }
}

const cnt1 = Vue.ref(5)
const cnt2 = Vue.ref(2)
const res = Vue.computed(() => cnt1.value + cnt2.value)
比如说 我现在是这样子的代码
computed 里面在调用cnt1.value 和 cnt2.value的时候 会触发 ref里面定义的 track 依赖收集
因为创建了computed 所以此时的activeEffect 就是 () => cnt1.value + cnt2.value
那么 ref cnt1 value--->() => cnt1.value + cnt2.value
ref cnt2 value--->() => cnt1.value + cnt2.value

与此同时 被激活的全局effect 内部的dep 里面添加 () => cnt1.value + cnt2.value？？？
并且是添加了两次？？？ cnt1时一次 cnt2时1次
 
  // targetMap对应着每一个target为key(第一个参数) 值
  // 然后 value 值  是一个map
  // 这个map 的key(第三个参数)===>Set 就是一个dep
  // 往这个Set里面添加此时全局的activeEffect

这样子的数据格式
targetMap:(WeakMap){
    target:(Map){
        key:(Set)dep[effect,effect]
    }
}

  // track(target, 'get' /* GET */, rawKey)
  // track(computed, 'get' /* GET */, 'value')---->ref

举个例子
const cnt1 = ref(2);
const cnt2 = ref(5);
const cnt = computed(()=>cnt1.value+cnt2.value)
那么这样子的话 得到的 targetMap
就是
[有一张图片]
function track(target, type, key) {
        if (!shouldTrack || activeEffect === undefined) {
            return
        }
        let depsMap = targetMap.get(target)
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()))
        }
        let dep = depsMap.get(key)
        if (!dep) {
            depsMap.set(key, (dep = new Set()))
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect)
            activeEffect.deps.push(dep)
            if (activeEffect.options.onTrack) {
                activeEffect.options.onTrack({
                    effect: activeEffect,
                    target,
                    type,
                    key
                })
            }
        }
    }
    function trigger(target, type, key, newValue, oldValue, oldTarget) {
      const depsMap = targetMap.get(target);
      if (!depsMap) {
          // never been tracked
          return;
      }
      const effects = new Set();
      const add = (effectsToAdd) => {
          if (effectsToAdd) {
              effectsToAdd.forEach(effect => {
                  if (effect !== activeEffect || effect.allowRecurse) {
                      effects.add(effect);
                  }
              });
          }
      };
      if (type === "clear" /* CLEAR */) {
          // collection being cleared
          // trigger all effects for target
          depsMap.forEach(add);
      }
      else if (key === 'length' && isArray(target)) {
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key >= newValue) {
                  add(dep);
              }
          });
      }
      else {
          // schedule runs for SET | ADD | DELETE
          if (key !== void 0) {
              add(depsMap.get(key));
          }
          // also run for iteration key on ADD | DELETE | Map.SET
          switch (type) {
              case "add" /* ADD */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  else if (isIntegerKey(key)) {
                      // new index added to array -> length changes
                      add(depsMap.get('length'));
                  }
                  break;
              case "delete" /* DELETE */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  break;
              case "set" /* SET */:
                  if (isMap(target)) {
                      add(depsMap.get(ITERATE_KEY));
                  }
                  break;
          }
      }
      const run = (effect) => {
          if (effect.options.onTrigger) {
              effect.options.onTrigger({
                  effect,
                  target,
                  key,
                  type,
                  newValue,
                  oldValue,
                  oldTarget
              });
          }
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              effect();
          }
      };
      effects.forEach(run);
  }
```