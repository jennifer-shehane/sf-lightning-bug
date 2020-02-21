// ORIGINAL SOURCE: https://unpkg.com/@lwc/engine@0.37.4-220.2/dist/umd/es2017/engine.js

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
      (factory((global.Engine = {})));
}(this, (function (exports) {
  'use strict';


  const { freeze, seal, keys, create, assign, defineProperty, getPrototypeOf, setPrototypeOf, getOwnPropertyDescriptor, getOwnPropertyNames, defineProperties, hasOwnProperty } = Object;
  const { concat: ArrayConcat, filter: ArrayFilter, slice: ArraySlice, splice: ArraySplice, unshift: ArrayUnshift, indexOf: ArrayIndexOf, push: ArrayPush, map: ArrayMap, join: ArrayJoin, forEach, reduce: ArrayReduce, reverse: ArrayReverse, } = Array.prototype;
  const { replace: StringReplace, toLowerCase: StringToLowerCase, indexOf: StringIndexOf, charCodeAt: StringCharCodeAt, slice: StringSlice, split: StringSplit, } = String.prototype;
  function isUndefined(obj) {
    return obj === undefined;
  }
  function isNull(obj) {
    return obj === null;
  }
  function isTrue(obj) {
    return obj === true;
  }
  function isFalse(obj) {
    return obj === false;
  }
  function isFunction(obj) {
    return typeof obj === 'function';
  }
  function isObject(obj) {
    return typeof obj === 'object';
  }
  function isString(obj) {
    return typeof obj === 'string';
  }

  const { setAttribute, removeAttribute, querySelectorAll } = Element.prototype;
  let { addEventListener, removeEventListener } = Element.prototype;

  addEventListener = addEventListener.__lwcOriginal__ || addEventListener;
  removeEventListener = removeEventListener.__lwcOriginal__ || removeEventListener;
  const innerHTMLSetter = hasOwnProperty.call(Element.prototype, 'innerHTML')
    ? getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set
    : getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML').set; // IE11
  const tagNameGetter = getOwnPropertyDescriptor(Element.prototype, 'tagName').get;
  const { appendChild,  insertBefore, removeChild, replaceChild, } = Node.prototype;
  const parentNodeGetter = getOwnPropertyDescriptor(Node.prototype, 'parentNode').get;
  const childNodesGetter = hasOwnProperty.call(Node.prototype, 'childNodes')
    ? getOwnPropertyDescriptor(Node.prototype, 'childNodes').get
    : getOwnPropertyDescriptor(HTMLElement.prototype, 'childNodes').get; // IE11

  const isNativeShadowRootAvailable = typeof window.ShadowRoot !== 'undefined';

  const hasNativeSymbolsSupport = Symbol('x').toString() === 'Symbol(x)';
  function createFieldName(key) {
    return hasNativeSymbolsSupport ? Symbol(key) : `$$lwc-${key}$$`;
  }
  function setInternalField(o, fieldName, value) {
    defineProperty(o, fieldName, {
      value,
    });
  }
  function getInternalField(o, fieldName) {
    return o[fieldName];
  }

  const hiddenFieldsMap = new WeakMap();
  const setHiddenField = hasNativeSymbolsSupport
    ? (o, fieldName, value) => {
      let valuesByField = hiddenFieldsMap.get(o);
      if (isUndefined(valuesByField)) {
        valuesByField = create(null);
        hiddenFieldsMap.set(o, valuesByField);
      }
      valuesByField[fieldName] = value;
    }
    : setInternalField; // Fall back to symbol based approach in compat mode
  const getHiddenField = hasNativeSymbolsSupport
    ? (o, fieldName) => {
      const valuesByField = hiddenFieldsMap.get(o);
      return !isUndefined(valuesByField) && valuesByField[fieldName];
    }
    : getInternalField; // Fall back to symbol based approach in compat mode


  const PropNameToAttrNameMap = create(null);
  const CAPS_REGEX = /[A-Z]/g;
  function getAttrNameFromPropName(propName) {
    if (isUndefined(PropNameToAttrNameMap[propName])) {
      PropNameToAttrNameMap[propName] = StringReplace.call(propName, CAPS_REGEX, (match) => '-' + match.toLowerCase());
    }
    return PropNameToAttrNameMap[propName];
  }

  let nextTickCallbackQueue = [];
  const EmptyObject = seal(create(null));
  const EmptyArray = seal([]);
  const ViewModelReflection = createFieldName('ViewModel');
  function flushCallbackQueue() {
    const callbacks = nextTickCallbackQueue;
    nextTickCallbackQueue = []; // reset to a new queue
    for (let i = 0, len = callbacks.length; i < len; i += 1) {
      callbacks[i]();
    }
  }
  function addCallbackToNextTick(callback) {
    if (nextTickCallbackQueue.length === 0) {
      Promise.resolve().then(flushCallbackQueue);
    }
    ArrayPush.call(nextTickCallbackQueue, callback);
  }
  function isCircularModuleDependency(value) {
    return hasOwnProperty.call(value, '__circular__');
  }

  function updateAllEventListeners(oldVnode, vnode) {
    if (isUndefined(oldVnode.listener)) {
      createAllEventListeners(vnode);
    }
    else {
      vnode.listener = oldVnode.listener;
      vnode.listener.vnode = vnode;
    }
  }
  function createAllEventListeners(vnode) {
    const { data: { on }, } = vnode;
    if (isUndefined(on)) {
      return;
    }
    const elm = vnode.elm;
    const listener = (vnode.listener = createListener());
    listener.vnode = vnode;
    let name;
    for (name in on) {
      elm.addEventListener(name, listener);
    }
  }
  var modEvents = {
    update: updateAllEventListeners,
    create: createAllEventListeners,
  };

  function updateAttrs(oldVnode, vnode) {
    const { data: { attrs }, } = vnode;
    if (isUndefined(attrs)) {
      return;
    }
  }
  const emptyVNode = { data: {} };
  var modAttrs = {
    create: (vnode) => updateAttrs(emptyVNode, vnode),
    update: updateAttrs,
  };

  const TargetToReactiveRecordMap = new WeakMap();
  function notifyMutation(target, key) {
    const reactiveRecord = TargetToReactiveRecordMap.get(target);
    if (!isUndefined(reactiveRecord)) {
      const value = reactiveRecord[key];
      if (value) {
        const len = value.length;
        for (let i = 0; i < len; i += 1) {
          const vm = value[i];
          if (isFalse(vm.isDirty)) {
            markComponentAsDirty(vm);
            scheduleRehydration(vm);
          }
        }
      }
    }
  }

  const { isArray: isArray$1 } = Array;
  const { getPrototypeOf: getPrototypeOf$1, create: ObjectCreate, defineProperty: ObjectDefineProperty, defineProperties: ObjectDefineProperties, isExtensible: isExtensible$1, getOwnPropertyDescriptor: getOwnPropertyDescriptor$1, getOwnPropertyNames: getOwnPropertyNames$1, getOwnPropertySymbols: getOwnPropertySymbols$1, preventExtensions: preventExtensions$1, hasOwnProperty: hasOwnProperty$2, } = Object;
  function isUndefined$1(obj) {
    return obj === undefined;
  }
  function isFunction$1(obj) {
    return typeof obj === 'function';
  }
  const proxyToValueMap = new WeakMap();

  const unwrap = (replicaOrAny) => proxyToValueMap.get(replicaOrAny) || replicaOrAny;

  const ObjectDotPrototype = Object.prototype;
  function defaultValueIsObservable(value) {
    if (value === null) {
      return false;
    }
    if (typeof value !== 'object') {
      return false;
    }
    if (isArray$1(value)) {
      return true;
    }
    const proto = getPrototypeOf$1(value);
    return (proto === ObjectDotPrototype || proto === null || getPrototypeOf$1(proto) === null);
  }
  const defaultValueObserved = () => {
    /* do nothing */
  };
  const defaultValueMutated = () => {
    /* do nothing */
  };
  const defaultValueDistortion = (value) => value;

  class ReactiveMembrane {
    constructor(options) {
      this.valueDistortion = defaultValueDistortion;
      this.valueMutated = defaultValueMutated;
      this.valueObserved = defaultValueObserved;
      this.valueIsObservable = defaultValueIsObservable;
      this.objectGraph = new WeakMap();
      if (!isUndefined$1(options)) {
        const { valueDistortion, valueMutated, valueObserved, valueIsObservable } = options;
        this.valueDistortion = isFunction$1(valueDistortion) ? valueDistortion : defaultValueDistortion;
        this.valueMutated = isFunction$1(valueMutated) ? valueMutated : defaultValueMutated;
        this.valueObserved = isFunction$1(valueObserved) ? valueObserved : defaultValueObserved;
        this.valueIsObservable = isFunction$1(valueIsObservable) ? valueIsObservable : defaultValueIsObservable;
      }
    }
    getProxy(value) {
      const unwrappedValue = unwrap(value);
      const distorted = this.valueDistortion(unwrappedValue);
      return distorted;
    }
    getReadOnlyProxy(value) {
      value = unwrap(value);
      const distorted = this.valueDistortion(value);
      return distorted;
    }
    unwrapProxy(p) {
      return unwrap(p);
    }
  }

  function valueDistortion(value) {
    return value;
  }
  const reactiveMembrane = new ReactiveMembrane({
    valueMutated: notifyMutation,
    valueDistortion,
  });

  function track(target, prop, descriptor) {
    return createTrackedPropertyDescriptor(target, prop, isUndefined(descriptor) ? true : descriptor.enumerable === true);
  }
  function createTrackedPropertyDescriptor(Ctor, key, enumerable) {
    return {
      get() {
        const vm = getComponentVM(this);
      },
      set(newValue) {
        const vm = getComponentVM(this);
        const reactiveOrAnyValue = reactiveMembrane.getProxy(newValue);
      },
      enumerable,
      configurable: true,
    };
  }

  function decorate(Ctor, decorators) {
    const props = getOwnPropertyNames(decorators);
    const target = Ctor.prototype;
    for (let i = 0, len = props.length; i < len; i += 1) {
      const propName = props[i];
      const decorator = decorators[propName];
      const originalDescriptor = getOwnPropertyDescriptor(target, propName);
      const descriptor = decorator(Ctor, propName, originalDescriptor);
      if (!isUndefined(descriptor)) {
        defineProperty(target, propName, descriptor);
      }
    }
    return Ctor; // chaining
  }

  const signedDecoratorToMetaMap = new Map();
  function registerDecorators(Ctor, meta) {
    const decoratorMap = create(null);
    const props = getPublicPropertiesHash(Ctor, meta.publicProps);
    const methods = getPublicMethodsHash(Ctor, meta.publicMethods);
    const wire$$1 = getWireHash(Ctor, meta.wire);
    const track$$1 = getTrackHash(Ctor, meta.track);
    signedDecoratorToMetaMap.set(Ctor, {
      props,
      methods,
      wire: wire$$1,
      track: track$$1,
    });
    for (const propName in props) {
      decoratorMap[propName] = api;
    }
    if (track$$1) {
      for (const propName in track$$1) {
        decoratorMap[propName] = track;
      }
    }
    decorate(Ctor, decoratorMap);
    return Ctor;
  }
  function getDecoratorsRegisteredMeta(Ctor) {
    return signedDecoratorToMetaMap.get(Ctor);
  }
  function getTrackHash(target, track$$1) {
    if (isUndefined(track$$1) || getOwnPropertyNames(track$$1).length === 0) {
      return EmptyObject;
    }
    return assign(create(null), track$$1);
  }
  function getWireHash(target, wire$$1) {
    if (isUndefined(wire$$1) || getOwnPropertyNames(wire$$1).length === 0) {
      return;
    }
    return assign(create(null), wire$$1);
  }
  function getPublicPropertiesHash(target, props) {
    if (isUndefined(props) || getOwnPropertyNames(props).length === 0) {
      return EmptyObject;
    }
    return getOwnPropertyNames(props).reduce((propsHash, propName) => {
      const attrName = getAttrNameFromPropName(propName);
      propsHash[propName] = assign({
        config: 0,
        type: 'any',
        attr: attrName,
      }, props[propName]);
      return propsHash;
    }, create(null));
  }
  function getPublicMethodsHash(target, publicMethods) {
    if (isUndefined(publicMethods) || publicMethods.length === 0) {
      return EmptyObject;
    }
    return publicMethods.reduce((methodsHash, methodName) => {
      methodsHash[methodName] = target.prototype[methodName];
      return methodsHash;
    }, create(null));
  }

  function api(target, propName, descriptor) {
    const meta = getDecoratorsRegisteredMeta(target);
    if (isObject(descriptor) && (isFunction(descriptor.get) || isFunction(descriptor.set))) {
      meta.props[propName].config = isFunction(descriptor.set) ? 3 : 1;
    }
  }

  function isLiveBindingProp(sel, key) {
    return sel === 'input' && (key === 'value' || key === 'checked');
  }
  function update(oldVnode, vnode) {
    const props = vnode.data.props;
    if (isUndefined(props)) {
      return;
    }
    const oldProps = oldVnode.data.props;
    const elm = vnode.elm;
    const isFirstPatch = isUndefined(oldProps);
    const { sel } = vnode;
    for (const key in props) {
      const cur = props[key];
      if (isFirstPatch ||
        cur !== (isLiveBindingProp(sel, key) ? elm[key] : oldProps[key])) {
        elm[key] = cur;
      }
    }
  }
  const emptyVNode$1 = { data: {} };
  var modProps = {
    create: (vnode) => update(emptyVNode$1, vnode),
    update,
  };

  function getTextContent(node) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const childNodes = getFilteredChildNodes(node);
        let content = '';
        for (let i = 0, len = childNodes.length; i < len; i += 1) {
          content += getTextContent(childNodes[i]);
        }
        return content;
      }
      default:
        return node.nodeValue;
    }
  }

  const InternalSlot = createFieldName('shadowRecord');
  const { createDocumentFragment: createDocumentFragment$1 } = document;
  function attachShadow(elm, options) {
    const { mode, delegatesFocus } = options;
    const sr = createDocumentFragment$1.call(document);
    const record = {
      mode,
      delegatesFocus: !!delegatesFocus,
      host: elm,
      shadowRoot: sr,
    };
    setInternalField(sr, InternalSlot, record);
    setInternalField(elm, InternalSlot, record);
    setPrototypeOf(sr, SyntheticShadowRoot.prototype);
    return sr;
  }

  function SyntheticShadowRoot() {
    throw new TypeError('Illegal constructor');
  }
  if (isNativeShadowRootAvailable) {
    setPrototypeOf(SyntheticShadowRoot.prototype, window.ShadowRoot.prototype);
  }

  const OwnerKey = '$$OwnerKey$$';
  const OwnKey = '$$OwnKey$$';

  function getNodeNearestOwnerKey(node) {
    let ownerNode = node;
    let ownerKey;
    while (!isNull(ownerNode)) {
      ownerKey = ownerNode[OwnerKey];
      if (!isUndefined(ownerKey)) {
        return ownerKey;
      }
      ownerNode = parentNodeGetter.call(ownerNode);
    }
  }
  function getNodeKey(node) {
    return node[OwnKey];
  }
  const ShadowTokenKey = '$$ShadowTokenKey$$';

  function setCSSToken(elm, shadowToken) {
    if (!isUndefined(shadowToken)) {
      setAttribute.call(elm, shadowToken, '');
      elm[ShadowTokenKey] = shadowToken;
    }
  }
  function getShadowParent(node, value) {
    const owner = getNodeOwner(node);
    if (value === owner) {
    }
    else if (value instanceof Element) {
      if (getNodeNearestOwnerKey(node) === getNodeNearestOwnerKey(value)) {
        return value;
      }
      else if (!isNull(owner) && isSlotElement(value)) {

        const slotOwner = getNodeOwner(value);
        if (!isNull(slotOwner) && isNodeOwnedBy(owner, slotOwner)) {
          return slotOwner;
        }
      }
    }
    return null;
  }
  function PatchedNode(node) {
    const Ctor = getPrototypeOf(node).constructor;
    class PatchedNodeClass {
      constructor() {
        throw new TypeError('Illegal constructor');
      }
      get textContent() {
        return getTextContent(this);
      }
      get parentNode() {
        const value = parentNodeGetter.call(this);
        if (isNull(value)) {
          return value;
        }
        return getShadowParent(this, value);
      }
    }
    setPrototypeOf(PatchedNodeClass, Ctor);
    setPrototypeOf(PatchedNodeClass.prototype, Ctor.prototype);
    return PatchedNodeClass;
  }

  const { getRootNode: patchedGetRootNode$1 } = Node.prototype;
  function getNodeOwner(node) {
    if (!(node instanceof Node)) {
      return null;
    }
    const ownerKey = getNodeNearestOwnerKey(node);
    if (isUndefined(ownerKey)) {
      return null;
    }
    let nodeOwner = node;
    while (!isNull(nodeOwner) && getNodeKey(nodeOwner) !== ownerKey) {
      nodeOwner = parentNodeGetter.call(nodeOwner);
    }
    if (isNull(nodeOwner)) {
      return null;
    }
    return nodeOwner;
  }
  function isNodeOwnedBy(owner, node) {
    const ownerKey = getNodeNearestOwnerKey(node);
    return isUndefined(ownerKey) || getNodeKey(owner) === ownerKey;
  }

  function getFilteredChildNodes(node) {
    let children;
    if (!isUndefined(getNodeKey(node))) {
      const slots = querySelectorAll.call(node, 'slot');
      children = ArrayReduce.call(slots, (seed, slot) => {
        if (isNodeOwnedBy(node, slot)) {
          ArrayPush.apply(seed, getFilteredSlotAssignedNodes(slot));
        }
        return seed;
      }, []);
    }
    else {
      children = childNodesGetter.call(node);
    }
    const owner = getNodeOwner(node);
    if (isNull(owner)) {
      return [];
    }
    return ArrayReduce.call(children, (seed, child) => {
      if (isNodeOwnedBy(owner, child)) {
        ArrayPush.call(seed, child);
      }
      return seed;
    }, []);
  }
  function PatchedElement(elm) {
    const Ctor = PatchedNode(elm);
    return class PatchedHTMLElement extends Ctor {
      querySelector(selector) {
        return lightDomQuerySelector(this, selector);
      }
      querySelectorAll(selectors) {
        return createStaticNodeList(lightDomQuerySelectorAll(this, selectors));
      }
      get innerHTML() {
        const childNodes = getInternalChildNodes(this);
        let innerHTML = '';
        for (let i = 0, len = childNodes.length; i < len; i += 1) {
          innerHTML += getOuterHTML(childNodes[i]);
        }
        return innerHTML;
      }
      set innerHTML(value) {
        innerHTMLSetter.call(this, value);
      }
      get outerHTML() {
        return getOuterHTML(this);
      }
    };
  }

  let { addEventListener: windowAddEventListener, removeEventListener: windowRemoveEventListener, } = window;
  windowAddEventListener = windowAddEventListener.__lwcOriginal__ || windowAddEventListener;
  windowRemoveEventListener = windowRemoveEventListener.__lwcOriginal__ || windowRemoveEventListener;

  var EventListenerContext;
  (function (EventListenerContext) {
    EventListenerContext[EventListenerContext["CUSTOM_ELEMENT_LISTENER"] = 1] = "CUSTOM_ELEMENT_LISTENER";
    EventListenerContext[EventListenerContext["SHADOW_ROOT_LISTENER"] = 2] = "SHADOW_ROOT_LISTENER";
  })(EventListenerContext || (EventListenerContext = {}));

  function PatchedCustomElement(Base) {
    const Ctor = PatchedElement(Base);
    return class PatchedHTMLElement extends Ctor {
      attachShadow(options) {
        return attachShadow(this, options);
      }
    };
  }

  const FromIteration = new WeakMap();

  function hasDynamicChildren(children) {
    return FromIteration.has(children);
  }
  let TextNodeProto;
  function patchTextNodeProto(text) {
    if (isUndefined(TextNodeProto)) {
      TextNodeProto = PatchedNode(text).prototype;
    }
    setPrototypeOf(text, TextNodeProto);
  }
  const TagToProtoCache = create(null);
  function getPatchedElementClass(elm) {
    return PatchedElement(elm);
  }
  function patchElementProto(elm, options) {
    const { sel, isPortal, shadowAttribute } = options;
    let proto = TagToProtoCache[sel];
    if (isUndefined(proto)) {
      proto = TagToProtoCache[sel] = getPatchedElementClass(elm).prototype;
    }
    setPrototypeOf(elm, proto);
    if (isTrue(isPortal)) {
      markElementAsPortal(elm);
    }
    setCSSToken(elm, shadowAttribute);
  }
  function patchCustomElementProto(elm, options) {
    const { def, shadowAttribute } = options;
    let patchedBridge = def.patchedBridge;
    if (isUndefined(patchedBridge)) {
      patchedBridge = def.patchedBridge = PatchedCustomElement(elm);
    }
    setPrototypeOf(elm, patchedBridge.prototype);
    setCSSToken(elm, shadowAttribute);
  }

  function isVNode(vnode) {
    return vnode != null;
  }
  function addVnodes(parentElm, before, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (isVNode(ch)) {
        ch.hook.create(ch);
        ch.hook.insert(ch, parentElm, before);
      }
    }
  }
  function updateDynamicChildren() {
  }
  function updateStaticChildren(parentElm, oldCh, newCh) {
    const { length } = newCh;
    if (oldCh.length === 0) {
      addVnodes(parentElm, null, newCh, 0, length);
      return;
    }
    let referenceElm = null;
    for (let i = length - 1; i >= 0; i -= 1) {
      const vnode = newCh[i];
      const oldVNode = oldCh[i];
      if (vnode !== oldVNode) {
        if (isVNode(oldVNode)) {
          if (isVNode(vnode)) {
          }
          else {
            oldVNode.hook.remove(oldVNode, parentElm);
          }
        }
        else if (isVNode(vnode)) {
          vnode.hook.create(vnode);
          vnode.hook.insert(vnode, parentElm, referenceElm);
          referenceElm = vnode.elm;
        }
      }
    }
  }


  function insertNodeHook(vnode, parentNode, referenceNode) {
    insertBefore.call(parentNode, vnode.elm, referenceNode);
  }

  function createTextHook(vnode) {
    const text = vnode.elm;
    const { uid, fallback } = vnode.owner;
    setNodeOwnerKey$1(text, uid);
    if (isTrue(fallback)) {
      patchTextNodeProto(text);
    }
  }

  function createElmDefaultHook(vnode) {
    modEvents.create(vnode);
    modAttrs.create(vnode);
    modProps.create(vnode);
  }
  var LWCDOMMode;
  (function (LWCDOMMode) {
    LWCDOMMode["manual"] = "manual";
  })(LWCDOMMode || (LWCDOMMode = {}));
  function createElmHook(vnode) {
    const { owner, sel } = vnode;
    const elm = vnode.elm;
    setNodeOwnerKey$1(elm, owner.uid);
    if (isTrue(owner.fallback)) {
      const { data: { context }, } = vnode;
      const { shadowAttribute } = owner.context;
      const isPortal = !isUndefined(context) &&
        !isUndefined(context.lwc) &&
        context.lwc.dom === LWCDOMMode.manual;
      patchElementProto(elm, {
        sel,
        isPortal,
        shadowAttribute,
      });
    }
  }
  function updateElmDefaultHook(oldVnode, vnode) {
    modAttrs.update(oldVnode, vnode);
    modProps.update(oldVnode, vnode);
  }
  function insertCustomElmHook(vnode) {
    const vm = getCustomElementVM(vnode.elm);
    appendVM(vm);
  }

  function allocateChildrenHook(vnode) {
    const elm = vnode.elm;
    const vm = getCustomElementVM(elm);
    const { children } = vnode;
    vm.aChildren = children;
    if (isTrue(vnode.owner.fallback)) {
      vnode.children = EmptyArray;
    }
  }
  function createCustomElmHook(vnode) {
    const elm = vnode.elm;
    if (hasOwnProperty.call(elm, ViewModelReflection)) {
      return;
    }
    const { mode, ctor, owner } = vnode;
    const { uid, fallback } = owner;
    setNodeOwnerKey$1(elm, uid);
    const def = getComponentDef(ctor);
    setElementProto(elm, def);
    if (isTrue(fallback)) {
      const { shadowAttribute } = owner.context;
      patchCustomElementProto(elm, {
        def,
        shadowAttribute,
      });
    }
    createVM(vnode.sel, elm, ctor, {
      mode,
      fallback,
      owner,
    });
  }
  function createCustomElmDefaultHook(vnode) {
    modEvents.create(vnode);
    modAttrs.create(vnode);
    modProps.create(vnode);
  }
  function createChildrenHook(vnode) {
    const { elm, children } = vnode;
    for (let j = 0; j < children.length; ++j) {
      const ch = children[j];
      if (ch != null) {
        ch.hook.create(ch);
        ch.hook.insert(ch, elm, null);
      }
    }
  }
  function updateCustomElmDefaultHook(oldVnode, vnode) {
    modAttrs.update(oldVnode, vnode);
    modProps.update(oldVnode, vnode);
  }

  const Services = create(null);

  const { createElement: createElement$1, createElementNS: createElementNS$1, createTextNode: createTextNode$1, createComment: createComment$1 } = document;
  const TextHook = {
    create: (vnode) => {
      if (isUndefined(vnode.elm)) {
        vnode.elm = createTextNode$1.call(document, vnode.text);
      }
      createTextHook(vnode);
    },
    insert: insertNodeHook,
  };

  const ElementHook = {
    create: (vnode) => {
      const { data, sel, elm } = vnode;
      const { ns, create: create$$1 } = data;
      if (isUndefined(elm)) {
        vnode.elm = isUndefined(ns)
          ? createElement$1.call(document, sel)
          : createElementNS$1.call(document, ns, sel);
      }
      createElmHook(vnode);
      create$$1(vnode);
    },
    insert: (vnode, parentNode, referenceNode) => {
      insertNodeHook(vnode, parentNode, referenceNode);
      createChildrenHook(vnode);
    },
  };
  const CustomElementHook = {
    create: (vnode) => {
      const { sel, data: { create: create$$1 }, elm, } = vnode;
      if (isUndefined(elm)) {
        vnode.elm = createElement$1.call(document, sel);
      }
      createCustomElmHook(vnode);
      allocateChildrenHook(vnode);
      create$$1(vnode);
    },
    insert: (vnode, parentNode, referenceNode) => {
      insertNodeHook(vnode, parentNode, referenceNode);
      createChildrenHook(vnode);
      insertCustomElmHook(vnode);
    },
  };

  function h(sel, data, children) {
    const { key } = data;
    if (isUndefined(data.create)) {
      data.create = createElmDefaultHook;
    }
    if (isUndefined(data.update)) {
      data.update = updateElmDefaultHook;
    }
    let text, elm;
    const vnode = {
      sel,
      data,
      children,
      text,
      elm,
      key,
      hook: ElementHook,
      owner: vmBeingRendered,
    };

    return vnode;
  }

  function c(sel, Ctor, data, children) {
    const { key } = data;
    if (isUndefined(data.create)) {
      data.create = createCustomElmDefaultHook;
    }
    if (isUndefined(data.update)) {
      data.update = updateCustomElmDefaultHook;
    }
    let text, elm;
    children = arguments.length === 3 ? EmptyArray : children;
    const vnode = {
      sel,
      data,
      children,
      text,
      elm,
      key,
      hook: CustomElementHook,
      ctor: Ctor,
      owner: vmBeingRendered,
      mode: 'open',
    };
    return vnode;
  }

  function t(text) {
    const data = EmptyObject;
    let sel, children, key, elm;
    return {
      sel,
      data,
      children,
      text,
      elm,
      key,
      hook: TextHook,
      owner: vmBeingRendered,
    };
  }

  function d(value) {
    if (value == null) {
      return null;
    }
    return t(value);
  }

  var api$1 = Object.freeze({
    h: h,
    c: c,
    t: t,
    d: d,
  });

  function defaultEmptyTemplate() {
    return [];
  }

  function registerTemplate(tpl) {
    return tpl;
  }

  function evaluateTemplate(vm, html) {
    const { component, context, cmpSlots } = vm;
    const vnodes = html.call(undefined, api$1, component, cmpSlots, context.tplCache);
    return vnodes;
  }

  let vmBeingRendered = null;
  let vmBeingConstructed = null;

  function invokeComponentCallback(vm, fn, args) {
    const { component, callHook, context, owner } = vm;
    let result;
    runWithBoundaryProtection(vm, owner, () => {
    }, () => {
      result = callHook(component, fn, args);
    }, () => {
    });
    return result;
  }
  function invokeComponentConstructor(vm, Ctor) {
    const vmBeingConstructedInception = vmBeingConstructed;
    vmBeingConstructed = vm;
    try {
      new Ctor();
    }
    finally {
      vmBeingConstructed = vmBeingConstructedInception;
    }
  }
  function invokeComponentRenderMethod(vm) {
    const { def: { render }, callHook, component, context, owner, } = vm;
    const vmBeingRenderedInception = vmBeingRendered;
    vmBeingRendered = vm;
    let result;
    runWithBoundaryProtection(vm, owner, () => {
      vmBeingRendered = vm;
    }, () => {
      const html = callHook(component, render);
      result = evaluateTemplate(vm, html);
    }, () => {
      vmBeingRendered = vmBeingRenderedInception;
    });
    return result || [];
  }

  const signedComponentToMetaMap = new Map();
  function registerComponent(Ctor, { name, tmpl: template }) {
    signedComponentToMetaMap.set(Ctor, { name, template });
    return Ctor;
  }
  function getComponentRegisteredMeta(Ctor) {
    return signedComponentToMetaMap.get(Ctor);
  }
  function createComponent(uninitializedVm, Ctor) {
    invokeComponentConstructor(uninitializedVm, Ctor);
  }
  function linkComponent(vm) {
    const { def: { wire }, } = vm;
    if (wire) {
      const { wiring } = Services;
      if (wiring) {
        invokeServiceHook(vm, wiring);
      }
    }
  }
  function clearReactiveListeners(vm) {
    const { deps } = vm;
    const len = deps.length;
    if (len > 0) {
      for (let i = 0; i < len; i += 1) {
        const set = deps[i];
        const pos = ArrayIndexOf.call(deps[i], vm);
        ArraySplice.call(set, pos, 1);
      }
      deps.length = 0;
    }
  }
  function clearChildLWC(vm) {
    vm.velements = [];
  }
  function renderComponent(vm) {
    clearReactiveListeners(vm);
    clearChildLWC(vm);
    const vnodes = invokeComponentRenderMethod(vm);
    vm.isDirty = false;
    vm.isScheduled = false;
    return vnodes;
  }
  function markComponentAsDirty(vm) {
    vm.isDirty = true;
  }

  const HTMLElementOriginalDescriptors = create(null);

  function createBridgeToElementDescriptor(propName, descriptor) {
    const { get, set, enumerable, configurable } = descriptor;
    return {
      enumerable,
      configurable,
    };
  }
  function getLinkedElement(cmp) {
    return getComponentVM(cmp).elm;
  }
  function BaseLightningElement() {
    const vm = vmBeingConstructed;
    const { elm, cmpRoot, uid } = vm;
    const component = this;
    vm.component = component;
    setHiddenField(component, ViewModelReflection, vm);
    setInternalField(elm, ViewModelReflection, vm);
    setInternalField(cmpRoot, ViewModelReflection, vm);
    setNodeKey(elm, uid);
  }
  BaseLightningElement.prototype = {
    constructor: BaseLightningElement,
    get classList() {
      return getLinkedElement(this).classList;
    },
    render() {
      const vm = getComponentVM(this);
      const { template } = vm.def;
      return isUndefined(template) ? defaultEmptyTemplate : template;
    },
  };

  const baseDescriptors = ArrayReduce.call(getOwnPropertyNames(HTMLElementOriginalDescriptors), (descriptors, propName) => {
    descriptors[propName] = createBridgeToElementDescriptor(propName, HTMLElementOriginalDescriptors[propName]);
    return descriptors;
  }, create(null));
  defineProperties(BaseLightningElement.prototype, baseDescriptors);
  freeze(BaseLightningElement);
  seal(BaseLightningElement.prototype);

  const cachedGetterByKey = create(null);
  const cachedSetterByKey = create(null);
  function createGetter(key) {
    let fn = cachedGetterByKey[key];
    if (isUndefined(fn)) {
      fn = cachedGetterByKey[key] = function () {
        const vm = getCustomElementVM(this);
        const { getHook } = vm;
        return getHook(vm.component, key);
      };
    }
    return fn;
  }
  function createSetter(key) {
    let fn = cachedSetterByKey[key];
    if (isUndefined(fn)) {
      fn = cachedSetterByKey[key] = function (newValue) {
        const vm = getCustomElementVM(this);
        const { setHook } = vm;
        setHook(vm.component, key, newValue);
      };
    }
    return fn;
  }

  function HTMLBridgeElementFactory(SuperClass, props, methods) {
    let HTMLBridgeElement;

    if (isFunction(SuperClass)) {
      HTMLBridgeElement = class extends SuperClass {
      };
    }
    const descriptors = create(null);
    for (let i = 0, len = props.length; i < len; i += 1) {
      const propName = props[i];
      descriptors[propName] = {
        get: createGetter(propName),
        set: createSetter(propName),
        enumerable: true,
        configurable: true,
      };
    }
    for (let i = 0, len = methods.length; i < len; i += 1) {
      const methodName = methods[i];
      descriptors[methodName] = {
        value: createMethodCaller(methodName),
        writable: true,
        configurable: true,
      };
    }
    defineProperties(HTMLBridgeElement.prototype, descriptors);
    return HTMLBridgeElement;
  }
  const BaseBridgeElement = HTMLBridgeElementFactory(HTMLElement, getOwnPropertyNames(HTMLElementOriginalDescriptors), []);
  freeze(BaseBridgeElement);
  seal(BaseBridgeElement.prototype);

  const CtorToDefMap = new WeakMap();
  function getCtorProto(Ctor, subclassComponentName) {
    let proto = getPrototypeOf(Ctor);
    if (isNull(proto)) {
      throw new ReferenceError(`Invalid prototype chain for ${subclassComponentName}, you must extend LightningElement.`);
    }
    if (isCircularModuleDependency(proto)) {
      const p = resolveCircularModuleDependency(proto);
      proto = p === proto ? BaseLightningElement : p;
    }
    return proto;
  }
  function createComponentDef(Ctor, meta, subclassComponentName) {
    const { name, template } = meta;
    let decoratorsMeta = getDecoratorsRegisteredMeta(Ctor);
    let { props, methods, wire, track } = decoratorsMeta || EmptyObject;
    const proto = Ctor.prototype;
    let { connectedCallback, disconnectedCallback, renderedCallback, errorCallback, render, } = proto;
    const superProto = getCtorProto(Ctor, subclassComponentName);
    const superDef = superProto !== BaseLightningElement
      ? getComponentDef(superProto, subclassComponentName)
      : null;
    const SuperBridge = isNull(superDef) ? BaseBridgeElement : superDef.bridge;
    const bridge = HTMLBridgeElementFactory(SuperBridge, getOwnPropertyNames(props), getOwnPropertyNames(methods));
    props = assign(create(null), HTML_PROPS, props);
    const def = {
      ctor: Ctor,
      name,
      wire,
      track,
      props,
      methods,
      bridge,
      template,
      connectedCallback,
      disconnectedCallback,
      renderedCallback,
      errorCallback,
      render,
    };
    return def;
  }

  function getComponentDef(Ctor, subclassComponentName) {
    let def = CtorToDefMap.get(Ctor);
    if (isUndefined(def)) {
      let meta = getComponentRegisteredMeta(Ctor);
      def = createComponentDef(Ctor, meta, subclassComponentName || Ctor.name);
      CtorToDefMap.set(Ctor, def);
    }
    return def;
  }

  function setElementProto(elm, def) {
    setPrototypeOf(elm, def.bridge.prototype);
  }
  const HTML_PROPS = ArrayReduce.call(getOwnPropertyNames(HTMLElementOriginalDescriptors), (props, propName) => {
    const attrName = getAttrNameFromPropName(propName);
    props[propName] = {
      config: 3,
      type: 'any',
      attr: attrName,
    };
    return props;
  }, create(null));

  var VMState;
  (function (VMState) {
    VMState[VMState["created"] = 0] = "created";
    VMState[VMState["connected"] = 1] = "connected";
    VMState[VMState["disconnected"] = 2] = "disconnected";
  })(VMState || (VMState = {}));
  let idx = 0;
  let uid = 0;
  function callHook(cmp, fn, args = []) {
    return fn.apply(cmp, args);
  }
  function setHook(cmp, prop, newValue) {
    cmp[prop] = newValue;
  }
  function getHook(cmp, prop) {
    return cmp[prop];
  }
  const OwnerKey$1 = '$$OwnerKey$$';
  const OwnKey$1 = '$$OwnKey$$';

  function appendRootVM(vm) {
    runConnectedCallback(vm);
    rehydrate(vm);
  }
  function appendVM(vm) {
    runConnectedCallback(vm);
    rehydrate(vm);
  }

  function removeRootVM(vm) {
    resetComponentStateWhenRemoved(vm);
  }
  function createVM(tagName, elm, Ctor, options) {
    const def = getComponentDef(Ctor);
    const { isRoot, mode, fallback, owner } = options;
    const shadowRootOptions = {
      mode,
      delegatesFocus: !!Ctor.delegatesFocus,
    };
    uid += 1;
    idx += 1;
    const uninitializedVm = {
      uid,
      idx,
      state: VMState.created,
      isScheduled: false,
      isDirty: true,
      isRoot: isTrue(isRoot),
      fallback,
      mode,
      def,
      owner,
      elm,
      data: EmptyObject,
      context: create(null),
      cmpTemplate: undefined,
      cmpProps: create(null),
      cmpSlots: fallback ? create(null) : undefined,
      cmpRoot: elm.attachShadow(shadowRootOptions),
      callHook,
      setHook,
      getHook,
      component: undefined,
      children: EmptyArray,
      aChildren: EmptyArray,
      velements: EmptyArray,
      deps: [],
    };
    createComponent(uninitializedVm, Ctor);
    const initializedVm = uninitializedVm;
    linkComponent(initializedVm);
  }
  function rehydrate(vm) {
    if (isTrue(vm.isDirty)) {
      const children = renderComponent(vm);
      patchShadowRoot(vm, children);
    }
  }
  function patchShadowRoot(vm, newCh) {
    const { elm, cmpRoot, fallback, children: oldCh } = vm;
    vm.children = newCh; // caching the new children collection
    if (newCh.length > 0 || oldCh.length > 0) {
      if (oldCh !== newCh) {
        const parentNode = fallback ? elm : cmpRoot;
        const fn = hasDynamicChildren(newCh) ? updateDynamicChildren : updateStaticChildren;
        runWithBoundaryProtection(vm, vm, () => {
        }, () => {
          fn(parentNode, oldCh, newCh);
        }, () => {
        });
      }
    }
  }
  let rehydrateQueue = [];
  function flushRehydrationQueue() {
    const vms = rehydrateQueue.sort((a, b) => a.idx - b.idx);
    rehydrateQueue = []; // reset to a new queue
    for (let i = 0, len = vms.length; i < len; i += 1) {
      const vm = vms[i];
      try {
        rehydrate(vm);
      }
      catch (error) {
        if (i + 1 < len) {
          if (rehydrateQueue.length === 0) {
            addCallbackToNextTick(flushRehydrationQueue);
          }
          ArrayUnshift.apply(rehydrateQueue, ArraySlice.call(vms, i + 1));
        }
        throw error; // eslint-disable-line no-unsafe-finally
      }
    }
  }
  function runConnectedCallback(vm) {
    const { state } = vm;
    if (state === VMState.connected) {
      return; // nothing to do since it was already connected
    }
    vm.state = VMState.connected;
    const { connected } = Services;
    if (connected) {
      invokeServiceHook(vm, connected);
    }
    const { connectedCallback } = vm.def;
    if (!isUndefined(connectedCallback)) {
      invokeComponentCallback(vm, connectedCallback);
    }
  }

  function scheduleRehydration(vm) {
    if (!vm.isScheduled) {
      vm.isScheduled = true;
      if (rehydrateQueue.length === 0) {
        addCallbackToNextTick(flushRehydrationQueue);
      }
      ArrayPush.call(rehydrateQueue, vm);
    }
  }

  function setNodeOwnerKey$1(node, value) {
    {
      node[OwnerKey$1] = value;
    }
  }
  function setNodeKey(node, value) {
    {
      node[OwnKey$1] = value;
    }
  }
  function getCustomElementVM(elm) {
    return getInternalField(elm, ViewModelReflection);
  }
  function getComponentVM(component) {
    return getHiddenField(component, ViewModelReflection);
  }
  function runWithBoundaryProtection(vm, owner, pre, job, post) {
    pre();
    try {
      job();
    }
    catch (e) {}
    finally {
      post();
    }
  }

  const ConnectingSlot = createFieldName('connecting');
  const DisconnectingSlot = createFieldName('disconnecting');
  function callNodeSlot(node, slot) {
    const fn = getInternalField(node, slot);
    if (!isUndefined(fn)) {
      fn();
    }
    return node; 
  }
  assign(Node.prototype, {
    appendChild(newChild) {
      const appendedNode = appendChild.call(this, newChild);
      return callNodeSlot(appendedNode, ConnectingSlot);
    },
  });

  function createElement$2(sel, options) {
    let Ctor = options.is;
    const mode = options.mode !== 'closed' ? 'open' : 'closed';
    const fallback = isUndefined(options.fallback) ||
      isTrue(options.fallback) ||
      isFalse(isNativeShadowRootAvailable);
    const element = document.createElement(sel);
    const def = getComponentDef(Ctor);
    setElementProto(element, def);
    if (isTrue(fallback)) {
      patchCustomElementProto(element, {
        def,
      });
    }
    createVM(sel, element, Ctor, { mode, fallback, isRoot: true, owner: null });
    setInternalField(element, ConnectingSlot, () => {
      const vm = getCustomElementVM(element);
      if (vm.state === VMState.connected) {
        removeRootVM(vm);
      }
      appendRootVM(vm);
    });
    setInternalField(element, DisconnectingSlot, () => {
      const vm = getCustomElementVM(element);
      removeRootVM(vm);
    });
    return element;
  }

  exports.createElement = createElement$2;
  exports.LightningElement = BaseLightningElement;
  exports.registerTemplate = registerTemplate;
  exports.registerComponent = registerComponent;
  exports.registerDecorators = registerDecorators;

  Object.defineProperty(exports, '__esModule', { value: true });
})));

(function (lwc) {
    function tmpl($api, $cmp) {
      const {
        d: api_dynamic
      } = $api;
      return [api_dynamic($cmp.label)];
    }

    var _tmpl = lwc.registerTemplate(tmpl);

    class LightningBadge extends lwc.LightningElement {
      constructor(...args) {
        super(...args);
      }

      connectedCallback() {
        this.classList.add('slds-badge');
      }
    }

    lwc.registerDecorators(LightningBadge, {
      publicProps: {
        label: {}
      }
    });

    var _lightningBadge = lwc.registerComponent(LightningBadge, {
      tmpl: _tmpl
    });

    function tmpl$1($api, $cmp) {
      const {
        h: api_element,
        c: api_custom_element
      } = $api;

      return [
        api_element("div", {}, [
          api_custom_element("lightning-badge", _lightningBadge, { 
            props: { "label": $cmp.material }
          })
        ])
    ];
  }

    var _tmpl$1 = lwc.registerTemplate(tmpl$1);

    class App extends lwc.LightningElement {
      constructor(...args) {
        super(...args);
        this.material = 'Steel';
      }

      connectedCallback() {
        setTimeout(() => {
          this.ready = true;
        }, 3000);
      }

    }

    lwc.registerDecorators(App, {
      track: {
        ready: 1
      }
    });

    var main = lwc.registerComponent(App, {
      tmpl: _tmpl$1
    });

    const element = lwc.createElement('c-app', { is: main, fallback: true });
    document.querySelector('main').appendChild(element);
}(Engine));
