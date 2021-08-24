class RefImpl {
  constructor(_rawValue, _shallow = false) {
    this._rawValue = _rawValue;
    this._shallow = _shallow;
    this.__v_isRef = true;
    this._value = _rawValue
    this._age=14
  }
  get value() {
    console.log('1111')
    return this._value;
  }
  set value(newVal) {
    this._rawValue = newVal;
    this._value = newVal;
  }
  get age(){
      return this._age
  }
}
var ref=new RefImpl(5)
console.log(ref.age)