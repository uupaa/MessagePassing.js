(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MessagePassing", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
var _unique_id_counter = 0; // UINT32
var __MESSAGE_PASSING_ID__ = "__MESSAGE_PASSING_ID__";
// --- class / interfaces ----------------------------------
function MessagePassing() {
    this._subscriberMap = {}; // subscriber map. { id: subscriber, ... }
    this._selectorMap   = {}; // selector map. { id: SelectorStringArray }
}

MessagePassing["VERBOSE"] = VERBOSE;
MessagePassing["repository"] = "https://github.com/uupaa/MessagePassing.js";
MessagePassing["prototype"] = Object.create(MessagePassing, {
    "constructor":   { "value": MessagePassing                }, // new MessagePassing():MessagePassing
    "id":            { "value": MessagePassing_id             }, // #id(subscriber:SubscriberObject):SubscriberIDString
    "subscribers":   { "get":   MessagePassing_getSubscribers }, // #subscriber():SubscriberIDStringArray
    "register":      { "value": MessagePassing_register       }, // #register(subscriber:SubscriberObject, allowSelectors:SelectorStringArray|SelectorString = "ping"):this
    "unregister":    { "value": MessagePassing_unregister     }, // #unregister(subscriber:SubscriberObject):this
    "unregisterAll": { "value": MessagePassing_unregisterAll  }, // #unregisterAll():this
    "to":            { "value": MessagePassing_to             }, // #to(subscriber:SubscriberObject, ...):Message
    "send":          { "value": MessagePassing_send           }, // #send(selector:String, inboxArg:Any = null, ...):AnyObject
    "post":          { "value": MessagePassing_post           }, // #post(selector:String, inboxArg:Any = null, ..., callback:Function = null):void
});

function Message(subscriberMap, // @arg SubscriberMapObject - { id: SubscriberObject, ... }
                 selectorMap,   // @arg SelectorMapObject - { id: SelectorStringArray, ... }
                 to) {          // @arg StringArray - Subscriber id. ["custructor.unique-number", ...]
    this._subscriberMap = subscriberMap;
    this._selectorMap   = selectorMap;
    this._to            = to; // StringArray: ["id", ...]
}

Message["prototype"] = Object.create(Message, {
    "constructor":   { "value": Message                       }, // new Message(...):Message
    "to":            { "value": MessagePassing_to             }, // #to(subscriber:SubscriberObject, ...):Message
    "send":          { "value": MessagePassing_send           }, // #send(selector:String, inboxArg:Any = null, ...):AnyObject
    "post":          { "value": MessagePassing_post           }, // #post(selector:String, inboxArg:Any = null, ..., callback:Function = null):Object
});

// --- implements ------------------------------------------
function MessagePassing_id(subscriber) { // @arg SubscriberObject
                                         // @ret SubscriberIDString - "{SubscriberConstructor}.{unique-id-counter}"
    if (subscriber) {
        return subscriber[__MESSAGE_PASSING_ID__] || ""; // __MESSAGE_PASSING_ID__ is hidden property
    }
    return "";
}

function MessagePassing_getSubscribers() { // @ret SubscriberIDStringArray - [id, ...]
    return Object.keys(this._subscriberMap);
}

function MessagePassing_register(subscriber,       // @arg SubscriberObject - SubscriberObject has inbox method
                                 allowSelectors) { // @arg SelectorStringArray|SelectorString = "ping"
                                                   // @ret this
//{@dev
    if (VERIFY) {
        $valid($type(subscriber["inbox"], "Function"),           MessagePassing_register, "subscriber");
        $valid($type(allowSelectors, "StringArray|String|omit"), MessagePassing_register, "allowSelectors");
    }
//}@dev

    allowSelectors = allowSelectors || "ping";
    if (typeof allowSelectors === "string") {
        allowSelectors = [allowSelectors]; // String -> StringArray
    }

    var id = subscriber[__MESSAGE_PASSING_ID__] || "";

    if (!id) {
        id =  subscriber ? _getConstructorName(subscriber) : "anon";
        id += "." + (++_unique_id_counter).toString();
        if (Object["defineProperty"]) { // [ES5]
            Object["defineProperty"](subscriber, __MESSAGE_PASSING_ID__, { "value": id }); // hidden and shield
        } else { // legacy browser
            subscriber[__MESSAGE_PASSING_ID__]  = id;
        }
        if (MessagePassing["VERBOSE"]) { console.info("MessagePassing#register:", id); }
    }
    if ( !(id in this._subscriberMap) ) {
        this._subscriberMap[id] = subscriber;
    }
    if ( !(id in this._selectorMap) ) {
        this._selectorMap[id] = allowSelectors.slice(); // shallow copy
    }
    return this;

    function _getConstructorName(value) {
        return value.constructor["name"] ||
              (value.constructor + "").split(" ")[1].split("\x28")[0]; // fix IE
    }
}

function MessagePassing_unregister(subscriber) { // @arg SubscriberObject
                                                 // @ret this
    if ( _isValidSubscriberObject(subscriber) ) {
        var id = subscriber[__MESSAGE_PASSING_ID__] || "";

        if (id) {
            delete this._subscriberMap[id];
            delete this._selectorMap[id];

            if (MessagePassing["VERBOSE"]) { console.info("MessagePassing#unregister:", id); }
        }
    }
    return this;
}

function MessagePassing_unregisterAll() { // @ret this
                                          // @desc unregister all object.
    this._subscriberMap = {}; // unregister all
    this._selectorMap   = {};
    if (MessagePassing["VERBOSE"]) { console.info("MessagePassing#unregisterAll"); }
    return this;
}

function MessagePassing_to(/* subscriber, ... */) { // @var_args SubscriberObject = null - delivery to subscriber. null is broadcast
                                                    // @ret Message
                                                    // @desc create MessageObject and set subscribers.
    var to = this instanceof MessagePassing ? [] : this._to; // Message._to
    var args = arguments;

    if (!args.length) { // broadcast
        to = Object.keys(this._subscriberMap);
    } else { // unicast, multicast
        for (var i = 0, iz = args.length; i < iz; ++i) {
            var subscriber = args[i];
            if ( _isValidSubscriberObject(subscriber) ) {
                var id = MessagePassing_id(subscriber);
                if (id) {
                    if (to.indexOf(id) < 0) {
                        to.push(id);
                    }
                }
            }
        }
    }
    if (this instanceof MessagePassing) {
        if (MessagePassing["VERBOSE"]) { console.info("MessagePassing. new Message({ " + to.join(", ") + " })"); }
        return new Message(this._subscriberMap, this._selectorMap, to); // return Message
    }
    this._to = to;
    return this; // return Message
}

function MessagePassing_send(selector                // @arg String - selector
                             /*, inboxArg, ... */) { // @var_args Any = null - inbox args. inbox(selector, inboxArg, ...)
                                                     // @ret Object - { id: resultValue, ... }
                                                     // @desc send a message synchronously.
//{@dev
    if (VERIFY) {
        $valid($type(selector, "String"), MessagePassing_send, "selector");
        $valid(selector.length,           MessagePassing_send, "selector");
    }
//}@dev

    return _publish(this, Array.prototype.slice.call(arguments), false, null);
}

function MessagePassing_post(selector                // @arg String - selector
                             /*, inboxArg, ... */) { // @var_args Any = null - inbox args. inbox(selector, inboxArg, ...)
                                                     // @desc post a message asynchronously.
//{@dev
    if (VERIFY) {
        $valid($type(selector, "String"), MessagePassing_post, "selector");
        $valid(selector.length,           MessagePassing_post, "selector");
    }
//}@dev

    if (arguments.length >= 2 && typeof arguments[arguments.length - 1] === "function") {
        var callback = arguments[arguments.length - 1];

        _publish(this, Array.prototype.slice.call(arguments, 0, -1), true, callback);
    } else {
        _publish(this, Array.prototype.slice.call(arguments), true, null);
    }
}

function _publish(that, inboxParams, async, callback) {
    var selector = inboxParams[0];
    var to = that instanceof MessagePassing ? Object.keys(that._subscriberMap)
                                            : that._to;
    var result = { "length": 0 }; // AnyArrayLikeObject { id: resultValue, ... } + [resultValue, ...]

    if (async) {
        if (MessagePassing["VERBOSE"]) { console.info("MessagePassing. async call: { " + to.join(", ") + " }#inbox(\"" + selector + "\")"); }
        setTimeout(_call_inbox, 0);
    } else {
        if (MessagePassing["VERBOSE"]) { console.info("MessagePassing. sync call: { " + to.join(", ") + " }#inbox(\"" + selector + "\")"); }
        return _call_inbox();
    }

    function _call_inbox() {
        for (var i = 0, j = 0, iz = to.length; i < iz; ++i) {
            var id         = to[i];
            var subscriber = that._subscriberMap[id];

            if (subscriber) {
                if (_hasSelector(that._selectorMap[id], selector)) {
                    // r = subscriber.inbox(selector, args...)
                    //
                    var r = subscriber["inbox"].apply(subscriber, inboxParams);
                    result[id] = r; // add key/value
                    result[j]  = r; // add value
                    result["length"] = ++j;
                }
            }
        }
        if (callback) {
            callback(result);
        }
        return result;
    }
}

function _isValidSubscriberObject(subscriber) { // @arg SubscriberObject - SubscriberObject has inbox method
                                                // @ret Boolean
    if (subscriber && typeof subscriber["inbox"] === "function") {
        return true;
    }
    return false;
}

function _hasSelector(selectors,  // @arg SelectorStringArray - [selector, ...]
                      selector) { // @arg SelectorString
    if (!selectors.length) {
        return true;
    }
    return selectors.indexOf(selector) >= 0;
}

return MessagePassing; // return entity

});

