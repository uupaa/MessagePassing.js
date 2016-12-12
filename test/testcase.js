var ModuleTestMessagePassing = (function(global) {

var test = new Test(["MessagePassing"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     true,  // enable worker test.
        node:       true,  // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       true,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() { },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

test.add([
    testMessagePassing_basicUsage,
    testMessagePassing_ClassSubscriber,
    testMessagePassing_ObjectSubscriber,
    testMessagePassing_to,
    testMessagePassing_unregister,
    testMessagePassing_reuseMessage,
    testMessagePassing_directBroadcast,
]);

// --- test cases ------------------------------------------
function testMessagePassing_basicUsage(test, pass, miss) {


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

    mp.register(a, "Hello").            // A is interrested in "Hello"
       register(b, ["Hello", "ping"]);  // B is interrested in "Hello" and "ping"


    // ## call A.inbox("Hello") and B.inbox("Hello")
    var result1 = mp.to(a, b).send("Hello");
    console.log( result1[0], result1[1] );       // -> "HELLO", "HELLO"

    // ## call B.inbox("ping", 123)
    mp.to(a, b).post("ping", 123, function(result2) {
        console.log(result2[0]);                 // -> "pong123";
        console.log(result2[ mp.id(b) ]);        // -> "pong123";

        if (result1.length === 2 &&
            result2.length === 1 &&
            result1[0] === "HELLO" &&
            result1[1] === "HELLO" &&
            result2[0] === "pong123") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    });

    mp.unregisterAll();
}

function testMessagePassing_ClassSubscriber(test, pass, miss) {

    function ClassSubscriber() {
    }
    ClassSubscriber.prototype.inbox = function(selector, param1, param2) {
        return selector + "ClassSubscriber";
    };

    var mp = new MessagePassing();
    var sub = new ClassSubscriber();

    mp.register(sub, ["Hello"]);

    var result = mp.send("Hello");

    if (result[ mp.id(sub) ] === "HelloClassSubscriber") {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMessagePassing_ObjectSubscriber(test, pass, miss) {

    var ObjectSubscriber = {
        inbox: function(selector, param1, param2) {
            return selector + "ObjectSubscriber";
        }
    };

    var mp = new MessagePassing();
    var sub = ObjectSubscriber;

    mp.register(sub, ["Hello"]);

    var result = mp.send("Hello");

    if (result[ mp.id(sub) ] === "HelloObjectSubscriber") {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMessagePassing_to(test, pass, miss) {
    // ClassSubscriber
    function Foo() { }
    Foo.prototype.inbox = function(selector, arg1, arg2) {
        return "Foo";
    };

    // ClassSubscriber
    function Bar() { }
    Bar.prototype.inbox = function(selector, arg1, arg2) {
        return "Bar";
    };

    var foo = new Foo();
    var bar = new Bar();
    var mp = new MessagePassing();

    mp.register(foo, "Hello").register(bar, "Hello");

    // Broadcast( to() -> to(foo, bar) )
    var result1 = mp.to().send("Hello"); // Foo#inbox と Bar#inbox にメッセージが届きます
    if (result1[0] === "Foo" &&
        result1[1] === "Bar" &&
        result1.length === 2 &&
        result1[ mp.id(foo) ] === "Foo" &&
        result1[ mp.id(bar) ] === "Bar") {

        // Multicast( to(foo).to(bar) -> to(foo, bar) )
        var result2 = mp.to(foo).to(bar).send("Hello"); // Foo#inbox と Bar#inbox にメッセージが届きます
        if (result2[0] === "Foo" &&
            result2[1] === "Bar" &&
            result2.length === 2 &&
            result2[ mp.id(foo) ] === "Foo" &&
            result2[ mp.id(bar) ] === "Bar") {

            // Multicast( to(bar, foo).to(foo).to(bar) -> to(bar, foo) )
            var result3 = mp.to(bar, foo).to(foo).to(bar).send("Hello"); // Foo#inbox と Bar#inbox にメッセージが届きます
            if (result3[0] === "Bar" &&
                result3[1] === "Foo" &&
                result3.length === 2 &&
                result3[ mp.id(foo) ] === "Foo" &&
                result3[ mp.id(bar) ] === "Bar") {

                // Multicast( to(foo, foo, bar) -> to(foo, bar ))
                var result4 = mp.to(foo, foo, bar).send("Hello"); // Foo#inbox と Bar#inbox にメッセージが届きます
                if (result4[0] === "Foo" &&
                    result4[1] === "Bar" &&
                    result4.length === 2 &&
                    result4[ mp.id(foo) ] === "Foo" &&
                    result4[ mp.id(bar) ] === "Bar") {

                    test.done(pass());
                    return;
                }
            }
        }
    }
    test.done(miss());
}

function testMessagePassing_unregister(test, pass, miss) {
    function Foo() { }
    Foo.prototype.inbox = function(selector, arg1, arg2) {
        return "Foo";
    };

    function Bar() { }
    Bar.prototype.inbox = function(selector, arg1, arg2) {
        return "Bar";
    };

    function Buz() { }
    Buz.prototype.inbox = function(selector, arg1, arg2) {
        return "Buz";
    };

    var foo = new Foo();
    var bar = new Bar();
    var buz = new Buz();
    var mp = new MessagePassing();

    { // dummy
        mp.register(foo);
        mp.register(bar);
        mp.register(buz);
        mp.unregisterAll(); // reset

        mp.register(foo);
        mp.unregister(foo);
    }

    // register buz
    mp.register(buz, "Hello");

    var result = mp.to().send("Hello");

    if (result[ mp.id(buz) ] === "Buz") {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMessagePassing_reuseMessage(test, pass, miss) {
    function Foo() { }
    Foo.prototype.inbox = function(selector, arg1, arg2) {
        return "Foo";
    };

    function Bar() { }
    Bar.prototype.inbox = function(selector, arg1, arg2) {
        return "Bar";
    };

    function Buz() { }
    Buz.prototype.inbox = function(selector, arg1, arg2) {
        return "Buz";
    };

    var foo = new Foo();
    var bar = new Bar();
    var buz = new Buz();
    var mp  = new MessagePassing().register(foo).register(bar).register(buz);
    var msg = mp.to(foo, bar, buz);

    var result1 = msg.send("ping");
    var result2 = msg.send("ping");

    if (result1[ mp.id(foo) ] === "Foo" &&
        result1[ mp.id(bar) ] === "Bar" &&
        result1[ mp.id(buz) ] === "Buz") {

        if (result2[ mp.id(foo) ] === "Foo" &&
            result2[ mp.id(bar) ] === "Bar" &&
            result2[ mp.id(buz) ] === "Buz") {

            test.done(pass());
            return;
        }
    }
    test.done(miss());
}

function testMessagePassing_directBroadcast(test, pass, miss) {
    function Foo() { }
    Foo.prototype.inbox = function(selector, arg1, arg2) {
        return "Foo";
    };

    function Bar() { }
    Bar.prototype.inbox = function(selector, arg1, arg2) {
        return "Bar";
    };

    function Buz() { }
    Buz.prototype.inbox = function(selector, arg1, arg2) {
        return "Buz";
    };

    var foo = new Foo();
    var bar = new Bar();
    var buz = new Buz();
    var mp1 = new MessagePassing().register(foo, ["Hello", "World"]).
                                   register(bar, ["Hello", "World"]).
                                   register(buz, ["Hello", "World"]);

    var result1 = mp1.send("Hello");

    mp1.post("World", function(result2) {
        if (result1.length === 3 &&
            result2.length === 3) {

            if (result1[ mp1.id(foo) ] === "Foo" &&
                result1[ mp1.id(bar) ] === "Bar" &&
                result1[ mp1.id(buz) ] === "Buz") {

                if (result2[ mp1.id(foo) ] === "Foo" &&
                    result2[ mp1.id(bar) ] === "Bar" &&
                    result2[ mp1.id(buz) ] === "Buz") {

                    test.done(pass());
                    return;
                }
            }
        }
        test.done(miss());
    });
}

return test.run();

})(GLOBAL);

