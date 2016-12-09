# MessagePassing.js [![Build Status](https://travis-ci.org/uupaa/MessagePassing.js.svg)](https://travis-ci.org/uupaa/MessagePassing.js)

[![npm](https://nodei.co/npm/uupaa.messagepassing.js.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.messagepassing.js/)

Message passing.

This module made of [WebModule](https://github.com/uupaa/WebModule).

## Documentation
- [Spec](https://github.com/uupaa/MessagePassing.js/wiki/)
- [API Spec](https://github.com/uupaa/MessagePassing.js/wiki/MessagePassing)

## Browser, NW.js and Electron

```js
<script src="<module-dir>/lib/WebModule.js"></script>
<script src="<module-dir>/lib/MessagePassing.js"></script>
<script>

    // ## inbox method
    function _inbox(selector, arg1, arg2) {
        switch (selector) {
        case "ping": return "pong" + arg1;
        }
        return selector.toUpperCase();
    }


    // ## SubscriberClass
    function A() {};
    A.prototype.inbox = _inbox;


    // ## SubscriberObject
    var B = { inbox: _inbox };


    // ## init MessagePassing
    var mp = new MessagePassing();
    var a = new A();
    var b = B;


    // ## regsiter subscriber and register interrested selector
    mp.register(a, "Hello").            // A is interrested in "hello"
       register(b, ["Hello", "ping"]);  // B is interrested in "hello" and "ping"


    // ## call A.inbox("Hello") and B.inbox("Hello")
    var result1 = mp.to(a, b).send("Hello");
    console.log( result1[0], result1[1] );       // -> "HELLO", "HELLO"


    // ## call B.inbox("ping", 123)
    mp.to(a, b).post("ping", 123, function(result2) {
        console.log(result2[0]);                 // -> "pong123";
        console.log(result2[ mp.id(b) ]);        // -> "pong123";
    });


    // ## destruct
    mp.unregisterAll();

</script>
```

## WebWorkers

```js
importScripts("<module-dir>/lib/WebModule.js");
importScripts("<module-dir>/lib/MessagePassing.js");

```

## Node.js

```js
require("<module-dir>/lib/WebModule.js");
require("<module-dir>/lib/MessagePassing.js");

```

