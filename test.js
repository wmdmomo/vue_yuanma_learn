// function makeMap(str, expectsLowerCase) {
//   const map = Object.create(null);
//   const list = str.split(",");
//   for (let i = 0; i < list.length; i++) {
//     map[list[i]] = true;
//   }
//   return expectsLowerCase
//     ? (val) => !!map[val.toLowerCase()]
//     : (val) => !!map[val];
// }
// const isObservableType = /*#__PURE__*/ makeMap(
//   "Object,Array,Map,Set,WeakMap,WeakSet"
// );
// console.log(isObservableType)
// const objectToString = Object.prototype.toString;
// const toTypeString = (value) => objectToString.call(value);
// const toRawType = (value) => {
//   return toTypeString(value).slice(8, -1);
// };
// const canObserve = (value) => {
//   return (
//     !value["__v_skip" /* SKIP */] &&
//     isObservableType(toRawType(value)) &&
//     !Object.isFrozen(value)
//   );
// };
// var aa=null
// console.log(aa)
// console.log(toTypeString(aa))
// console.log(canObserve(aa))

// const person = {
//   like: "vuejs",
// };
// const obj = new Proxy(person, {
//   get: function (target, propKey, receive) {
//     return 10;
//   },
// });
// console.log(obj)
// [1,2,3].forEach(item=>console.log(item))
var map=new Map()
map['name']='wmd'
console.log(map.get(name))