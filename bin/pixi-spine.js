(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @namespace PIXI.spine
 */
module.exports = require('pixi.js').spine = {
    Spine:          require('./Spine'),
    SpineRuntime:   require('./SpineRuntime'),
    loaders:        require('./loaders')
};

},{"./Spine":52,"./SpineRuntime":50,"./loaders":55,"pixi.js":"pixi.js"}],2:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))

},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
'use strict';

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var prefix = '~'+ event
    , available = this._events && this._events[prefix];

  if (exists) return !!available;
  if (!available) return [];
  if (this._events[prefix].fn) return [this._events[prefix].fn];

  for (var i = 0, l = this._events[prefix].length, ee = new Array(l); i < l; i++) {
    ee[i] = this._events[prefix][i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var prefix = '~'+ event;

  if (!this._events || !this._events[prefix]) return false;

  var listeners = this._events[prefix]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , prefix = '~'+ event;

  if (!this._events) this._events = {};
  if (!this._events[prefix]) this._events[prefix] = listener;
  else {
    if (!this._events[prefix].fn) this._events[prefix].push(listener);
    else this._events[prefix] = [
      this._events[prefix], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , prefix = '~'+ event;

  if (!this._events) this._events = {};
  if (!this._events[prefix]) this._events[prefix] = listener;
  else {
    if (!this._events[prefix].fn) this._events[prefix].push(listener);
    else this._events[prefix] = [
      this._events[prefix], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var prefix = '~'+ event;

  if (!this._events || !this._events[prefix]) return this;

  var listeners = this._events[prefix]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[prefix] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[prefix];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events['~'+ event];
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the module.
//
module.exports = EventEmitter;

},{}],5:[function(require,module,exports){
var async = require('async'),
    Resource = require('./Resource'),
    EventEmitter = require('eventemitter3');

/**
 * Manages the state and loading of multiple resources to load.
 *
 * @class
 * @param [baseUrl=''] {string} The base url for all resources loaded by this loader.
 * @param [concurrency=10] {number} The number of resources to load concurrently.
 */
function Loader(baseUrl, concurrency) {
    EventEmitter.call(this);

    concurrency = concurrency || 10;

    /**
     * The base url for all resources loaded by this loader.
     *
     * @member {string}
     */
    this.baseUrl = baseUrl || '';

    /**
     * The progress percent of the loader going through the queue.
     *
     * @member {number}
     */
    this.progress = 0;

    /**
     * Loading state of the loader, true if it is currently loading resources.
     *
     * @member {boolean}
     */
    this.loading = false;

    /**
     * The percentage of total progress that a single resource represents.
     *
     * @member {number}
     */
    this._progressChunk = 0;

    /**
     * The middleware to run before loading each resource.
     *
     * @member {function[]}
     */
    this._beforeMiddleware = [];

    /**
     * The middleware to run after loading each resource.
     *
     * @member {function[]}
     */
    this._afterMiddleware = [];

    /**
     * The `_loadResource` function bound with this object context.
     *
     * @private
     * @member {function}
     */
    this._boundLoadResource = this._loadResource.bind(this);

    /**
     * The `_onLoad` function bound with this object context.
     *
     * @private
     * @member {function}
     */
    this._boundOnLoad = this._onLoad.bind(this);

    /**
     * The resource buffer that fills until `load` is called to start loading resources.
     *
     * @private
     * @member {Resource[]}
     */
    this._buffer = [];

    /**
     * Used to track load completion.
     *
     * @private
     * @member {number}
     */
    this._numToLoad = 0;

    /**
     * The resources waiting to be loaded.
     *
     * @private
     * @member {Resource[]}
     */
    this._queue = async.queue(this._boundLoadResource, concurrency);

    /**
     * All the resources for this loader keyed by name.
     *
     * @member {object<string, Resource>}
     */
    this.resources = {};

    /**
     * Emitted once per loaded or errored resource.
     *
     * @event progress
     * @memberof Loader#
     */

    /**
     * Emitted once per errored resource.
     *
     * @event error
     * @memberof Loader#
     */

    /**
     * Emitted once per loaded resource.
     *
     * @event load
     * @memberof Loader#
     */

    /**
     * Emitted when the loader begins to process the queue.
     *
     * @event start
     * @memberof Loader#
     */

    /**
     * Emitted when the queued resources all load.
     *
     * @event complete
     * @memberof Loader#
     */
}

Loader.prototype = Object.create(EventEmitter.prototype);
Loader.prototype.constructor = Loader;
module.exports = Loader;

/**
 * Adds a resource (or multiple resources) to the loader queue.
 *
 * This function can take a wide variety of different parameters. The only thing that is always
 * required the url to load. All the following will work:
 *
 * ```js
 * loader
 *     // normal param syntax
 *     .add('key', 'http://...', function () {})
 *     .add('http://...', function () {})
 *     .add('http://...')
 *
 *     // object syntax
 *     .add({
 *         name: 'key2',
 *         url: 'http://...'
 *     }, function () {})
 *     .add({
 *         url: 'http://...'
 *     }, function () {})
 *     .add({
 *         name: 'key3',
 *         url: 'http://...'
 *         onComplete: function () {}
 *     })
 *     .add({
 *         url: 'https://...',
 *         onComplete: function () {},
 *         crossOrigin: true
 *     })
 *
 *     // you can also pass an array of objects or urls or both
 *     .add([
 *         { name: 'key4', url: 'http://...', onComplete: function () {} },
 *         { url: 'http://...', onComplete: function () {} },
 *         'http://...'
 *     ]);
 * ```
 *
 * @alias enqueue
 * @param [name] {string} The name of the resource to load, if not passed the url is used.
 * @param url {string} The url for this resource, relative to the baseUrl of this loader.
 * @param [options] {object} The options for the load.
 * @param [options.crossOrigin] {boolean} Is this request cross-origin? Default is to determine automatically.
 * @param [options.loadType=Resource.LOAD_TYPE.XHR] {Resource.XHR_LOAD_TYPE} How should this resource be loaded?
 * @param [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] {Resource.XHR_RESPONSE_TYPE} How should the data being
 *      loaded be interpreted when using XHR?
 * @param [callback] {function} Function to call when this specific resource completes loading.
 * @return {Loader}
 */
Loader.prototype.add = Loader.prototype.enqueue = function (name, url, options, cb) {
    // special case of an array of objects or urls
    if (Array.isArray(name)) {
        for (var i = 0; i < name.length; ++i) {
            this.add(name[i]);
        }

        return this;
    }

    // if an object is passed instead of params
    if (typeof name === 'object') {
        cb = url || name.callback || name.onComplete;
        options = name;
        url = name.url;
        name = name.name || name.key || name.url;
    }

    // case where no name is passed shift all args over by one.
    if (typeof url !== 'string') {
        cb = options;
        options = url;
        url = name;
    }

    // now that we shifted make sure we have a proper url.
    if (typeof url !== 'string') {
        throw new Error('No url passed to add resource to loader.');
    }

    // options are optional so people might pass a function and no options
    if (typeof options === 'function') {
        cb = options;
        options = null;
    }

    // check if resource already exists.
    if (this.resources[name]) {
        throw new Error('Resource with name "' + name + '" already exists.');
    }

    // add base url if this isn't a data url
    if (url.indexOf('data:') !== 0) {
        url = this.baseUrl + url;
    }

    // create the store the resource
    this.resources[name] = new Resource(name, url, options);

    if (typeof cb === 'function') {
        this.resources[name].once('afterMiddleware', cb);
    }

    this._numToLoad++;

    // if already loading add it to the worker queue
    if (this._queue.started) {
        this._queue.push(this.resources[name]);
        this._progressChunk = (100 - this.progress) / (this._queue.length() + this._queue.running());
    }
    // otherwise buffer it to be added to the queue later
    else {
        this._buffer.push(this.resources[name]);
        this._progressChunk = 100 / this._buffer.length;
    }

    return this;
};


/**
 * Sets up a middleware function that will run *before* the
 * resource is loaded.
 *
 * @alias pre
 * @param middleware {function} The middleware function to register.
 * @return {Loader}
 */
Loader.prototype.before = Loader.prototype.pre = function (fn) {
    this._beforeMiddleware.push(fn);

    return this;
};

/**
 * Sets up a middleware function that will run *after* the
 * resource is loaded.
 *
 * @alias use
 * @param middleware {function} The middleware function to register.
 * @return {Loader}
 */
Loader.prototype.after = Loader.prototype.use = function (fn) {
    this._afterMiddleware.push(fn);

    return this;
};

/**
 * Resets the queue of the loader to prepare for a new load.
 *
 * @return {Loader}
 */
Loader.prototype.reset = function () {
    this._buffer.length = 0;

    this._queue.kill();
    this._queue.started = false;

    this.progress = 0;
    this._progressChunk = 0;
    this.loading = false;
};

/**
 * Starts loading the queued resources.
 *
 * @fires start
 * @param [callback] {function} Optional callback that will be bound to the `complete` event.
 * @return {Loader}
 */
Loader.prototype.load = function (cb) {
    // register complete callback if they pass one
    if (typeof cb === 'function') {
        this.once('complete', cb);
    }

    // if the queue has already started we are done here
    if (this._queue.started) {
        return this;
    }

    // notify of start
    this.emit('start', this);

    // start the internal queue
    for (var i = 0; i < this._buffer.length; ++i) {
        this._queue.push(this._buffer[i]);
    }

    // empty the buffer
    this._buffer.length = 0;

    return this;
};

/**
 * Loads a single resource.
 *
 * @fires progress
 * @private
 */
Loader.prototype._loadResource = function (resource, dequeue) {
    var self = this;

    resource._dequeue = dequeue;

    this._runMiddleware(resource, this._beforeMiddleware, function () {
        // resource.on('progress', self.emit.bind(self, 'progress'));

        resource.load(self._boundOnLoad);
    });
};

/**
 * Called once each resource has loaded.
 *
 * @fires complete
 * @private
 */
Loader.prototype._onComplete = function () {
    this.emit('complete', this, this.resources);
};

/**
 * Called each time a resources is loaded.
 *
 * @fires progress
 * @fires error
 * @fires load
 * @private
 */
Loader.prototype._onLoad = function (resource) {
    this.progress += this._progressChunk;

    this.emit('progress', this, resource);

    if (resource.error) {
        this.emit('error', resource.error, this, resource);
    }
    else {
        this.emit('load', this, resource);
    }

    // run middleware, this *must* happen before dequeue so sub-assets get added properly
    this._runMiddleware(resource, this._afterMiddleware, function () {
        resource.emit('afterMiddleware', resource);

        this._numToLoad--;

        // do completion check
        if (this._numToLoad === 0) {
            this._onComplete();
        }
    });

    // remove this resource from the async queue
    resource._dequeue();
};

/**
 * Run middleware functions on a resource.
 *
 * @private
 */
Loader.prototype._runMiddleware = function (resource, fns, cb) {
    var self = this;

    async.eachSeries(fns, function (fn, next) {
        fn.call(self, resource, next);
    }, cb.bind(this, resource));
};

Loader.LOAD_TYPE = Resource.LOAD_TYPE;
Loader.XHR_READY_STATE = Resource.XHR_READY_STATE;
Loader.XHR_RESPONSE_TYPE = Resource.XHR_RESPONSE_TYPE;

},{"./Resource":6,"async":2,"eventemitter3":4}],6:[function(require,module,exports){
var EventEmitter = require('eventemitter3'),
    // tests is CORS is supported in XHR, if not we need to use XDR
    useXdr = !!(window.XDomainRequest && !('withCredentials' in (new XMLHttpRequest())));

/**
 * Manages the state and loading of a single resource represented by
 * a single URL.
 *
 * @class
 * @param name {string} The name of the resource to load.
 * @param url {string|string[]} The url for this resource, for audio/video loads you can pass an array of sources.
 * @param [options] {object} The options for the load.
 * @param [options.crossOrigin] {boolean} Is this request cross-origin? Default is to determine automatically.
 * @param [options.loadType=Resource.LOAD_TYPE.XHR] {Resource.LOAD_TYPE} How should this resource be loaded?
 * @param [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] {Resource.XHR_RESPONSE_TYPE} How should the data being
 *      loaded be interpreted when using XHR?
 */
function Resource(name, url, options) {
    EventEmitter.call(this);

    options = options || {};

    if (typeof name !== 'string' || typeof url !== 'string') {
        throw new Error('Both name and url are required for constructing a resource.');
    }

    /**
     * The name of this resource.
     *
     * @member {string}
     * @readonly
     */
    this.name = name;

    /**
     * The url used to load this resource.
     *
     * @member {string}
     * @readonly
     */
    this.url = url;

    /**
     * The data that was loaded by the resource.
     *
     * @member {any}
     */
    this.data = null;

    /**
     * Is this request cross-origin? If unset, determined automatically.
     *
     * @member {string}
     */
    this.crossOrigin = options.crossOrigin;

    /**
     * The method of loading to use for this resource.
     *
     * @member {Resource.LOAD_TYPE}
     */
    this.loadType = options.loadType || this._determineLoadType();

    /**
     * The type used to load the resource via XHR. If unset, determined automatically.
     *
     * @member {string}
     */
    this.xhrType = options.xhrType;

    /**
     * The error that occurred while loading (if any).
     *
     * @member {Error}
     * @readonly
     */
    this.error = null;

    /**
     * The XHR object that was used to load this resource. This is only set
     * when `loadType` is `Resource.LOAD_TYPE.XHR`.
     *
     * @member {XMLHttpRequest}
     */
    this.xhr = null;

    /**
     * Describes if this resource was loaded as json. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isJson = false;

    /**
     * Describes if this resource was loaded as xml. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isXml = false;

    /**
     * Describes if this resource was loaded as an image tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isImage = false;

    /**
     * Describes if this resource was loaded as an audio tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isAudio = false;

    /**
     * Describes if this resource was loaded as a video tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isVideo = false;

    /**
     * The `dequeue` method that will be used a storage place for the async queue dequeue method
     * used privately by the loader.
     *
     * @member {function}
     * @private
     */
    this._dequeue = null;

    /**
     * The `complete` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundComplete = this.complete.bind(this);

    /**
     * The `_onError` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundOnError = this._onError.bind(this);

    /**
     * The `_onProgress` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundOnProgress = this._onProgress.bind(this);

    // xhr callbacks
    this._boundXhrOnError = this._xhrOnError.bind(this);
    this._boundXhrOnAbort = this._xhrOnAbort.bind(this);
    this._boundXhrOnLoad = this._xhrOnLoad.bind(this);
    this._boundXdrOnTimeout = this._xdrOnTimeout.bind(this);

    /**
     * Emitted when the resource beings to load.
     *
     * @event start
     * @memberof Resource#
     */

    /**
     * Emitted each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     *
     * @event progress
     * @memberof Resource#
     */

    /**
     * Emitted once this resource has loaded, if there was an error it will
     * be in the `error` property.
     *
     * @event complete
     * @memberof Resource#
     */
}

Resource.prototype = Object.create(EventEmitter.prototype);
Resource.prototype.constructor = Resource;
module.exports = Resource;

/**
 * Marks the resource as complete.
 *
 * @fires complete
 */
Resource.prototype.complete = function () {
    // TODO: Clean this up in a wrapper or something...gross....
    if (this.data && this.data.removeEventListener) {
        this.data.removeEventListener('error', this._boundOnError);
        this.data.removeEventListener('load', this._boundComplete);
        this.data.removeEventListener('progress', this._boundOnProgress);
        this.data.removeEventListener('canplaythrough', this._boundComplete);
    }

    if (this.xhr) {
        if (this.xhr.removeEventListener) {
            this.xhr.removeEventListener('error', this._boundXhrOnError);
            this.xhr.removeEventListener('abort', this._boundXhrOnAbort);
            this.xhr.removeEventListener('progress', this._boundOnProgress);
            this.xhr.removeEventListener('load', this._boundXhrOnLoad);
        }
        else {
            this.xhr.onerror = null;
            this.xhr.ontimeout = null;
            this.xhr.onprogress = null;
            this.xhr.onload = null;
        }
    }

    this.emit('complete', this);
};

/**
 * Kicks off loading of this resource.
 *
 * @fires start
 * @param [callback] {function} Optional callback to call once the resource is loaded.
 */
Resource.prototype.load = function (cb) {
    this.emit('start', this);

    // if a callback is set, listen for complete event
    if (cb) {
        this.once('complete', cb);
    }

    // if unset, determine the value
    if (typeof this.crossOrigin !== 'string') {
        this.crossOrigin = this._determineCrossOrigin();
    }

    switch(this.loadType) {
        case Resource.LOAD_TYPE.IMAGE:
            this._loadImage();
            break;

        case Resource.LOAD_TYPE.AUDIO:
            this._loadElement('audio');
            break;

        case Resource.LOAD_TYPE.VIDEO:
            this._loadElement('video');
            break;

        case Resource.LOAD_TYPE.XHR:
            /* falls through */
        default:
            if (useXdr) {
                this._loadXdr();
            }
            else {
                this._loadXhr();
            }
            break;
    }
};

/**
 * Loads this resources using an Image object.
 *
 * @private
 */
Resource.prototype._loadImage = function () {
    this.data = new Image();

    if (this.crossOrigin) {
        this.data.crossOrigin = '';
    }

    this.data.src = this.url;

    this.isImage = true;

    this.data.addEventListener('error', this._boundOnError, false);
    this.data.addEventListener('load', this._boundComplete, false);
    this.data.addEventListener('progress', this._boundOnProgress, false);
};

/**
 * Loads this resources using an HTMLAudioElement or HTMLVideoElement.
 *
 * @private
 */
Resource.prototype._loadElement = function (type) {
    this.data = document.createElement(type);

    if (Array.isArray(this.url)) {
        for (var i = 0; i < this.url.length; ++i) {
            this.data.appendChild(this._createSource(type, this.url[i]));
        }
    }
    else {
        this.data.appendChild(this._createSource(type, this.url));
    }

    this['is' + type[0].toUpperCase() + type.substring(1)] = true;

    this.data.addEventListener('error', this._boundOnError, false);
    this.data.addEventListener('load', this._boundComplete, false);
    this.data.addEventListener('progress', this._boundOnProgress, false);
    this.data.addEventListener('canplaythrough', this._boundComplete, false);

    this.data.load();
};

/**
 * Loads this resources using an XMLHttpRequest.
 *
 * @private
 */
Resource.prototype._loadXhr = function () {
    // if unset, determine the value
    if (typeof this.xhrType !== 'string') {
        this.xhrType = this._determineXhrType();
    }

    var xhr = this.xhr = new XMLHttpRequest();

    // set the request type and url
    xhr.open('GET', this.url, true);

    // load json as text and parse it ourselves. We do this because some browsers
    // *cough* safari *cough* can't deal with it.
    if (this.xhrType === Resource.XHR_RESPONSE_TYPE.JSON || this.xhrType === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
        xhr.responseType = Resource.XHR_RESPONSE_TYPE.TEXT;
    }
    else {
        xhr.responseType = this.xhrType;
    }

    xhr.addEventListener('error', this._boundXhrOnError, false);
    xhr.addEventListener('abort', this._boundXhrOnAbort, false);
    xhr.addEventListener('progress', this._boundOnProgress, false);
    xhr.addEventListener('load', this._boundXhrOnLoad, false);

    xhr.send();
};

/**
 * Loads this resources using an XDomainRequest. This is here because we need to support IE9 (gross).
 *
 * @private
 */
Resource.prototype._loadXdr = function () {
    // if unset, determine the value
    if (typeof this.xhrType !== 'string') {
        this.xhrType = this._determineXhrType();
    }

    var xdr = this.xhr = new XDomainRequest();

    // XDomainRequest has a few quirks. Occasionally it will abort requests
    // A way to avoid this is to make sure ALL callbacks are set even if not used
    // More info here: http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
    xdr.timeout = 5000;

    xdr.onerror = this._boundXhrOnError;
    xdr.ontimeout = this._boundXdrOnTimeout;
    xdr.onprogress = this._boundOnProgress;
    xdr.onload = this._boundXhrOnLoad;

    xdr.open('GET', this.url, true);

    //  Note: The xdr.send() call is wrapped in a timeout to prevent an issue with the interface where some requests are lost
    //  if multiple XDomainRequests are being sent at the same time.
    // Some info here: https://github.com/photonstorm/phaser/issues/1248
    setTimeout(function () {
        xdr.send();
    }, 0);
};

/**
 * Creates a source used in loading via an element.
 *
 * @param type {string} The element type (video or audio).
 * @param url {string} The source URL to load from.
 * @param [mime] {string} The mime type of the video
 * @private
 */
Resource.prototype._createSource = function (type, url, mime) {
    if (!mime) {
        mime = type + '/' + url.substr(url.lastIndexOf('.') + 1);
    }

    var source = document.createElement('source');

    source.src = url;
    source.type = mime;

    return source;
};

/**
 * Called if a load errors out.
 *
 * @param event {Event} The error event from the element that emits it.
 * @private
 */
Resource.prototype._onError = function (event) {
    this.error = new Error('Failed to load element using ' + event.target.nodeName);
    this.complete();
};

/**
 * Called if a load progress event fires for xhr/xdr.
 *
 * @fires progress
 * @param event {XMLHttpRequestProgressEvent|Event}
 * @private
 */
Resource.prototype._onProgress =  function (event) {
    if (event.lengthComputable) {
        this.emit('progress', this, event.loaded / event.total);
    }
};

/**
 * Called if an error event fires for xhr/xdr.
 *
 * @param event {XMLHttpRequestErrorEvent|Event}
 * @private
 */
Resource.prototype._xhrOnError = function () {
    this.error = new Error(
        reqType(this.xhr) + ' Request failed. ' +
        'Status: ' + this.xhr.status + ', text: "' + this.xhr.statusText + '"'
    );

    this.complete();
};

/**
 * Called if an abort event fires for xhr.
 *
 * @param event {XMLHttpRequestAbortEvent}
 * @private
 */
Resource.prototype._xhrOnAbort = function () {
    this.error = new Error(reqType(this.xhr) + ' Request was aborted by the user.');
    this.complete();
};

/**
 * Called if a timeout event fires for xdr.
 *
 * @param event {Event}
 * @private
 */
Resource.prototype._xdrOnTimeout = function () {
    this.error = new Error(reqType(this.xhr) + ' Request timed out.');
    this.complete();
};

/**
 * Called when data successfully loads from an xhr/xdr request.
 *
 * @param event {XMLHttpRequestLoadEvent|Event}
 * @private
 */
Resource.prototype._xhrOnLoad = function () {
    var xhr = this.xhr;

    if (xhr.status === 200) {
        // if text, just return it
        if (this.xhrType === Resource.XHR_RESPONSE_TYPE.TEXT) {
            this.data = xhr.responseText;
        }
        // if json, parse into json object
        else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.JSON) {
            try {
                this.data = JSON.parse(xhr.responseText);
                this.isJson = true;
            } catch(e) {
                this.error = new Error('Error trying to parse loaded json:', e);
            }
        }
        // if xml, parse into an xml document or div element
        else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
            try {
                if (window.DOMParser) {
                    var domparser = new DOMParser();
                    this.data = domparser.parseFromString(xhr.responseText, 'text/xml');
                }
                else {
                    var div = document.createElement('div');
                    div.innerHTML = xhr.responseText;
                    this.data = div;
                }
                this.isXml = true;
            } catch (e) {
                this.error = new Error('Error trying to parse loaded xml:', e);
            }
        }
        // other types just return the response
        else {
            this.data = xhr.response || xhr.responseText;
        }
    }
    else {
        this.error = new Error('[' + xhr.status + ']' + xhr.statusText + ':' + xhr.responseURL);
    }

    this.complete();
};

function reqType(xhr) {
    return xhr.toString().replace('object ', '');
}

/**
 * Sets the `crossOrigin` property for this resource based on if the url
 * for this resource is cross-origin. If crossOrigin was manually set, this
 * function does nothing.
 *
 * @private
 * @return {string} The crossOrigin value to use (or empty string for none).
 */
Resource.prototype._determineCrossOrigin = function () {
    // data: and javascript: urls are considered same-origin
    if (this.url.indexOf('data:') === 0) {
        return '';
    }

    // check if this is a cross-origin url
    var loc = window.location,
        a = document.createElement('a');

    a.href = this.url;

    // if cross origin
    if (a.hostname !== loc.hostname || a.port !== loc.port || a.protocol !== loc.protocol) {
        return 'anonymous';
    }

    return '';
};

/**
 * Determines the responseType of an XHR request based on the extension of the
 * resource being loaded.
 *
 * @private
 * @return {Resource.XHR_RESPONSE_TYPE} The responseType to use.
 */
Resource.prototype._determineXhrType = function () {
    var ext = this.url.substr(this.url.lastIndexOf('.') + 1);

    switch(ext) {
        // xml
        case 'xhtml':
        case 'html':
        case 'htm':
        case 'xml':
        case 'tmx':
        case 'tsx':
        case 'svg':
            return Resource.XHR_RESPONSE_TYPE.DOCUMENT;

        // images
        case 'gif':
        case 'png':
        case 'bmp':
        case 'jpg':
        case 'jpeg':
        case 'tif':
        case 'tiff':
        case 'webp':
            return Resource.XHR_RESPONSE_TYPE.BLOB;

        // json
        case 'json':
            return Resource.XHR_RESPONSE_TYPE.JSON;

        // text
        case 'text':
        case 'txt':
            /* falls through */
        default:
            return Resource.XHR_RESPONSE_TYPE.TEXT;
    }
};

Resource.prototype._determineLoadType = function () {
    var ext = this.url.substr(this.url.lastIndexOf('.') + 1);

    switch(ext) {
        // images
        case 'gif':
        case 'png':
        case 'bmp':
        case 'jpg':
        case 'jpeg':
        case 'tif':
        case 'tiff':
        case 'webp':
            return Resource.LOAD_TYPE.IMAGE;

        default:
            return Resource.LOAD_TYPE.XHR;
    }
};

/**
 * Determines the mime type of an XHR request based on the responseType of
 * resource being loaded.
 *
 * @private
 * @return {string} The mime type to use.
 */
Resource.prototype._getMimeFromXhrType = function (type) {
    switch(type) {
        case Resource.XHR_RESPONSE_TYPE.BUFFER:
            return 'application/octet-binary';

        case Resource.XHR_RESPONSE_TYPE.BLOB:
            return 'application/blob';

        case Resource.XHR_RESPONSE_TYPE.DOCUMENT:
            return 'application/xml';

        case Resource.XHR_RESPONSE_TYPE.JSON:
            return 'application/json';

        case Resource.XHR_RESPONSE_TYPE.DEFAULT:
        case Resource.XHR_RESPONSE_TYPE.TEXT:
            /* falls through */
        default:
            return 'text/plain';

    }
};

/**
 * The types of loading a resource can use.
 *
 * @static
 * @constant
 * @property {object} LOAD_TYPE
 * @property {number} LOAD_TYPE.XHR - Uses XMLHttpRequest to load the resource.
 * @property {number} LOAD_TYPE.IMAGE - Uses an `Image` object to load the resource.
 * @property {number} LOAD_TYPE.AUDIO - Uses an `Audio` object to load the resource.
 * @property {number} LOAD_TYPE.VIDEO - Uses a `Video` object to load the resource.
 */
Resource.LOAD_TYPE = {
    XHR:    1,
    IMAGE:  2,
    AUDIO:  3,
    VIDEO:  4
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @constant
 * @property {object} XHR_READY_STATE
 * @property {number} XHR_READY_STATE.UNSENT - open()has not been called yet.
 * @property {number} XHR_READY_STATE.OPENED - send()has not been called yet.
 * @property {number} XHR_READY_STATE.HEADERS_RECEIVED - send() has been called, and headers and status are available.
 * @property {number} XHR_READY_STATE.LOADING - Downloading; responseText holds partial data.
 * @property {number} XHR_READY_STATE.DONE - The operation is complete.
 */
Resource.XHR_READY_STATE = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @constant
 * @property {object} XHR_RESPONSE_TYPE
 * @property {string} XHR_RESPONSE_TYPE.DEFAULT - defaults to text
 * @property {string} XHR_RESPONSE_TYPE.BUFFER - ArrayBuffer
 * @property {string} XHR_RESPONSE_TYPE.BLOB - Blob
 * @property {string} XHR_RESPONSE_TYPE.DOCUMENT - Document
 * @property {string} XHR_RESPONSE_TYPE.JSON - Object
 * @property {string} XHR_RESPONSE_TYPE.TEXT - String
 */
Resource.XHR_RESPONSE_TYPE = {
    DEFAULT:    'text',
    BUFFER:     'arraybuffer',
    BLOB:       'blob',
    DOCUMENT:   'document',
    JSON:       'json',
    TEXT:       'text'
};

},{"eventemitter3":4}],7:[function(require,module,exports){
module.exports = {

    // private property
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    encodeBinary: function (input) {
        var output = "";
        var bytebuffer;
        var encodedCharIndexes = new Array(4);
        var inx = 0;
        var jnx = 0;
        var paddingBytes = 0;

        while (inx < input.length) {
            // Fill byte buffer array
            bytebuffer = new Array(3);
            for (jnx = 0; jnx < bytebuffer.length; jnx++) {
                if (inx < input.length) {
                    // throw away high-order byte, as documented at:
                    // https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
                    bytebuffer[jnx] = input.charCodeAt(inx++) & 0xff;
                }
                else {
                    bytebuffer[jnx] = 0;
                }
            }

            // Get each encoded character, 6 bits at a time
            // index 1: first 6 bits
            encodedCharIndexes[0] = bytebuffer[0] >> 2;
            // index 2: second 6 bits (2 least significant bits from input byte 1 + 4 most significant bits from byte 2)
            encodedCharIndexes[1] = ((bytebuffer[0] & 0x3) << 4) | (bytebuffer[1] >> 4);
            // index 3: third 6 bits (4 least significant bits from input byte 2 + 2 most significant bits from byte 3)
            encodedCharIndexes[2] = ((bytebuffer[1] & 0x0f) << 2) | (bytebuffer[2] >> 6);
            // index 3: forth 6 bits (6 least significant bits from input byte 3)
            encodedCharIndexes[3] = bytebuffer[2] & 0x3f;

            // Determine whether padding happened, and adjust accordingly
            paddingBytes = inx - (input.length - 1);
            switch (paddingBytes) {
                case 2:
                    // Set last 2 characters to padding char
                    encodedCharIndexes[3] = 64;
                    encodedCharIndexes[2] = 64;
                    break;

                case 1:
                    // Set last character to padding char
                    encodedCharIndexes[3] = 64;
                    break;

                default:
                    break; // No padding - proceed
            }

            // Now we will grab each appropriate character out of our keystring
            // based on our index array and append it to the output string
            for (jnx = 0; jnx < encodedCharIndexes.length; jnx++) {
                output += this._keyStr.charAt(encodedCharIndexes[jnx]);
            }
        }
        return output;
    }
};

},{}],8:[function(require,module,exports){
module.exports = require('./Loader');

module.exports.Resource = require('./Resource');

module.exports.middleware = {
    caching: {
        memory: require('./middlewares/caching/memory')
    },
    parsing: {
        blob: require('./middlewares/parsing/blob')
    }
};

},{"./Loader":5,"./Resource":6,"./middlewares/caching/memory":9,"./middlewares/parsing/blob":10}],9:[function(require,module,exports){
// a simple in-memory cache for resources
var cache = {};

module.exports = function () {
    return function (resource, next) {
        // if cached, then set data and complete the resource
        if (cache[resource.url]) {
            resource.data = cache[resource.url];
            resource.complete();
        }
        // if not cached, wait for complete and store it in the cache.
        else {
            resource.once('complete', function () {
               cache[this.url] = this.data;
            });

            next();
        }
    };
};

},{}],10:[function(require,module,exports){
var Resource = require('../../Resource'),
    b64 = require('../../b64');

window.URL = window.URL || window.webkitURL;

// a middleware for transforming XHR loaded Blobs into more useful objects

module.exports = function () {
    return function (resource, next) {
        if (!resource.data) {
            return next();
        }

        // if this was an XHR load of a blob
        if (resource.xhr && resource.xhrType === Resource.XHR_RESPONSE_TYPE.BLOB) {
            // if there is no blob support we probably got a binary string back
            if (!window.Blob || typeof resource.data === 'string') {
                var type = resource.xhr.getResponseHeader('content-type');

                // this is an image, convert the binary string into a data url
                if (type && type.indexOf('image') === 0) {
                    resource.data = new Image();
                    resource.data.src = 'data:' + type + ';base64,' + b64.encodeBinary(resource.xhr.responseText);

                    resource.isImage = true;

                    // wait until the image loads and then callback
                    resource.data.onload = function () {
                        resource.data.onload = null;

                        next();
                    };
                }
            }
            // if content type says this is an image, then we should transform the blob into an Image object
            else if (resource.data.type.indexOf('image') === 0) {
                var src = URL.createObjectURL(resource.data);

                resource.blob = resource.data;
                resource.data = new Image();
                resource.data.src = src;

                resource.isImage = true;

                // cleanup the no longer used blob after the image loads
                resource.data.onload = function () {
                    URL.revokeObjectURL(src);
                    resource.data.onload = null;

                    next();
                };
            }
        }
        else {
            next();
        }
    };
};

},{"../../Resource":6,"../../b64":7}],11:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = function (name, timelines, duration)
{
    this.name = name;
    this.timelines = timelines;
    this.duration = duration;
};
spine.Animation.prototype = {
    apply: function (skeleton, lastTime, time, loop, events)
    {
        if (loop && this.duration != 0)
        {
            time %= this.duration;
            lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, 1);
    },
    mix: function (skeleton, lastTime, time, loop, events, alpha)
    {
        if (loop && this.duration != 0)
        {
            time %= this.duration;
            lastTime %= this.duration;
        }
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, alpha);
    }
};
spine.Animation.binarySearch = function (values, target, step)
{
    var low = 0;
    var high = Math.floor(values.length / step) - 2;
    if (!high) return step;
    var current = high >>> 1;
    while (true)
    {
        if (values[(current + 1) * step] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return (low + 1) * step;
        current = (low + high) >>> 1;
    }
};
spine.Animation.binarySearch1 = function (values, target)
{
    var low = 0;
    var high = values.length - 2;
    if (!high) return 1;
    var current = high >>> 1;
    while (true)
    {
        if (values[current + 1] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return low + 1;
        current = (low + high) >>> 1;
    }
};
spine.Animation.linearSearch = function (values, target, step)
{
    for (var i = 0, last = values.length - step; i <= last; i += step)
        if (values[i] > target) return i;
    return -1;
};
module.exports = spine.Animation;

},{"../SpineUtil":51}],12:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.TrackEntry = require('./TrackEntry');
spine.AnimationState = function (stateData)
{
    this.data = stateData;
    this.tracks = [];
    this.events = [];
};
spine.AnimationState.prototype = {
    onStart: null,
    onEnd: null,
    onComplete: null,
    onEvent: null,
    timeScale: 1,
    update: function (delta)
    {
        delta *= this.timeScale;
        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            current.time += delta * current.timeScale;
            if (current.previous)
            {
                var previousDelta = delta * current.previous.timeScale;
                current.previous.time += previousDelta;
                current.mixTime += previousDelta;
            }

            var next = current.next;
            if (next)
            {
                next.time = current.lastTime - next.delay;
                if (next.time >= 0) this.setCurrent(i, next);
            } else {
                // End non-looping animation when it reaches its end time and there is no next entry.
                if (!current.loop && current.lastTime >= current.endTime) this.clearTrack(i);
            }
        }
    },
    apply: function (skeleton)
    {
        skeleton.resetDrawOrder();

        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            this.events.length = 0;

            var time = current.time;
            var lastTime = current.lastTime;
            var endTime = current.endTime;
            var loop = current.loop;
            if (!loop && time > endTime) time = endTime;

            var previous = current.previous;
            if (!previous)
            {
                if (current.mix == 1)
                    current.animation.apply(skeleton, current.lastTime, time, loop, this.events);
                else
                    current.animation.mix(skeleton, current.lastTime, time, loop, this.events, current.mix);
            } else {
                var previousTime = previous.time;
                if (!previous.loop && previousTime > previous.endTime) previousTime = previous.endTime;
                previous.animation.apply(skeleton, previousTime, previousTime, previous.loop, null);

                var alpha = current.mixTime / current.mixDuration * current.mix;
                if (alpha >= 1)
                {
                    alpha = 1;
                    current.previous = null;
                }
                current.animation.mix(skeleton, current.lastTime, time, loop, this.events, alpha);
            }

            for (var ii = 0, nn = this.events.length; ii < nn; ii++)
            {
                var event = this.events[ii];
                if (current.onEvent) current.onEvent(i, event);
                if (this.onEvent) this.onEvent(i, event);
            }

            // Check if completed the animation or a loop iteration.
            if (loop ? (lastTime % endTime > time % endTime) : (lastTime < endTime && time >= endTime))
            {
                var count = Math.floor(time / endTime);
                if (current.onComplete) current.onComplete(i, count);
                if (this.onComplete) this.onComplete(i, count);
            }

            current.lastTime = current.time;
        }
    },
    clearTracks: function ()
    {
        for (var i = 0, n = this.tracks.length; i < n; i++)
            this.clearTrack(i);
        this.tracks.length = 0;
    },
    clearTrack: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return;
        var current = this.tracks[trackIndex];
        if (!current) return;

        if (current.onEnd) current.onEnd(trackIndex);
        if (this.onEnd) this.onEnd(trackIndex);

        this.tracks[trackIndex] = null;
    },
    _expandToIndex: function (index)
    {
        if (index < this.tracks.length) return this.tracks[index];
        while (index >= this.tracks.length)
            this.tracks.push(null);
        return null;
    },
    setCurrent: function (index, entry)
    {
        var current = this._expandToIndex(index);
        if (current)
        {
            var previous = current.previous;
            current.previous = null;

            if (current.onEnd) current.onEnd(index);
            if (this.onEnd) this.onEnd(index);

            entry.mixDuration = this.data.getMix(current.animation, entry.animation);
            if (entry.mixDuration > 0)
            {
                entry.mixTime = 0;
                // If a mix is in progress, mix from the closest animation.
                if (previous && current.mixTime / current.mixDuration < 0.5)
                    entry.previous = previous;
                else
                    entry.previous = current;
            }
        }

        this.tracks[index] = entry;

        if (entry.onStart) entry.onStart(index);
        if (this.onStart) this.onStart(index);
    },
    setAnimationByName: function (trackIndex, animationName, loop)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.setAnimation(trackIndex, animation, loop);
    },
    /** Set the current animation. Any queued animations are cleared. */
    setAnimation: function (trackIndex, animation, loop)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;
        this.setCurrent(trackIndex, entry);
        return entry;
    },
    addAnimationByName: function (trackIndex, animationName, loop, delay)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.addAnimation(trackIndex, animation, loop, delay);
    },
    /** Adds an animation to be played delay seconds after the current or last queued animation.
     * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
    addAnimation: function (trackIndex, animation, loop, delay)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;

        var last = this._expandToIndex(trackIndex);
        if (last)
        {
            while (last.next)
                last = last.next;
            last.next = entry;
        } else
            this.tracks[trackIndex] = entry;

        if (delay <= 0)
        {
            if (last)
                delay += last.endTime - this.data.getMix(last.animation, animation);
            else
                delay = 0;
        }
        entry.delay = delay;

        return entry;
    },
    /** May be null. */
    getCurrent: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return null;
        return this.tracks[trackIndex];
    }
};
module.exports = spine.AnimationState;


},{"../SpineUtil":51,"./TrackEntry":48}],13:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AnimationStateData = function (skeletonData)
{
    this.skeletonData = skeletonData;
    this.animationToMixTime = {};
};
spine.AnimationStateData.prototype = {
    defaultMix: 0,
    setMixByName: function (fromName, toName, duration)
    {
        var from = this.skeletonData.findAnimation(fromName);
        if (!from) throw "Animation not found: " + fromName;
        var to = this.skeletonData.findAnimation(toName);
        if (!to) throw "Animation not found: " + toName;
        this.setMix(from, to, duration);
    },
    setMix: function (from, to, duration)
    {
        this.animationToMixTime[from.name + ":" + to.name] = duration;
    },
    getMix: function (from, to)
    {
        var key = from.name + ":" + to.name;
        return this.animationToMixTime.hasOwnProperty(key) ? this.animationToMixTime[key] : this.defaultMix;
    }
};
module.exports = spine.AnimationStateData;


},{"../SpineUtil":51}],14:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasReader = require('./AtlasReader');
spine.AtlasPage = require('./AtlasPage');
spine.AtlasRegion = require('./AtlasRegion');
var PIXI = require('pixi.js');
spine.Atlas = function (atlasText, baseUrl, crossOrigin)
{
    if (baseUrl && baseUrl.indexOf('/') !== baseUrl.length)
    {
        baseUrl += '/';
    }

    this.pages = [];
    this.regions = [];

    this.texturesLoading = 0;

    var self = this;

    var reader = new spine.AtlasReader(atlasText);
    var tuple = [];
    tuple.length = 4;
    var page = null;
    while (true)
    {
        var line = reader.readLine();
        if (line === null) break;
        line = reader.trim(line);
        if (!line.length)
            page = null;
        else if (!page)
        {
            page = new spine.AtlasPage();
            page.name = line;

            if (reader.readTuple(tuple) == 2)
            { // size is only optional for an atlas packed with an old TexturePacker.
                page.width = parseInt(tuple[0]);
                page.height = parseInt(tuple[1]);
                reader.readTuple(tuple);
            }
            page.format = spine.Atlas.Format[tuple[0]];

            reader.readTuple(tuple);
            page.minFilter = spine.Atlas.TextureFilter[tuple[0]];
            page.magFilter = spine.Atlas.TextureFilter[tuple[1]];

            var direction = reader.readValue();
            page.uWrap = spine.Atlas.TextureWrap.clampToEdge;
            page.vWrap = spine.Atlas.TextureWrap.clampToEdge;
            if (direction == "x")
                page.uWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "y")
                page.vWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "xy")
                page.uWrap = page.vWrap = spine.Atlas.TextureWrap.repeat;

            page.rendererObject = PIXI.BaseTexture.fromImage(baseUrl + line, crossOrigin);

            this.pages.push(page);

        } else {
            var region = new spine.AtlasRegion();
            region.name = line;
            region.page = page;

            region.rotate = reader.readValue() == "true";

            reader.readTuple(tuple);
            var x = parseInt(tuple[0]);
            var y = parseInt(tuple[1]);

            reader.readTuple(tuple);
            var width = parseInt(tuple[0]);
            var height = parseInt(tuple[1]);

            region.u = x / page.width;
            region.v = y / page.height;
            if (region.rotate)
            {
                region.u2 = (x + height) / page.width;
                region.v2 = (y + width) / page.height;
            } else {
                region.u2 = (x + width) / page.width;
                region.v2 = (y + height) / page.height;
            }
            region.x = x;
            region.y = y;
            region.width = Math.abs(width);
            region.height = Math.abs(height);

            if (reader.readTuple(tuple) == 4)
            { // split is optional
                region.splits = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                if (reader.readTuple(tuple) == 4)
                { // pad is optional, but only present with splits
                    region.pads = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                    reader.readTuple(tuple);
                }
            }

            region.originalWidth = parseInt(tuple[0]);
            region.originalHeight = parseInt(tuple[1]);

            reader.readTuple(tuple);
            region.offsetX = parseInt(tuple[0]);
            region.offsetY = parseInt(tuple[1]);

            region.index = parseInt(reader.readValue());

            this.regions.push(region);
        }
    }
};
spine.Atlas.prototype = {
    findRegion: function (name)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
            if (regions[i].name == name) return regions[i];
        return null;
    },
    dispose: function ()
    {
        var pages = this.pages;
        for (var i = 0, n = pages.length; i < n; i++)
            pages[i].rendererObject.destroy(true);
    },
    updateUVs: function (page)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
        {
            var region = regions[i];
            if (region.page != page) continue;
            region.u = region.x / page.width;
            region.v = region.y / page.height;
            if (region.rotate)
            {
                region.u2 = (region.x + region.height) / page.width;
                region.v2 = (region.y + region.width) / page.height;
            } else {
                region.u2 = (region.x + region.width) / page.width;
                region.v2 = (region.y + region.height) / page.height;
            }
        }
    }
};

spine.Atlas.Format = {
    alpha: 0,
    intensity: 1,
    luminanceAlpha: 2,
    rgb565: 3,
    rgba4444: 4,
    rgb888: 5,
    rgba8888: 6
};

spine.Atlas.TextureFilter = {
    nearest: 0,
    linear: 1,
    mipMap: 2,
    mipMapNearestNearest: 3,
    mipMapLinearNearest: 4,
    mipMapNearestLinear: 5,
    mipMapLinearLinear: 6
};

spine.Atlas.TextureWrap = {
    mirroredRepeat: 0,
    clampToEdge: 1,
    repeat: 2
};
module.exports = spine.Atlas;


},{"../SpineUtil":51,"./AtlasPage":16,"./AtlasReader":17,"./AtlasRegion":18,"pixi.js":"pixi.js"}],15:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.RegionAttachment = require('./RegionAttachment');
spine.MeshAttachment = require('./MeshAttachment');
spine.SkinnedMeshAttachment = require('./SkinnedMeshAttachment');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment');
spine.AtlasAttachmentParser = function (atlas)
{
    this.atlas = atlas;
};
spine.AtlasAttachmentParser.prototype = {
    newRegionAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (region attachment: " + name + ")";
        var attachment = new spine.RegionAttachment(name);
        attachment.rendererObject = region;
        attachment.setUVs(region.u, region.v, region.u2, region.v2, region.rotate);
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (mesh attachment: " + name + ")";
        var attachment = new spine.MeshAttachment(name);
        attachment.rendererObject = region;
        attachment.regionU = region.u;
        attachment.regionV = region.v;
        attachment.regionU2 = region.u2;
        attachment.regionV2 = region.v2;
        attachment.regionRotate = region.rotate;
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newSkinnedMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (skinned mesh attachment: " + name + ")";
        var attachment = new spine.SkinnedMeshAttachment(name);
        attachment.rendererObject = region;
        attachment.regionU = region.u;
        attachment.regionV = region.v;
        attachment.regionU2 = region.u2;
        attachment.regionV2 = region.v2;
        attachment.regionRotate = region.rotate;
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newBoundingBoxAttachment: function (skin, name)
    {
        return new spine.BoundingBoxAttachment(name);
    }
};
module.exports = spine.AtlasAttachmentParser;


},{"../SpineUtil":51,"./BoundingBoxAttachment":23,"./MeshAttachment":36,"./RegionAttachment":37,"./SkinnedMeshAttachment":45}],16:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasPage = function ()
{};
spine.AtlasPage.prototype = {
    name: null,
    format: null,
    minFilter: null,
    magFilter: null,
    uWrap: null,
    vWrap: null,
    rendererObject: null,
    width: 0,
    height: 0
};
module.exports = spine.AtlasPage;


},{"../SpineUtil":51}],17:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasReader = function (text)
{
    this.lines = text.split(/\r\n|\r|\n/);
};
spine.AtlasReader.prototype = {
    index: 0,
    trim: function (value)
    {
        return value.replace(/^\s+|\s+$/g, "");
    },
    readLine: function ()
    {
        if (this.index >= this.lines.length) return null;
        return this.lines[this.index++];
    },
    readValue: function ()
    {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        return this.trim(line.substring(colon + 1));
    },
    /** Returns the number of tuple values read (1, 2 or 4). */
    readTuple: function (tuple)
    {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        var i = 0, lastMatch = colon + 1;
        for (; i < 3; i++)
        {
            var comma = line.indexOf(",", lastMatch);
            if (comma == -1) break;
            tuple[i] = this.trim(line.substr(lastMatch, comma - lastMatch));
            lastMatch = comma + 1;
        }
        tuple[i] = this.trim(line.substring(lastMatch));
        return i + 1;
    }
};
module.exports = spine.AtlasReader;


},{"../SpineUtil":51}],18:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AtlasRegion = function ()
{};
spine.AtlasRegion.prototype = {
    page: null,
    name: null,
    x: 0, y: 0,
    width: 0, height: 0,
    u: 0, v: 0, u2: 0, v2: 0,
    offsetX: 0, offsetY: 0,
    originalWidth: 0, originalHeight: 0,
    index: 0,
    rotate: false,
    splits: null,
    pads: null
};
module.exports = spine.AtlasRegion;


},{"../SpineUtil":51}],19:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Curves = require('./Curves');
spine.Animation = require('./Animation');
spine.AttachmentTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.attachmentNames = [];
    this.attachmentNames.length = frameCount;
};
spine.AttachmentTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, attachmentName)
    {
        this.frames[frameIndex] = time;
        this.attachmentNames[frameIndex] = attachmentName;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;

        var frameIndex = time >= frames[frames.length - 1] ? frames.length - 1 : spine.Animation.binarySearch1(frames, time) - 1;
        if (frames[frameIndex] < lastTime) return;

        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex].setAttachment(
            !attachmentName ? null : skeleton.getAttachmentBySlotIndex(this.slotIndex, attachmentName));
    }
};
module.exports = spine.AttachmentTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],20:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = {
    region: 0,
    boundingbox: 1,
    mesh: 2,
    skinnedmesh: 3
};
module.exports = spine.AttachmentType;


},{"../SpineUtil":51}],21:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Bone = function (boneData, skeleton, parent)
{
    this.data = boneData;
    this.skeleton = skeleton;
    this.parent = parent;
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0, rotationIK: 0,
    scaleX: 1, scaleY: 1,
    flipX: false, flipY: false,
    m00: 0, m01: 0, worldX: 0, // a b x
    m10: 0, m11: 0, worldY: 0, // c d y
    worldRotation: 0,
    worldScaleX: 1, worldScaleY: 1,
    worldFlipX: false, worldFlipY: false,
    updateWorldTransform: function ()
    {
        var parent = this.parent;
        if (parent)
        {
            this.worldX = this.x * parent.m00 + this.y * parent.m01 + parent.worldX;
            this.worldY = this.x * parent.m10 + this.y * parent.m11 + parent.worldY;
            if (this.data.inheritScale)
            {
                this.worldScaleX = parent.worldScaleX * this.scaleX;
                this.worldScaleY = parent.worldScaleY * this.scaleY;
            } else {
                this.worldScaleX = this.scaleX;
                this.worldScaleY = this.scaleY;
            }
            this.worldRotation = this.data.inheritRotation ? (parent.worldRotation + this.rotationIK) : this.rotationIK;
            this.worldFlipX = parent.worldFlipX != this.flipX;
            this.worldFlipY = parent.worldFlipY != this.flipY;
        } else {
            var skeletonFlipX = this.skeleton.flipX, skeletonFlipY = this.skeleton.flipY;
            this.worldX = skeletonFlipX ? -this.x : this.x;
            this.worldY = (skeletonFlipY != spine.Bone.yDown) ? -this.y : this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotationIK;
            this.worldFlipX = skeletonFlipX != this.flipX;
            this.worldFlipY = skeletonFlipY != this.flipY;
        }
        var radians = this.worldRotation * spine.degRad;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        if (this.worldFlipX)
        {
            this.m00 = -cos * this.worldScaleX;
            this.m01 = sin * this.worldScaleY;
        } else {
            this.m00 = cos * this.worldScaleX;
            this.m01 = -sin * this.worldScaleY;
        }
        if (this.worldFlipY != spine.Bone.yDown)
        {
            this.m10 = -sin * this.worldScaleX;
            this.m11 = -cos * this.worldScaleY;
        } else {
            this.m10 = sin * this.worldScaleX;
            this.m11 = cos * this.worldScaleY;
        }
    },
    setToSetupPose: function ()
    {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.rotationIK = this.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.flipX = data.flipX;
        this.flipY = data.flipY;
    },
    worldToLocal: function (world)
    {
        var dx = world[0] - this.worldX, dy = world[1] - this.worldY;
        var m00 = this.m00, m10 = this.m10, m01 = this.m01, m11 = this.m11;
        if (this.worldFlipX != (this.worldFlipY != spine.Bone.yDown))
        {
            m00 = -m00;
            m11 = -m11;
        }
        var invDet = 1 / (m00 * m11 - m01 * m10);
        world[0] = dx * m00 * invDet - dy * m01 * invDet;
        world[1] = dy * m11 * invDet - dx * m10 * invDet;
    },
    localToWorld: function (local)
    {
        var localX = local[0], localY = local[1];
        local[0] = localX * this.m00 + localY * this.m01 + this.worldX;
        local[1] = localX * this.m10 + localY * this.m11 + this.worldY;
    }
};
module.exports = spine.Bone;


},{"../SpineUtil":51}],22:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.BoneData = function (name, parent)
{
    this.name = name;
    this.parent = parent;
};
spine.BoneData.prototype = {
    length: 0,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    inheritScale: true,
    inheritRotation: true,
    flipX: false, flipY: false
};
module.exports = spine.BoneData;


},{"../SpineUtil":51}],23:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = require('./AttachmentType');
spine.BoundingBoxAttachment = function (name)
{
    this.name = name;
    this.vertices = [];
};
spine.BoundingBoxAttachment.prototype = {
    type: spine.AttachmentType.boundingbox,
    computeWorldVertices: function (x, y, bone, worldVertices)
    {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var vertices = this.vertices;
        for (var i = 0, n = vertices.length; i < n; i += 2)
        {
            var px = vertices[i];
            var py = vertices[i + 1];
            worldVertices[i] = px * m00 + py * m01 + x;
            worldVertices[i + 1] = px * m10 + py * m11 + y;
        }
    }
};
module.exports = spine.BoundingBoxAttachment;


},{"../SpineUtil":51,"./AttachmentType":20}],24:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.ColorTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, r, g, b, a, ...
    this.frames.length = frameCount * 5;
};
spine.ColorTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 5;
    },
    setFrame: function (frameIndex, time, r, g, b, a)
    {
        frameIndex *= 5;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = r;
        this.frames[frameIndex + 2] = g;
        this.frames[frameIndex + 3] = b;
        this.frames[frameIndex + 4] = a;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var r, g, b, a;
        if (time >= frames[frames.length - 5])
        {
            // Time is after last frame.
            var i = frames.length - 1;
            r = frames[i - 3];
            g = frames[i - 2];
            b = frames[i - 1];
            a = frames[i];
        } else {
            // Interpolate between the previous frame and the current frame.
            var frameIndex = spine.Animation.binarySearch(frames, time, 5);
            var prevFrameR = frames[frameIndex - 4];
            var prevFrameG = frames[frameIndex - 3];
            var prevFrameB = frames[frameIndex - 2];
            var prevFrameA = frames[frameIndex - 1];
            var frameTime = frames[frameIndex];
            var percent = 1 - (time - frameTime) / (frames[frameIndex - 5/*PREV_FRAME_TIME*/] - frameTime);
            percent = this.curves.getCurvePercent(frameIndex / 5 - 1, percent);

            r = prevFrameR + (frames[frameIndex + 1/*FRAME_R*/] - prevFrameR) * percent;
            g = prevFrameG + (frames[frameIndex + 2/*FRAME_G*/] - prevFrameG) * percent;
            b = prevFrameB + (frames[frameIndex + 3/*FRAME_B*/] - prevFrameB) * percent;
            a = prevFrameA + (frames[frameIndex + 4/*FRAME_A*/] - prevFrameA) * percent;
        }
        var slot = skeleton.slots[this.slotIndex];
        if (alpha < 1)
        {
            slot.r += (r - slot.r) * alpha;
            slot.g += (g - slot.g) * alpha;
            slot.b += (b - slot.b) * alpha;
            slot.a += (a - slot.a) * alpha;
        } else {
            slot.r = r;
            slot.g = g;
            slot.b = b;
            slot.a = a;
        }
    }
};
module.exports = spine.ColorTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],25:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Curves = function (frameCount)
{
    this.curves = []; // type, x, y, ...
    //this.curves.length = (frameCount - 1) * 19/*BEZIER_SIZE*/;
};
spine.Curves.prototype = {
    setLinear: function (frameIndex)
    {
        this.curves[frameIndex * 19/*BEZIER_SIZE*/] = 0/*LINEAR*/;
    },
    setStepped: function (frameIndex)
    {
        this.curves[frameIndex * 19/*BEZIER_SIZE*/] = 1/*STEPPED*/;
    },
    /** Sets the control handle positions for an interpolation bezier curve used to transition from this keyframe to the next.
     * cx1 and cx2 are from 0 to 1, representing the percent of time between the two keyframes. cy1 and cy2 are the percent of
     * the difference between the keyframe's values. */
    setCurve: function (frameIndex, cx1, cy1, cx2, cy2)
    {
        var subdiv1 = 1 / 10/*BEZIER_SEGMENTS*/, subdiv2 = subdiv1 * subdiv1, subdiv3 = subdiv2 * subdiv1;
        var pre1 = 3 * subdiv1, pre2 = 3 * subdiv2, pre4 = 6 * subdiv2, pre5 = 6 * subdiv3;
        var tmp1x = -cx1 * 2 + cx2, tmp1y = -cy1 * 2 + cy2, tmp2x = (cx1 - cx2) * 3 + 1, tmp2y = (cy1 - cy2) * 3 + 1;
        var dfx = cx1 * pre1 + tmp1x * pre2 + tmp2x * subdiv3, dfy = cy1 * pre1 + tmp1y * pre2 + tmp2y * subdiv3;
        var ddfx = tmp1x * pre4 + tmp2x * pre5, ddfy = tmp1y * pre4 + tmp2y * pre5;
        var dddfx = tmp2x * pre5, dddfy = tmp2y * pre5;

        var i = frameIndex * 19/*BEZIER_SIZE*/;
        var curves = this.curves;
        curves[i++] = 2/*BEZIER*/;

        var x = dfx, y = dfy;
        for (var n = i + 19/*BEZIER_SIZE*/ - 1; i < n; i += 2)
        {
            curves[i] = x;
            curves[i + 1] = y;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }
    },
    getCurvePercent: function (frameIndex, percent)
    {
        percent = percent < 0 ? 0 : (percent > 1 ? 1 : percent);
        var curves = this.curves;
        var i = frameIndex * 19/*BEZIER_SIZE*/;
        var type = curves[i];
        if (type === 0/*LINEAR*/) return percent;
        if (type == 1/*STEPPED*/) return 0;
        i++;
        var x = 0;
        for (var start = i, n = i + 19/*BEZIER_SIZE*/ - 1; i < n; i += 2)
        {
            x = curves[i];
            if (x >= percent)
            {
                var prevX, prevY;
                if (i == start)
                {
                    prevX = 0;
                    prevY = 0;
                } else {
                    prevX = curves[i - 2];
                    prevY = curves[i - 1];
                }
                return prevY + (curves[i + 1] - prevY) * (percent - prevX) / (x - prevX);
            }
        }
        var y = curves[i - 1];
        return y + (1 - y) * (percent - x) / (1 - x); // Last point is 1,1.
    }
};
module.exports = spine.Curves;


},{"../SpineUtil":51}],26:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.DrawOrderTimeline = function (frameCount)
{
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.drawOrders = [];
    this.drawOrders.length = frameCount;
};
spine.DrawOrderTimeline.prototype = {
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, drawOrder)
    {
        this.frames[frameIndex] = time;
        this.drawOrders[frameIndex] = drawOrder;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (time >= frames[frames.length - 1]) // Time is after last frame.
            frameIndex = frames.length - 1;
        else
            frameIndex = spine.Animation.binarySearch1(frames, time) - 1;

        var drawOrder = skeleton.drawOrder;
        var slots = skeleton.slots;
        var drawOrderToSetupIndex = this.drawOrders[frameIndex];
        if (drawOrderToSetupIndex)
        {
            for (var i = 0, n = drawOrderToSetupIndex.length; i < n; i++)
            {
                drawOrder[i] = drawOrderToSetupIndex[i];
            }
        }

    }
};
module.exports = spine.DrawOrderTimeline;


},{"../SpineUtil":51,"./Animation":11}],27:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Event = function (data)
{
    this.data = data;
};
spine.Event.prototype = {
    intValue: 0,
    floatValue: 0,
    stringValue: null
};
module.exports = spine.Event;


},{"../SpineUtil":51}],28:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.EventData = function (name)
{
    this.name = name;
};
spine.EventData.prototype = {
    intValue: 0,
    floatValue: 0,
    stringValue: null
};
module.exports = spine.EventData;


},{"../SpineUtil":51}],29:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.EventTimeline = function (frameCount)
{
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.events = [];
    this.events.length = frameCount;
};
spine.EventTimeline.prototype = {
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, event)
    {
        this.frames[frameIndex] = time;
        this.events[frameIndex] = event;
    },
    /** Fires events for frames > lastTime and <= time. */
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        if (!firedEvents) return;

        var frames = this.frames;
        var frameCount = frames.length;

        if (lastTime > time)
        { // Fire events after last time for looped animations.
            this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha);
            lastTime = -1;
        } else if (lastTime >= frames[frameCount - 1]) // Last time is after last frame.
            return;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (lastTime < frames[0])
            frameIndex = 0;
        else
        {
            frameIndex = spine.Animation.binarySearch1(frames, lastTime);
            var frame = frames[frameIndex];
            while (frameIndex > 0)
            { // Fire multiple events with the same frame.
                if (frames[frameIndex - 1] != frame) break;
                frameIndex--;
            }
        }
        var events = this.events;
        for (; frameIndex < frameCount && time >= frames[frameIndex]; frameIndex++)
            firedEvents.push(events[frameIndex]);
    }
};
module.exports = spine.EventTimeline;


},{"../SpineUtil":51,"./Animation":11}],30:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FfdTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = [];
    this.frames.length = frameCount;
    this.frameVertices = [];
    this.frameVertices.length = frameCount;
};
spine.FfdTimeline.prototype = {
    slotIndex: 0,
    attachment: 0,
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, vertices)
    {
        this.frames[frameIndex] = time;
        this.frameVertices[frameIndex] = vertices;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var slot = skeleton.slots[this.slotIndex];
        if (slot.attachment != this.attachment) return;

        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameVertices = this.frameVertices;
        var vertexCount = frameVertices[0].length;

        var vertices = slot.attachmentVertices;
        if (vertices.length != vertexCount) alpha = 1;
        vertices.length = vertexCount;

        if (time >= frames[frames.length - 1])
        { // Time is after last frame.
            var lastVertices = frameVertices[frames.length - 1];
            if (alpha < 1)
            {
                for (var i = 0; i < vertexCount; i++)
                    vertices[i] += (lastVertices[i] - vertices[i]) * alpha;
            } else {
                for (var i = 0; i < vertexCount; i++)
                    vertices[i] = lastVertices[i];
            }
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch1(frames, time);
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 1] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex - 1, percent < 0 ? 0 : (percent > 1 ? 1 : percent));

        var prevVertices = frameVertices[frameIndex - 1];
        var nextVertices = frameVertices[frameIndex];

        if (alpha < 1)
        {
            for (var i = 0; i < vertexCount; i++)
            {
                var prev = prevVertices[i];
                vertices[i] += (prev + (nextVertices[i] - prev) * percent - vertices[i]) * alpha;
            }
        } else {
            for (var i = 0; i < vertexCount; i++)
            {
                var prev = prevVertices[i];
                vertices[i] = prev + (nextVertices[i] - prev) * percent;
            }
        }
    }
};
module.exports = spine.FfdTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],31:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FlipXTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, flip, ...
    this.frames.length = frameCount * 2;
};
spine.FlipXTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, flip)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = flip ? 1 : 0;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;
        var frameIndex = (time >= frames[frames.length - 2] ? frames.length : spine.Animation.binarySearch(frames, time, 2)) - 2;
        if (frames[frameIndex] < lastTime) return;
        skeleton.bones[this.boneIndex].flipX = frames[frameIndex + 1] != 0;
    }
};
module.exports = spine.FlipXTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],32:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FlipYTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, flip, ...
    this.frames.length = frameCount * 2;
};
spine.FlipYTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, flip)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = flip ? 1 : 0;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;
        var frameIndex = (time >= frames[frames.length - 2] ? frames.length : spine.Animation.binarySearch(frames, time, 2)) - 2;
        if (frames[frameIndex] < lastTime) return;
        skeleton.bones[this.boneIndex].flipY = frames[frameIndex + 1] != 0;
    }
};
module.exports = spine.FlipYTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],33:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.IkConstraint = function (data, skeleton)
{
    this.data = data;
    this.mix = data.mix;
    this.bendDirection = data.bendDirection;

    this.bones = [];
    for (var i = 0, n = data.bones.length; i < n; i++)
        this.bones.push(skeleton.findBone(data.bones[i].name));
    this.target = skeleton.findBone(data.target.name);
};
spine.IkConstraint.prototype = {
    apply: function ()
    {
        var target = this.target;
        var bones = this.bones;
        switch (bones.length)
        {
        case 1:
            spine.IkConstraint.apply1(bones[0], target.worldX, target.worldY, this.mix);
            break;
        case 2:
            spine.IkConstraint.apply2(bones[0], bones[1], target.worldX, target.worldY, this.bendDirection, this.mix);
            break;
        }
    }
};
/** Adjusts the bone rotation so the tip is as close to the target position as possible. The target is specified in the world
 * coordinate system. */
spine.IkConstraint.apply1 = function (bone, targetX, targetY, alpha)
{
    var parentRotation = (!bone.data.inheritRotation || !bone.parent) ? 0 : bone.parent.worldRotation;
    var rotation = bone.rotation;
    var rotationIK = Math.atan2(targetY - bone.worldY, targetX - bone.worldX) * spine.radDeg - parentRotation;
    bone.rotationIK = rotation + (rotationIK - rotation) * alpha;
};
/** Adjusts the parent and child bone rotations so the tip of the child is as close to the target position as possible. The
 * target is specified in the world coordinate system.
 * @param child Any descendant bone of the parent. */
spine.IkConstraint.apply2 = function (parent, child, targetX, targetY, bendDirection, alpha)
{
    var childRotation = child.rotation, parentRotation = parent.rotation;
    if (!alpha)
    {
        child.rotationIK = childRotation;
        parent.rotationIK = parentRotation;
        return;
    }
    var positionX, positionY, tempPosition = spine.temp;
    var parentParent = parent.parent;
    if (parentParent)
    {
        tempPosition[0] = targetX;
        tempPosition[1] = targetY;
        parentParent.worldToLocal(tempPosition);
        targetX = (tempPosition[0] - parent.x) * parentParent.worldScaleX;
        targetY = (tempPosition[1] - parent.y) * parentParent.worldScaleY;
    } else {
        targetX -= parent.x;
        targetY -= parent.y;
    }
    if (child.parent == parent)
    {
        positionX = child.x;
        positionY = child.y;
    } else {
        tempPosition[0] = child.x;
        tempPosition[1] = child.y;
        child.parent.localToWorld(tempPosition);
        parent.worldToLocal(tempPosition);
        positionX = tempPosition[0];
        positionY = tempPosition[1];
    }
    var childX = positionX * parent.worldScaleX, childY = positionY * parent.worldScaleY;
    var offset = Math.atan2(childY, childX);
    var len1 = Math.sqrt(childX * childX + childY * childY), len2 = child.data.length * child.worldScaleX;
    // Based on code by Ryan Juckett with permission: Copyright (c) 2008-2009 Ryan Juckett, http://www.ryanjuckett.com/
    var cosDenom = 2 * len1 * len2;
    if (cosDenom < 0.0001)
    {
        child.rotationIK = childRotation + (Math.atan2(targetY, targetX) * spine.radDeg - parentRotation - childRotation) * alpha;
        return;
    }
    var cos = (targetX * targetX + targetY * targetY - len1 * len1 - len2 * len2) / cosDenom;
    if (cos < -1)
        cos = -1;
    else if (cos > 1)
        cos = 1;
    var childAngle = Math.acos(cos) * bendDirection;
    var adjacent = len1 + len2 * cos, opposite = len2 * Math.sin(childAngle);
    var parentAngle = Math.atan2(targetY * adjacent - targetX * opposite, targetX * adjacent + targetY * opposite);
    var rotation = (parentAngle - offset) * spine.radDeg - parentRotation;
    if (rotation > 180)
        rotation -= 360;
    else if (rotation < -180) //
        rotation += 360;
    parent.rotationIK = parentRotation + rotation * alpha;
    rotation = (childAngle + offset) * spine.radDeg - childRotation;
    if (rotation > 180)
        rotation -= 360;
    else if (rotation < -180) //
        rotation += 360;
    child.rotationIK = childRotation + (rotation + parent.worldRotation - child.parent.worldRotation) * alpha;
};
module.exports = spine.IkConstraint;


},{"../SpineUtil":51}],34:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.IkConstraintData = function (name)
{
    this.name = name;
    this.bones = [];
};
spine.IkConstraintData.prototype = {
    target: null,
    bendDirection: 1,
    mix: 1
};
module.exports = spine.IkConstraintData;


},{"../SpineUtil":51}],35:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.IkConstraintTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, mix, bendDirection, ...
    this.frames.length = frameCount * 3;
};
spine.IkConstraintTimeline.prototype = {
    ikConstraintIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, mix, bendDirection)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = mix;
        this.frames[frameIndex + 2] = bendDirection;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var ikConstraint = skeleton.ikConstraints[this.ikConstraintIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            ikConstraint.mix += (frames[frames.length - 2] - ikConstraint.mix) * alpha;
            ikConstraint.bendDirection = frames[frames.length - 1];
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameMix = frames[frameIndex + -2/*PREV_FRAME_MIX*/];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        var mix = prevFrameMix + (frames[frameIndex + 1/*FRAME_MIX*/] - prevFrameMix) * percent;
        ikConstraint.mix += (mix - ikConstraint.mix) * alpha;
        ikConstraint.bendDirection = frames[frameIndex + -1/*PREV_FRAME_BEND_DIRECTION*/];
    }
};
module.exports = spine.IkConstraintTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],36:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.MeshAttachment = function (name)
{
    this.name = name;
};
spine.MeshAttachment.prototype = {
    type: spine.AttachmentType.mesh,
    vertices: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionU: 0, regionV: 0, regionU2: 0, regionV2: 0, regionRotate: false,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    edges: null,
    width: 0, height: 0,
    updateUVs: function ()
    {
        var width = this.regionU2 - this.regionU, height = this.regionV2 - this.regionV;
        var n = this.regionUVs.length;
        if (!this.uvs || this.uvs.length != n)
        {
            this.uvs = new spine.Float32Array(n);
        }
        if (this.regionRotate)
        {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i + 1] * width;
                this.uvs[i + 1] = this.regionV + height - this.regionUVs[i] * height;
            }
        } else {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i] * width;
                this.uvs[i + 1] = this.regionV + this.regionUVs[i + 1] * height;
            }
        }
    },
    computeWorldVertices: function (x, y, slot, worldVertices)
    {
        var bone = slot.bone;
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var vertices = this.vertices;
        var verticesCount = vertices.length;
        if (slot.attachmentVertices.length == verticesCount) vertices = slot.attachmentVertices;
        for (var i = 0; i < verticesCount; i += 2)
        {
            var vx = vertices[i];
            var vy = vertices[i + 1];
            worldVertices[i] = vx * m00 + vy * m01 + x;
            worldVertices[i + 1] = vx * m10 + vy * m11 + y;
        }
    }
};
module.exports = spine.MeshAttachment;


},{"../SpineUtil":51,"./AttachmentType":20}],37:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.AttachmentType = require('./AttachmentType');
spine.RegionAttachment = function (name)
{
    this.name = name;
    this.offset = [];
    this.offset.length = 8;
    this.uvs = [];
    this.uvs.length = 8;
};
spine.RegionAttachment.prototype = {
    type: spine.AttachmentType.region,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    width: 0, height: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    setUVs: function (u, v, u2, v2, rotate)
    {
        var uvs = this.uvs;
        if (rotate)
        {
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v2;
            uvs[4/*X3*/] = u;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v;
            uvs[0/*X1*/] = u2;
            uvs[1/*Y1*/] = v2;
        } else {
            uvs[0/*X1*/] = u;
            uvs[1/*Y1*/] = v2;
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v;
            uvs[4/*X3*/] = u2;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v2;
        }
    },
    updateOffset: function ()
    {
        var regionScaleX = this.width / this.regionOriginalWidth * this.scaleX;
        var regionScaleY = this.height / this.regionOriginalHeight * this.scaleY;
        var localX = -this.width / 2 * this.scaleX + this.regionOffsetX * regionScaleX;
        var localY = -this.height / 2 * this.scaleY + this.regionOffsetY * regionScaleY;
        var localX2 = localX + this.regionWidth * regionScaleX;
        var localY2 = localY + this.regionHeight * regionScaleY;
        var radians = this.rotation * spine.degRad;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var localXCos = localX * cos + this.x;
        var localXSin = localX * sin;
        var localYCos = localY * cos + this.y;
        var localYSin = localY * sin;
        var localX2Cos = localX2 * cos + this.x;
        var localX2Sin = localX2 * sin;
        var localY2Cos = localY2 * cos + this.y;
        var localY2Sin = localY2 * sin;
        var offset = this.offset;
        offset[0/*X1*/] = localXCos - localYSin;
        offset[1/*Y1*/] = localYCos + localXSin;
        offset[2/*X2*/] = localXCos - localY2Sin;
        offset[3/*Y2*/] = localY2Cos + localXSin;
        offset[4/*X3*/] = localX2Cos - localY2Sin;
        offset[5/*Y3*/] = localY2Cos + localX2Sin;
        offset[6/*X4*/] = localX2Cos - localYSin;
        offset[7/*Y4*/] = localYCos + localX2Sin;
    },
    computeVertices: function (x, y, bone, vertices)
    {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00, m01 = bone.m01, m10 = bone.m10, m11 = bone.m11;
        var offset = this.offset;
        vertices[0/*X1*/] = offset[0/*X1*/] * m00 + offset[1/*Y1*/] * m01 + x;
        vertices[1/*Y1*/] = offset[0/*X1*/] * m10 + offset[1/*Y1*/] * m11 + y;
        vertices[2/*X2*/] = offset[2/*X2*/] * m00 + offset[3/*Y2*/] * m01 + x;
        vertices[3/*Y2*/] = offset[2/*X2*/] * m10 + offset[3/*Y2*/] * m11 + y;
        vertices[4/*X3*/] = offset[4/*X3*/] * m00 + offset[5/*X3*/] * m01 + x;
        vertices[5/*X3*/] = offset[4/*X3*/] * m10 + offset[5/*X3*/] * m11 + y;
        vertices[6/*X4*/] = offset[6/*X4*/] * m00 + offset[7/*Y4*/] * m01 + x;
        vertices[7/*Y4*/] = offset[6/*X4*/] * m10 + offset[7/*Y4*/] * m11 + y;
    }
};
module.exports = spine.RegionAttachment;


},{"../SpineUtil":51,"./AttachmentType":20}],38:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.RotateTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, angle, ...
    this.frames.length = frameCount * 2;
};
spine.RotateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, angle)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = angle;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 2])
        { // Time is after last frame.
            var amount = bone.data.rotation + frames[frames.length - 1] - bone.rotation;
            while (amount > 180)
                amount -= 360;
            while (amount < -180)
                amount += 360;
            bone.rotation += amount * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 2);
        var prevFrameValue = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 2/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 2 - 1, percent);

        var amount = frames[frameIndex + 1/*FRAME_VALUE*/] - prevFrameValue;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        amount = bone.data.rotation + (prevFrameValue + amount * percent) - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
    }
};
module.exports = spine.RotateTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],39:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.ScaleTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.ScaleTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            bone.scaleX += (bone.data.scaleX * frames[frames.length - 2] - bone.scaleX) * alpha;
            bone.scaleY += (bone.data.scaleY * frames[frames.length - 1] - bone.scaleY) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameX = frames[frameIndex - 2];
        var prevFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.scaleX += (bone.data.scaleX * (prevFrameX + (frames[frameIndex + 1/*FRAME_X*/] - prevFrameX) * percent) - bone.scaleX) * alpha;
        bone.scaleY += (bone.data.scaleY * (prevFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - prevFrameY) * percent) - bone.scaleY) * alpha;
    }
};
module.exports = spine.ScaleTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],40:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Bone = require('./Bone');
spine.Slot = require('./Slot');
spine.IkConstraint = require('./IkConstraint');
spine.Skeleton = function (skeletonData)
{
    this.data = skeletonData;

    this.bones = [];
    for (var i = 0, n = skeletonData.bones.length; i < n; i++)
    {
        var boneData = skeletonData.bones[i];
        var parent = !boneData.parent ? null : this.bones[skeletonData.bones.indexOf(boneData.parent)];
        this.bones.push(new spine.Bone(boneData, this, parent));
    }

    this.slots = [];
    this.drawOrder = [];
    for (var i = 0, n = skeletonData.slots.length; i < n; i++)
    {
        var slotData = skeletonData.slots[i];
        var bone = this.bones[skeletonData.bones.indexOf(slotData.boneData)];
        var slot = new spine.Slot(slotData, bone);
        this.slots.push(slot);
        this.drawOrder.push(i);
    }

    this.ikConstraints = [];
    for (var i = 0, n = skeletonData.ikConstraints.length; i < n; i++)
        this.ikConstraints.push(new spine.IkConstraint(skeletonData.ikConstraints[i], this));

    this.boneCache = [];
    this.updateCache();
};
spine.Skeleton.prototype = {
    x: 0, y: 0,
    skin: null,
    r: 1, g: 1, b: 1, a: 1,
    time: 0,
    flipX: false, flipY: false,
    /** Caches information about bones and IK constraints. Must be called if bones or IK constraints are added or removed. */
    updateCache: function ()
    {
        var ikConstraints = this.ikConstraints;
        var ikConstraintsCount = ikConstraints.length;

        var arrayCount = ikConstraintsCount + 1;
        var boneCache = this.boneCache;
        if (boneCache.length > arrayCount) boneCache.length = arrayCount;
        for (var i = 0, n = boneCache.length; i < n; i++)
            boneCache[i].length = 0;
        while (boneCache.length < arrayCount)
            boneCache[boneCache.length] = [];

        var nonIkBones = boneCache[0];
        var bones = this.bones;

        outer:
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var bone = bones[i];
            var current = bone;
            do {
                for (var ii = 0; ii < ikConstraintsCount; ii++)
                {
                    var ikConstraint = ikConstraints[ii];
                    var parent = ikConstraint.bones[0];
                    var child= ikConstraint.bones[ikConstraint.bones.length - 1];
                    while (true)
                    {
                        if (current == child)
                        {
                            boneCache[ii].push(bone);
                            boneCache[ii + 1].push(bone);
                            continue outer;
                        }
                        if (child == parent) break;
                        child = child.parent;
                    }
                }
                current = current.parent;
            } while (current);
            nonIkBones[nonIkBones.length] = bone;
        }
    },
    /** Updates the world transform for each bone. */
    updateWorldTransform: function ()
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var bone = bones[i];
            bone.rotationIK = bone.rotation;
        }
        var i = 0, last = this.boneCache.length - 1;
        while (true)
        {
            var cacheBones = this.boneCache[i];
            for (var ii = 0, nn = cacheBones.length; ii < nn; ii++)
                cacheBones[ii].updateWorldTransform();
            if (i == last) break;
            this.ikConstraints[i].apply();
            i++;
        }
    },
    /** Sets the bones and slots to their setup pose values. */
    setToSetupPose: function ()
    {
        this.setBonesToSetupPose();
        this.setSlotsToSetupPose();
    },
    setBonesToSetupPose: function ()
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].setToSetupPose();

        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
        {
            var ikConstraint = ikConstraints[i];
            ikConstraint.bendDirection = ikConstraint.data.bendDirection;
            ikConstraint.mix = ikConstraint.data.mix;
        }
    },
    setSlotsToSetupPose: function ()
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            slots[i].setToSetupPose(i);
        }

        this.resetDrawOrder();
    },
    /** @return May return null. */
    getRootBone: function ()
    {
        return this.bones.length ? this.bones[0] : null;
    },
    /** @return May be null. */
    findBone: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return slots[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return i;
        return -1;
    },
    setSkinByName: function (skinName)
    {
        var skin = this.data.findSkin(skinName);
        if (!skin) throw "Skin not found: " + skinName;
        this.setSkin(skin);
    },
    /** Sets the skin used to look up attachments before looking in the {@link SkeletonData#getDefaultSkin() default skin}.
     * Attachments from the new skin are attached if the corresponding attachment from the old skin was attached. If there was
     * no old skin, each slot's setup mode attachment is attached from the new skin.
     * @param newSkin May be null. */
    setSkin: function (newSkin)
    {
        if (newSkin)
        {
            if (this.skin)
                newSkin._attachAll(this, this.skin);
            else
            {
                var slots = this.slots;
                for (var i = 0, n = slots.length; i < n; i++)
                {
                    var slot = slots[i];
                    var name = slot.data.attachmentName;
                    if (name)
                    {
                        var attachment = newSkin.getAttachment(i, name);
                        if (attachment) slot.setAttachment(attachment);
                    }
                }
            }
        }
        this.skin = newSkin;
    },
    /** @return May be null. */
    getAttachmentBySlotName: function (slotName, attachmentName)
    {
        return this.getAttachmentBySlotIndex(this.data.findSlotIndex(slotName), attachmentName);
    },
    /** @return May be null. */
    getAttachmentBySlotIndex: function (slotIndex, attachmentName)
    {
        if (this.skin)
        {
            var attachment = this.skin.getAttachment(slotIndex, attachmentName);
            if (attachment) return attachment;
        }
        if (this.data.defaultSkin) return this.data.defaultSkin.getAttachment(slotIndex, attachmentName);
        return null;
    },
    /** @param attachmentName May be null. */
    setAttachment: function (slotName, attachmentName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            var slot = slots[i];
            if (slot.data.name == slotName)
            {
                var attachment = null;
                if (attachmentName)
                {
                    attachment = this.getAttachmentBySlotIndex(i, attachmentName);
                    if (!attachment) throw "Attachment not found: " + attachmentName + ", for slot: " + slotName;
                }
                slot.setAttachment(attachment);
                return;
            }
        }
        throw "Slot not found: " + slotName;
    },
    /** @return May be null. */
    findIkConstraint: function (ikConstraintName)
    {
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
            if (ikConstraints[i].data.name == ikConstraintName) return ikConstraints[i];
        return null;
    },
    update: function (delta)
    {
        this.time += delta;
    },
    resetDrawOrder: function () {
        for (var i = 0, n = this.drawOrder.length; i < n; i++)
        {
            this.drawOrder[i] = i;
        }
    }
};
module.exports = spine.Skeleton;


},{"../SpineUtil":51,"./Bone":21,"./IkConstraint":33,"./Slot":46}],41:[function(require,module,exports){
var spine = require('../SpineRuntime') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkeletonBounds = function ()
{
    this.polygonPool = [];
    this.polygons = [];
    this.boundingBoxes = [];
};
spine.SkeletonBounds.prototype = {
    minX: 0, minY: 0, maxX: 0, maxY: 0,
    update: function (skeleton, updateAabb)
    {
        var slots = skeleton.slots;
        var slotCount = slots.length;
        var x = skeleton.x, y = skeleton.y;
        var boundingBoxes = this.boundingBoxes;
        var polygonPool = this.polygonPool;
        var polygons = this.polygons;

        boundingBoxes.length = 0;
        for (var i = 0, n = polygons.length; i < n; i++)
            polygonPool.push(polygons[i]);
        polygons.length = 0;

        for (var i = 0; i < slotCount; i++)
        {
            var slot = slots[i];
            var boundingBox = slot.attachment;
            if (boundingBox.type != spine.AttachmentType.boundingbox) continue;
            boundingBoxes.push(boundingBox);

            var poolCount = polygonPool.length, polygon;
            if (poolCount > 0)
            {
                polygon = polygonPool[poolCount - 1];
                polygonPool.splice(poolCount - 1, 1);
            } else
                polygon = [];
            polygons.push(polygon);

            polygon.length = boundingBox.vertices.length;
            boundingBox.computeWorldVertices(x, y, slot.bone, polygon);
        }

        if (updateAabb) this.aabbCompute();
    },
    aabbCompute: function ()
    {
        var polygons = this.polygons;
        var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE;
        for (var i = 0, n = polygons.length; i < n; i++)
        {
            var vertices = polygons[i];
            for (var ii = 0, nn = vertices.length; ii < nn; ii += 2)
            {
                var x = vertices[ii];
                var y = vertices[ii + 1];
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    },
    /** Returns true if the axis aligned bounding box contains the point. */
    aabbContainsPoint: function (x, y)
    {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    },
    /** Returns true if the axis aligned bounding box intersects the line segment. */
    aabbIntersectsSegment: function (x1, y1, x2, y2)
    {
        var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;
        if ((x1 <= minX && x2 <= minX) || (y1 <= minY && y2 <= minY) || (x1 >= maxX && x2 >= maxX) || (y1 >= maxY && y2 >= maxY))
            return false;
        var m = (y2 - y1) / (x2 - x1);
        var y = m * (minX - x1) + y1;
        if (y > minY && y < maxY) return true;
        y = m * (maxX - x1) + y1;
        if (y > minY && y < maxY) return true;
        var x = (minY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        x = (maxY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        return false;
    },
    /** Returns true if the axis aligned bounding box intersects the axis aligned bounding box of the specified bounds. */
    aabbIntersectsSkeleton: function (bounds)
    {
        return this.minX < bounds.maxX && this.maxX > bounds.minX && this.minY < bounds.maxY && this.maxY > bounds.minY;
    },
    /** Returns the first bounding box attachment that contains the point, or null. When doing many checks, it is usually more
     * efficient to only call this method if {@link #aabbContainsPoint(float, float)} returns true. */
    containsPoint: function (x, y)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (this.polygonContainsPoint(polygons[i], x, y)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns the first bounding box attachment that contains the line segment, or null. When doing many checks, it is usually
     * more efficient to only call this method if {@link #aabbIntersectsSegment(float, float, float, float)} returns true. */
    intersectsSegment: function (x1, y1, x2, y2)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (polygons[i].intersectsSegment(x1, y1, x2, y2)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns true if the polygon contains the point. */
    polygonContainsPoint: function (polygon, x, y)
    {
        var nn = polygon.length;
        var prevIndex = nn - 2;
        var inside = false;
        for (var ii = 0; ii < nn; ii += 2)
        {
            var vertexY = polygon[ii + 1];
            var prevY = polygon[prevIndex + 1];
            if ((vertexY < y && prevY >= y) || (prevY < y && vertexY >= y))
            {
                var vertexX = polygon[ii];
                if (vertexX + (y - vertexY) / (prevY - vertexY) * (polygon[prevIndex] - vertexX) < x) inside = !inside;
            }
            prevIndex = ii;
        }
        return inside;
    },
    /** Returns true if the polygon contains the line segment. */
    polygonIntersectsSegment: function (polygon, x1, y1, x2, y2)
    {
        var nn = polygon.length;
        var width12 = x1 - x2, height12 = y1 - y2;
        var det1 = x1 * y2 - y1 * x2;
        var x3 = polygon[nn - 2], y3 = polygon[nn - 1];
        for (var ii = 0; ii < nn; ii += 2)
        {
            var x4 = polygon[ii], y4 = polygon[ii + 1];
            var det2 = x3 * y4 - y3 * x4;
            var width34 = x3 - x4, height34 = y3 - y4;
            var det3 = width12 * height34 - height12 * width34;
            var x = (det1 * width34 - width12 * det2) / det3;
            if (((x >= x3 && x <= x4) || (x >= x4 && x <= x3)) && ((x >= x1 && x <= x2) || (x >= x2 && x <= x1)))
            {
                var y = (det1 * height34 - height12 * det2) / det3;
                if (((y >= y3 && y <= y4) || (y >= y4 && y <= y3)) && ((y >= y1 && y <= y2) || (y >= y2 && y <= y1))) return true;
            }
            x3 = x4;
            y3 = y4;
        }
        return false;
    },
    getPolygon: function (attachment)
    {
        var index = this.boundingBoxes.indexOf(attachment);
        return index == -1 ? null : this.polygons[index];
    },
    getWidth: function ()
    {
        return this.maxX - this.minX;
    },
    getHeight: function ()
    {
        return this.maxY - this.minY;
    }
};
module.exports = spine.SkeletonBounds;


},{"../SpineRuntime":50,"./AttachmentType":20}],42:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SkeletonData = function ()
{
    this.bones = [];
    this.slots = [];
    this.skins = [];
    this.events = [];
    this.animations = [];
    this.ikConstraints = [];
};
spine.SkeletonData.prototype = {
    name: null,
    defaultSkin: null,
    width: 0, height: 0,
    version: null, hash: null,
    /** @return May be null. */
    findBone: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName)
    {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
        {
            if (slots[i].name == slotName) return slot[i];
        }
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName)
    {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].name == slotName) return i;
        return -1;
    },
    /** @return May be null. */
    findSkin: function (skinName)
    {
        var skins = this.skins;
        for (var i = 0, n = skins.length; i < n; i++)
            if (skins[i].name == skinName) return skins[i];
        return null;
    },
    /** @return May be null. */
    findEvent: function (eventName)
    {
        var events = this.events;
        for (var i = 0, n = events.length; i < n; i++)
            if (events[i].name == eventName) return events[i];
        return null;
    },
    /** @return May be null. */
    findAnimation: function (animationName)
    {
        var animations = this.animations;
        for (var i = 0, n = animations.length; i < n; i++)
            if (animations[i].name == animationName) return animations[i];
        return null;
    },
    /** @return May be null. */
    findIkConstraint: function (ikConstraintName)
    {
        var ikConstraints = this.ikConstraints;
        for (var i = 0, n = ikConstraints.length; i < n; i++)
            if (ikConstraints[i].name == ikConstraintName) return ikConstraints[i];
        return null;
    }
};
module.exports = spine.SkeletonData;


},{"../SpineUtil":51}],43:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SkeletonData = require('./SkeletonData');
spine.BoneData = require('./BoneData');
spine.IkConstraintData = require('./IkConstraintData');
spine.SlotData = require('./SlotData');
spine.Skin = require('./Skin');
spine.EventData = require('./EventData');
spine.AttachmentType = require('./AttachmentType');
spine.ColorTimeline = require('./ColorTimeline');
spine.AttachmentTimeline = require('./AttachmentTimeline');
spine.RotateTimeline = require('./RotateTimeline');
spine.ScaleTimeline = require('./ScaleTimeline');
spine.TranslateTimeline = require('./TranslateTimeline');
spine.FlipXTimeline = require('./FlipXTimeline');
spine.FlipYTimeline = require('./FlipYTimeline');
spine.IkConstraintTimeline = require('./IkConstraintTimeline');
spine.FfdTimeline = require('./FfdTimeline');
spine.DrawOrderTimeline = require('./DrawOrderTimeline');
spine.EventTimeline = require('./EventTimeline');
spine.Event = require('./Event');
spine.Animation = require('./Animation');
spine.SkeletonJsonParser = function (attachmentLoader)
{
    this.attachmentLoader = attachmentLoader;
};
spine.SkeletonJsonParser.prototype = {
    scale: 1,
    readSkeletonData: function (root, name)
    {
        var skeletonData = new spine.SkeletonData();
        skeletonData.name = name;

        // Skeleton.
        var skeletonMap = root["skeleton"];
        if (skeletonMap)
        {
            skeletonData.hash = skeletonMap["hash"];
            skeletonData.version = skeletonMap["spine"];
            skeletonData.width = skeletonMap["width"] || 0;
            skeletonData.height = skeletonMap["height"] || 0;
        }

        // Bones.
        var bones = root["bones"];
        for (var i = 0, n = bones.length; i < n; i++)
        {
            var boneMap = bones[i];
            var parent = null;
            if (boneMap["parent"])
            {
                parent = skeletonData.findBone(boneMap["parent"]);
                if (!parent) throw "Parent bone not found: " + boneMap["parent"];
            }
            var boneData = new spine.BoneData(boneMap["name"], parent);
            boneData.length = (boneMap["length"] || 0) * this.scale;
            boneData.x = (boneMap["x"] || 0) * this.scale;
            boneData.y = (boneMap["y"] || 0) * this.scale;
            boneData.rotation = (boneMap["rotation"] || 0);
            boneData.scaleX = boneMap.hasOwnProperty("scaleX") ? boneMap["scaleX"] : 1;
            boneData.scaleY = boneMap.hasOwnProperty("scaleY") ? boneMap["scaleY"] : 1;
            boneData.inheritScale = boneMap.hasOwnProperty("inheritScale") ? boneMap["inheritScale"] : true;
            boneData.inheritRotation = boneMap.hasOwnProperty("inheritRotation") ? boneMap["inheritRotation"] : true;
            skeletonData.bones.push(boneData);
        }

        // IK constraints.
        var ik = root["ik"];
        if (ik)
        {
            for (var i = 0, n = ik.length; i < n; i++)
            {
                var ikMap = ik[i];
                var ikConstraintData = new spine.IkConstraintData(ikMap["name"]);

                var bones = ikMap["bones"];
                for (var ii = 0, nn = bones.length; ii < nn; ii++)
                {
                    var bone = skeletonData.findBone(bones[ii]);
                    if (!bone) throw "IK bone not found: " + bones[ii];
                    ikConstraintData.bones.push(bone);
                }

                ikConstraintData.target = skeletonData.findBone(ikMap["target"]);
                if (!ikConstraintData.target) throw "Target bone not found: " + ikMap["target"];

                ikConstraintData.bendDirection = (!ikMap.hasOwnProperty("bendPositive") || ikMap["bendPositive"]) ? 1 : -1;
                ikConstraintData.mix = ikMap.hasOwnProperty("mix") ? ikMap["mix"] : 1;

                skeletonData.ikConstraints.push(ikConstraintData);
            }
        }

        // Slots.
        var slots = root["slots"];
        for (var i = 0, n = slots.length; i < n; i++)
        {
            var slotMap = slots[i];
            var boneData = skeletonData.findBone(slotMap["bone"]);
            if (!boneData) throw "Slot bone not found: " + slotMap["bone"];
            var slotData = new spine.SlotData(slotMap["name"], boneData);

            var color = slotMap["color"];
            if (color)
            {
                slotData.r = this.toColor(color, 0);
                slotData.g = this.toColor(color, 1);
                slotData.b = this.toColor(color, 2);
                slotData.a = this.toColor(color, 3);
            }

            slotData.attachmentName = slotMap["attachment"];
            slotData.additiveBlending = slotMap["additive"] && slotMap["additive"] == "true";

            skeletonData.slots.push(slotData);
        }

        // Skins.
        var skins = root["skins"];
        for (var skinName in skins)
        {
            if (!skins.hasOwnProperty(skinName)) continue;
            var skinMap = skins[skinName];
            var skin = new spine.Skin(skinName);
            for (var slotName in skinMap)
            {
                if (!skinMap.hasOwnProperty(slotName)) continue;
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var slotEntry = skinMap[slotName];
                for (var attachmentName in slotEntry)
                {
                    if (!slotEntry.hasOwnProperty(attachmentName)) continue;
                    var attachment = this.readAttachment(skin, attachmentName, slotEntry[attachmentName]);
                    if (attachment) skin.addAttachment(slotIndex, attachmentName, attachment);
                }
            }
            skeletonData.skins.push(skin);
            if (skin.name == "default") skeletonData.defaultSkin = skin;
        }

        // Events.
        var events = root["events"];
        for (var eventName in events)
        {
            if (!events.hasOwnProperty(eventName)) continue;
            var eventMap = events[eventName];
            var eventData = new spine.EventData(eventName);
            eventData.intValue = eventMap["int"] || 0;
            eventData.floatValue = eventMap["float"] || 0;
            eventData.stringValue = eventMap["string"] || null;
            skeletonData.events.push(eventData);
        }

        // Animations.
        var animations = root["animations"];
        for (var animationName in animations)
        {
            if (!animations.hasOwnProperty(animationName)) continue;
            this.readAnimation(animationName, animations[animationName], skeletonData);
        }

        return skeletonData;
    },
    readAttachment: function (skin, name, map)
    {
        name = map["name"] || name;

        var type = spine.AttachmentType[map["type"] || "region"];
        var path = map["path"] || name;

        var scale = this.scale;
        if (type == spine.AttachmentType.region)
        {
            var region = this.attachmentLoader.newRegionAttachment(skin, name, path);
            if (!region) return null;
            region.path = path;
            region.x = (map["x"] || 0) * scale;
            region.y = (map["y"] || 0) * scale;
            region.scaleX = map.hasOwnProperty("scaleX") ? map["scaleX"] : 1;
            region.scaleY = map.hasOwnProperty("scaleY") ? map["scaleY"] : 1;
            region.rotation = map["rotation"] || 0;
            region.width = (map["width"] || 0) * scale;
            region.height = (map["height"] || 0) * scale;

            var color = map["color"];
            if (color)
            {
                region.r = this.toColor(color, 0);
                region.g = this.toColor(color, 1);
                region.b = this.toColor(color, 2);
                region.a = this.toColor(color, 3);
            }

            region.updateOffset();
            return region;
        } else if (type == spine.AttachmentType.mesh)
        {
            var mesh = this.attachmentLoader.newMeshAttachment(skin, name, path);
            if (!mesh) return null;
            mesh.path = path;
            mesh.vertices = this.getFloatArray(map, "vertices", scale);
            mesh.triangles = this.getIntArray(map, "triangles");
            mesh.regionUVs = this.getFloatArray(map, "uvs", 1);
            mesh.updateUVs();

            color = map["color"];
            if (color)
            {
                mesh.r = this.toColor(color, 0);
                mesh.g = this.toColor(color, 1);
                mesh.b = this.toColor(color, 2);
                mesh.a = this.toColor(color, 3);
            }

            mesh.hullLength = (map["hull"] || 0) * 2;
            if (map["edges"]) mesh.edges = this.getIntArray(map, "edges");
            mesh.width = (map["width"] || 0) * scale;
            mesh.height = (map["height"] || 0) * scale;
            return mesh;
        } else if (type == spine.AttachmentType.skinnedmesh)
        {
            var mesh = this.attachmentLoader.newSkinnedMeshAttachment(skin, name, path);
            if (!mesh) return null;
            mesh.path = path;

            var uvs = this.getFloatArray(map, "uvs", 1);
            var vertices = this.getFloatArray(map, "vertices", 1);
            var weights = [];
            var bones = [];
            for (var i = 0, n = vertices.length; i < n; )
            {
                var boneCount = vertices[i++] | 0;
                bones[bones.length] = boneCount;
                for (var nn = i + boneCount * 4; i < nn; )
                {
                    bones[bones.length] = vertices[i];
                    weights[weights.length] = vertices[i + 1] * scale;
                    weights[weights.length] = vertices[i + 2] * scale;
                    weights[weights.length] = vertices[i + 3];
                    i += 4;
                }
            }
            mesh.bones = bones;
            mesh.weights = weights;
            mesh.triangles = this.getIntArray(map, "triangles");
            mesh.regionUVs = uvs;
            mesh.updateUVs();

            color = map["color"];
            if (color)
            {
                mesh.r = this.toColor(color, 0);
                mesh.g = this.toColor(color, 1);
                mesh.b = this.toColor(color, 2);
                mesh.a = this.toColor(color, 3);
            }

            mesh.hullLength = (map["hull"] || 0) * 2;
            if (map["edges"]) mesh.edges = this.getIntArray(map, "edges");
            mesh.width = (map["width"] || 0) * scale;
            mesh.height = (map["height"] || 0) * scale;
            return mesh;
        } else if (type == spine.AttachmentType.boundingbox)
        {
            var attachment = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
            var vertices = map["vertices"];
            for (var i = 0, n = vertices.length; i < n; i++)
                attachment.vertices.push(vertices[i] * scale);
            return attachment;
        }
        throw "Unknown attachment type: " + type;
    },
    readAnimation: function (name, map, skeletonData)
    {
        var timelines = [];
        var duration = 0;

        var slots = map["slots"];
        for (var slotName in slots)
        {
            if (!slots.hasOwnProperty(slotName)) continue;
            var slotMap = slots[slotName];
            var slotIndex = skeletonData.findSlotIndex(slotName);

            for (var timelineName in slotMap)
            {
                if (!slotMap.hasOwnProperty(timelineName)) continue;
                var values = slotMap[timelineName];
                if (timelineName == "color")
                {
                    var timeline = new spine.ColorTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var color = valueMap["color"];
                        var r = this.toColor(color, 0);
                        var g = this.toColor(color, 1);
                        var b = this.toColor(color, 2);
                        var a = this.toColor(color, 3);
                        timeline.setFrame(frameIndex, valueMap["time"], r, g, b, a);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 5 - 5]);

                } else if (timelineName == "attachment")
                {
                    var timeline = new spine.AttachmentTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex++, valueMap["time"], valueMap["name"]);
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);

                } else
                    throw "Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")";
            }
        }

        var bones = map["bones"];
        for (var boneName in bones)
        {
            if (!bones.hasOwnProperty(boneName)) continue;
            var boneIndex = skeletonData.findBoneIndex(boneName);
            if (boneIndex == -1) throw "Bone not found: " + boneName;
            var boneMap = bones[boneName];

            for (var timelineName in boneMap)
            {
                if (!boneMap.hasOwnProperty(timelineName)) continue;
                var values = boneMap[timelineName];
                if (timelineName == "rotate")
                {
                    var timeline = new spine.RotateTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap["angle"]);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);

                } else if (timelineName == "translate" || timelineName == "scale")
                {
                    var timeline;
                    var timelineScale = 1;
                    if (timelineName == "scale")
                        timeline = new spine.ScaleTimeline(values.length);
                    else
                    {
                        timeline = new spine.TranslateTimeline(values.length);
                        timelineScale = this.scale;
                    }
                    timeline.boneIndex = boneIndex;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var x = (valueMap["x"] || 0) * timelineScale;
                        var y = (valueMap["y"] || 0) * timelineScale;
                        timeline.setFrame(frameIndex, valueMap["time"], x, y);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 3 - 3]);

                } else if (timelineName == "flipX" || timelineName == "flipY")
                {
                    var x = timelineName == "flipX";
                    var timeline = x ? new spine.FlipXTimeline(values.length) : new spine.FlipYTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    var field = x ? "x" : "y";
                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap[field] || false);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);
                } else
                    throw "Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")";
            }
        }

        var ikMap = map["ik"];
        for (var ikConstraintName in ikMap)
        {
            if (!ikMap.hasOwnProperty(ikConstraintName)) continue;
            var ikConstraint = skeletonData.findIkConstraint(ikConstraintName);
            var values = ikMap[ikConstraintName];
            var timeline = new spine.IkConstraintTimeline(values.length);
            timeline.ikConstraintIndex = skeletonData.ikConstraints.indexOf(ikConstraint);
            var frameIndex = 0;
            for (var i = 0, n = values.length; i < n; i++)
            {
                var valueMap = values[i];
                var mix = valueMap.hasOwnProperty("mix") ? valueMap["mix"] : 1;
                var bendDirection = (!valueMap.hasOwnProperty("bendPositive") || valueMap["bendPositive"]) ? 1 : -1;
                timeline.setFrame(frameIndex, valueMap["time"], mix, bendDirection);
                this.readCurve(timeline, frameIndex, valueMap);
                frameIndex++;
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.frameCount * 3 - 3]);
        }

        var ffd = map["ffd"];
        for (var skinName in ffd)
        {
            var skin = skeletonData.findSkin(skinName);
            var slotMap = ffd[skinName];
            for (slotName in slotMap)
            {
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var meshMap = slotMap[slotName];
                for (var meshName in meshMap)
                {
                    var values = meshMap[meshName];
                    var timeline = new spine.FfdTimeline(values.length);
                    var attachment = skin.getAttachment(slotIndex, meshName);
                    if (!attachment) throw "FFD attachment not found: " + meshName;
                    timeline.slotIndex = slotIndex;
                    timeline.attachment = attachment;

                    var isMesh = attachment.type == spine.AttachmentType.mesh;
                    var vertexCount;
                    if (isMesh)
                        vertexCount = attachment.vertices.length;
                    else
                        vertexCount = attachment.weights.length / 3 * 2;

                    var frameIndex = 0;
                    for (var i = 0, n = values.length; i < n; i++)
                    {
                        var valueMap = values[i];
                        var vertices;
                        if (!valueMap["vertices"])
                        {
                            if (isMesh)
                                vertices = attachment.vertices;
                            else
                            {
                                vertices = [];
                                vertices.length = vertexCount;
                            }
                        } else {
                            var verticesValue = valueMap["vertices"];
                            var vertices = [];
                            vertices.length = vertexCount;
                            var start = valueMap["offset"] || 0;
                            var nn = verticesValue.length;
                            if (this.scale == 1)
                            {
                                for (var ii = 0; ii < nn; ii++)
                                    vertices[ii + start] = verticesValue[ii];
                            } else {
                                for (var ii = 0; ii < nn; ii++)
                                    vertices[ii + start] = verticesValue[ii] * this.scale;
                            }
                            if (isMesh)
                            {
                                var meshVertices = attachment.vertices;
                                for (var ii = 0, nn = vertices.length; ii < nn; ii++)
                                    vertices[ii] += meshVertices[ii];
                            }
                        }

                        timeline.setFrame(frameIndex, valueMap["time"], vertices);
                        this.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines[timelines.length] = timeline;
                    duration = Math.max(duration, timeline.frames[timeline.frameCount - 1]);
                }
            }
        }

        var drawOrderValues = map["drawOrder"];
        if (!drawOrderValues) drawOrderValues = map["draworder"];
        if (drawOrderValues)
        {
            var timeline = new spine.DrawOrderTimeline(drawOrderValues.length);
            var slotCount = skeletonData.slots.length;
            var frameIndex = 0;
            for (var i = 0, n = drawOrderValues.length; i < n; i++)
            {
                var drawOrderMap = drawOrderValues[i];
                var drawOrder = null;
                if (drawOrderMap["offsets"])
                {
                    drawOrder = [];
                    drawOrder.length = slotCount;
                    for (var ii = slotCount - 1; ii >= 0; ii--)
                        drawOrder[ii] = -1;
                    var offsets = drawOrderMap["offsets"];
                    var unchanged = [];
                    unchanged.length = slotCount - offsets.length;
                    var originalIndex = 0, unchangedIndex = 0;
                    for (var ii = 0, nn = offsets.length; ii < nn; ii++)
                    {
                        var offsetMap = offsets[ii];
                        var slotIndex = skeletonData.findSlotIndex(offsetMap["slot"]);
                        if (slotIndex == -1) throw "Slot not found: " + offsetMap["slot"];
                        // Collect unchanged items.
                        while (originalIndex != slotIndex)
                            unchanged[unchangedIndex++] = originalIndex++;
                        // Set changed items.
                        drawOrder[originalIndex + offsetMap["offset"]] = originalIndex++;
                    }
                    // Collect remaining unchanged items.
                    while (originalIndex < slotCount)
                        unchanged[unchangedIndex++] = originalIndex++;
                    // Fill in unchanged items.
                    for (var ii = slotCount - 1; ii >= 0; ii--)
                        if (drawOrder[ii] == -1) drawOrder[ii] = unchanged[--unchangedIndex];
                }
                timeline.setFrame(frameIndex++, drawOrderMap["time"], drawOrder);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }

        var events = map["events"];
        if (events)
        {
            var timeline = new spine.EventTimeline(events.length);
            var frameIndex = 0;
            for (var i = 0, n = events.length; i < n; i++)
            {
                var eventMap = events[i];
                var eventData = skeletonData.findEvent(eventMap["name"]);
                if (!eventData) throw "Event not found: " + eventMap["name"];
                var event = new spine.Event(eventData);
                event.intValue = eventMap.hasOwnProperty("int") ? eventMap["int"] : eventData.intValue;
                event.floatValue = eventMap.hasOwnProperty("float") ? eventMap["float"] : eventData.floatValue;
                event.stringValue = eventMap.hasOwnProperty("string") ? eventMap["string"] : eventData.stringValue;
                timeline.setFrame(frameIndex++, eventMap["time"], event);
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);
        }

        skeletonData.animations.push(new spine.Animation(name, timelines, duration));
    },
    readCurve: function (timeline, frameIndex, valueMap)
    {
        var curve = valueMap["curve"];
        if (!curve)
            timeline.curves.setLinear(frameIndex);
        else if (curve == "stepped")
            timeline.curves.setStepped(frameIndex);
        else if (curve instanceof Array)
            timeline.curves.setCurve(frameIndex, curve[0], curve[1], curve[2], curve[3]);
    },
    toColor: function (hexString, colorIndex)
    {
        if (hexString.length != 8) throw "Color hexidecimal length must be 8, recieved: " + hexString;
        return parseInt(hexString.substring(colorIndex * 2, (colorIndex * 2) + 2), 16) / 255;
    },
    getFloatArray: function (map, name, scale)
    {
        var list = map[name];
        var values = new spine.Float32Array(list.length);
        var i = 0, n = list.length;
        if (scale == 1)
        {
            for (; i < n; i++)
                values[i] = list[i];
        } else {
            for (; i < n; i++)
                values[i] = list[i] * scale;
        }
        return values;
    },
    getIntArray: function (map, name)
    {
        var list = map[name];
        var values = new spine.Uint16Array(list.length);
        for (var i = 0, n = list.length; i < n; i++)
            values[i] = list[i] | 0;
        return values;
    }
};
module.exports = spine.SkeletonJsonParser;


},{"../SpineUtil":51,"./Animation":11,"./AttachmentTimeline":19,"./AttachmentType":20,"./BoneData":22,"./ColorTimeline":24,"./DrawOrderTimeline":26,"./Event":27,"./EventData":28,"./EventTimeline":29,"./FfdTimeline":30,"./FlipXTimeline":31,"./FlipYTimeline":32,"./IkConstraintData":34,"./IkConstraintTimeline":35,"./RotateTimeline":38,"./ScaleTimeline":39,"./SkeletonData":42,"./Skin":44,"./SlotData":47,"./TranslateTimeline":49}],44:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Skin = function (name)
{
    this.name = name;
    this.attachments = {};
};
spine.Skin.prototype = {
    addAttachment: function (slotIndex, name, attachment)
    {
        this.attachments[slotIndex + ":" + name] = attachment;
    },
    getAttachment: function (slotIndex, name)
    {
        return this.attachments[slotIndex + ":" + name];
    },
    _attachAll: function (skeleton, oldSkin)
    {
        for (var key in oldSkin.attachments)
        {
            var colon = key.indexOf(":");
            var slotIndex = parseInt(key.substring(0, colon));
            var name = key.substring(colon + 1);
            var slot = skeleton.slots[slotIndex];
            if (slot.attachment && slot.attachment.name == name)
            {
                var attachment = this.getAttachment(slotIndex, name);
                if (attachment) slot.setAttachment(attachment);
            }
        }
    }
};
module.exports = spine.Skin;


},{"../SpineUtil":51}],45:[function(require,module,exports){
var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkinnedMeshAttachment = function (name)
{
    this.name = name;
};
spine.SkinnedMeshAttachment.prototype = {
    type: spine.AttachmentType.skinnedmesh,
    bones: null,
    weights: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionU: 0, regionV: 0, regionU2: 0, regionV2: 0, regionRotate: false,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    edges: null,
    width: 0, height: 0,
    updateUVs: function (u, v, u2, v2, rotate)
    {
        var width = this.regionU2 - this.regionU, height = this.regionV2 - this.regionV;
        var n = this.regionUVs.length;
        if (!this.uvs || this.uvs.length != n)
        {
            this.uvs = new spine.Float32Array(n);
        }
        if (this.regionRotate)
        {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i + 1] * width;
                this.uvs[i + 1] = this.regionV + height - this.regionUVs[i] * height;
            }
        } else {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i] * width;
                this.uvs[i + 1] = this.regionV + this.regionUVs[i + 1] * height;
            }
        }
    },
    computeWorldVertices: function (x, y, slot, worldVertices)
    {
        var skeletonBones = slot.bone.skeleton.bones;
        var weights = this.weights;
        var bones = this.bones;

        var w = 0, v = 0, b = 0, f = 0, n = bones.length, nn;
        var wx, wy, bone, vx, vy, weight;
        if (!slot.attachmentVertices.length)
        {
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3)
                {
                    bone = skeletonBones[bones[v]];
                    vx = weights[b];
                    vy = weights[b + 1];
                    weight = weights[b + 2];
                    wx += (vx * bone.m00 + vy * bone.m01 + bone.worldX) * weight;
                    wy += (vx * bone.m10 + vy * bone.m11 + bone.worldY) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        } else {
            var ffd = slot.attachmentVertices;
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3, f += 2)
                {
                    bone = skeletonBones[bones[v]];
                    vx = weights[b] + ffd[f];
                    vy = weights[b + 1] + ffd[f + 1];
                    weight = weights[b + 2];
                    wx += (vx * bone.m00 + vy * bone.m01 + bone.worldX) * weight;
                    wy += (vx * bone.m10 + vy * bone.m11 + bone.worldY) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        }
    }
};
module.exports = spine.SkinnedMeshAttachment;


},{"../SpineUtil":51,"./AttachmentType":20}],46:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Slot = function (slotData, bone)
{
    this.data = slotData;
    this.bone = bone;
    this.setToSetupPose();
};
spine.Slot.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    _attachmentTime: 0,
    attachment: null,
    attachmentVertices: [],
    setAttachment: function (attachment)
    {
        this.attachment = attachment;
        this._attachmentTime = this.bone.skeleton.time;
        this.attachmentVertices.length = 0;
    },
    setAttachmentTime: function (time)
    {
        this._attachmentTime = this.bone.skeleton.time - time;
    },
    getAttachmentTime: function ()
    {
        return this.bone.skeleton.time - this._attachmentTime;
    },
    setToSetupPose: function ()
    {
        var data = this.data;
        this.r = data.r;
        this.g = data.g;
        this.b = data.b;
        this.a = data.a;

        var slotDatas = this.bone.skeleton.data.slots;
        for (var i = 0, n = slotDatas.length; i < n; i++)
        {
            if (slotDatas[i] == data)
            {
                this.setAttachment(!data.attachmentName ? null : this.bone.skeleton.getAttachmentBySlotIndex(i, data.attachmentName));
                break;
            }
        }
    }
};
module.exports = spine.Slot;


},{"../SpineUtil":51}],47:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.SlotData = function (name, boneData)
{
    this.name = name;
    this.boneData = boneData;
};
spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null,
    additiveBlending: false
};
module.exports = spine.SlotData;


},{"../SpineUtil":51}],48:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.TrackEntry = function ()
{};
spine.TrackEntry.prototype = {
    next: null, previous: null,
    animation: null,
    loop: false,
    delay: 0, time: 0, lastTime: -1, endTime: 0,
    timeScale: 1,
    mixTime: 0, mixDuration: 0, mix: 1,
    onStart: null, onEnd: null, onComplete: null, onEvent: null
};
module.exports = spine.TrackEntry;


},{"../SpineUtil":51}],49:[function(require,module,exports){
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.TranslateTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.TranslateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            bone.x += (bone.data.x + frames[frames.length - 2] - bone.x) * alpha;
            bone.y += (bone.data.y + frames[frames.length - 1] - bone.y) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameX = frames[frameIndex - 2];
        var prevFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.x += (bone.data.x + prevFrameX + (frames[frameIndex + 1/*FRAME_X*/] - prevFrameX) * percent - bone.x) * alpha;
        bone.y += (bone.data.y + prevFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - prevFrameY) * percent - bone.y) * alpha;
    }
};
module.exports = spine.TranslateTimeline;


},{"../SpineUtil":51,"./Animation":11,"./Curves":25}],50:[function(require,module,exports){
/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.1
 *
 * Copyright (c) 2013, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable and
 * non-transferable license to install, execute and perform the Spine Runtimes
 * Software (the "Software") solely for internal use. Without the written
 * permission of Esoteric Software (typically granted by licensing Spine), you
 * may not (a) modify, translate, adapt or otherwise create derivative works,
 * improvements of the Software or develop new applications using the Software
 * or (b) remove, delete, alter or obscure any trademarks or any copyright,
 * trademark, patent or other intellectual property or proprietary rights
 * notices on or in the Software, including any copy thereof. Redistributions
 * in binary or source form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.AnimationStateData = require('./AnimationStateData');
spine.AnimationState = require('./AnimationState');
spine.AtlasAttachmentParser = require('./AtlasAttachmentParser');
spine.Atlas = require('./Atlas');
spine.AtlasPage = require('./AtlasPage');
spine.AtlasReader = require('./AtlasReader');
spine.AtlasRegion = require('./AtlasRegion');
spine.AttachmentTimeline = require('./AttachmentTimeline');
spine.AttachmentType = require('./AttachmentType');
spine.BoneData = require('./BoneData');
spine.Bone = require('./Bone');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment');
spine.ColorTimeline = require('./ColorTimeline');
spine.Curves = require('./Curves');
spine.DrawOrderTimeline = require('./DrawOrderTimeline');
spine.EventData = require('./EventData');
spine.Event = require('./Event');
spine.EventTimeline = require('./EventTimeline');
spine.FfdTimeline = require('./FfdTimeline');
spine.FlipXTimeline = require('./FlipXTimeline');
spine.FlipYTimeline = require('./FlipYTimeline');
spine.IkConstraintData = require('./IkConstraintData');
spine.IkConstraint = require('./IkConstraint');
spine.IkConstraintTimeline = require('./IkConstraintTimeline');
spine.MeshAttachment = require('./MeshAttachment');
spine.RegionAttachment = require('./RegionAttachment');
spine.RotateTimeline = require('./RotateTimeline');
spine.ScaleTimeline = require('./ScaleTimeline');
spine.SkeletonBounds = require('./SkeletonBounds');
spine.SkeletonData = require('./SkeletonData');
spine.Skeleton = require('./Skeleton');
spine.SkeletonJsonParser = require('./SkeletonJsonParser');
spine.Skin = require('./Skin.js');
spine.SkinnedMeshAttachment = require('./SkinnedMeshAttachment');
spine.SlotData = require('./SlotData');
spine.Slot = require('./Slot');
spine.TrackEntry = require('./TrackEntry');
spine.TranslateTimeline = require('./TranslateTimeline');
module.exports = spine;

},{"../SpineUtil":51,"./Animation":11,"./AnimationState":12,"./AnimationStateData":13,"./Atlas":14,"./AtlasAttachmentParser":15,"./AtlasPage":16,"./AtlasReader":17,"./AtlasRegion":18,"./AttachmentTimeline":19,"./AttachmentType":20,"./Bone":21,"./BoneData":22,"./BoundingBoxAttachment":23,"./ColorTimeline":24,"./Curves":25,"./DrawOrderTimeline":26,"./Event":27,"./EventData":28,"./EventTimeline":29,"./FfdTimeline":30,"./FlipXTimeline":31,"./FlipYTimeline":32,"./IkConstraint":33,"./IkConstraintData":34,"./IkConstraintTimeline":35,"./MeshAttachment":36,"./RegionAttachment":37,"./RotateTimeline":38,"./ScaleTimeline":39,"./Skeleton":40,"./SkeletonBounds":41,"./SkeletonData":42,"./SkeletonJsonParser":43,"./Skin.js":44,"./SkinnedMeshAttachment":45,"./Slot":46,"./SlotData":47,"./TrackEntry":48,"./TranslateTimeline":49}],51:[function(require,module,exports){
module.exports = {
    radDeg: 180 / Math.PI,
    degRad: Math.PI / 180,
    temp: [],
    Float32Array: (typeof(Float32Array) === 'undefined') ? Array : Float32Array,
    Uint16Array: (typeof(Uint16Array) === 'undefined') ? Array : Uint16Array
};


},{}],52:[function(require,module,exports){
var PIXI = require('pixi.js'),
    spine = require('../SpineRuntime');
/* Esoteric Software SPINE wrapper for pixi.js */
spine.Bone.yDown = true;
/**
 * A class that enables the you to import and run your spine animations in pixi.
 * The Spine animation data needs to be loaded using either the Loader or a SpineLoader before it can be used by this class
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 *
 * ```js
 * var spineAnimation = new PIXI.Spine(spineData);
 * ```
 *
 * @class
 * @extends Container
 * @memberof PIXI.spine
 * @param spineData {object} The spine data loaded from a spine atlas.
 */
function Spine(spineData)
{
    PIXI.Container.call(this);

    if (!spineData)
    {
        throw new Error('The spineData param is required.');
    }

    /**
     * The spineData object
     *
     * @member {object}
     */
    this.spineData = spineData;

    /**
     * A spine Skeleton object
     *
     * @member {object}
     */
    this.skeleton = new spine.Skeleton(spineData);
    this.skeleton.updateWorldTransform();

    /**
     * A spine AnimationStateData object created from the spine data passed in the constructor
     *
     * @member {object}
     */
    this.stateData = new spine.AnimationStateData(spineData);

    /**
     * A spine AnimationState object created from the spine AnimationStateData object
     *
     * @member {object}
     */
    this.state = new spine.AnimationState(this.stateData);

    /**
     * An array of containers
     *
     * @member {Container[]}
     */
    this.slotContainers = [];

    for (var i = 0, n = this.skeleton.slots.length; i < n; i++)
    {
        var slot = this.skeleton.slots[i];
        var attachment = slot.attachment;
        var slotContainer = new PIXI.Container();
        this.slotContainers.push(slotContainer);
        this.addChild(slotContainer);

        if (attachment instanceof spine.RegionAttachment)
        {
            var spriteName = attachment.rendererObject.name;
            var sprite = this.createSprite(slot, attachment);
            slot.currentSprite = sprite;
            slot.currentSpriteName = spriteName;
            slotContainer.addChild(sprite);
        }
        else if (attachment instanceof spine.MeshAttachment)
        {
            var mesh = this.createMesh(slot, attachment);
            slot.currentMesh = mesh;
            slot.currentMeshName = attachment.name;
            slotContainer.addChild(mesh);
        }
        else
        {
            continue;
        }

    }

    /**
     * Should the Spine object update its transforms
     *
     * @member {boolean}
     */
    this.autoUpdate = true;
}

Spine.prototype = Object.create(PIXI.Container.prototype);
Spine.prototype.constructor = Spine;
module.exports = Spine;

Object.defineProperties(Spine.prototype, {
    /**
     * If this flag is set to true, the spine animation will be autoupdated every time
     * the object id drawn. The down side of this approach is that the delta time is
     * automatically calculated and you could miss out on cool effects like slow motion,
     * pause, skip ahead and the sorts. Most of these effects can be achieved even with
     * autoupdate enabled but are harder to achieve.
     *
     * @member {boolean}
     * @memberof Spine#
     * @default true
     */
    autoUpdate: {
        get: function ()
        {
            return (this.updateTransform === Spine.prototype.autoUpdateTransform);
        },

        set: function (value)
        {
            this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
        }
    }
});

/**
 * Update the spine skeleton and its animations by delta time (dt)
 *
 * @param dt {number} Delta time. Time by which the animation should be updated
 */
Spine.prototype.update = function (dt)
{
    this.state.update(dt);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    var drawOrder = this.skeleton.drawOrder;
    var slots = this.skeleton.slots;

    for (var i = 0, n = drawOrder.length; i < n; i++)
    {
        this.children[i] = this.slotContainers[drawOrder[i]];
    }

    for (i = 0, n = slots.length; i < n; i++)
    {
        var slot = slots[i];
        var attachment = slot.attachment;
        var slotContainer = this.slotContainers[i];

        if (!attachment)
        {
            slotContainer.visible = false;
            continue;
        }

        var type = attachment.type;
        if (type === spine.AttachmentType.region)
        {
            if (attachment.rendererObject)
            {
                if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.rendererObject.name)
                {
                    var spriteName = attachment.rendererObject.name;
                    if (slot.currentSprite !== undefined)
                    {
                        slot.currentSprite.visible = false;
                    }
                    slot.sprites = slot.sprites || {};
                    if (slot.sprites[spriteName] !== undefined)
                    {
                        slot.sprites[spriteName].visible = true;
                    }
                    else
                    {
                        var sprite = this.createSprite(slot, attachment);
                        slotContainer.addChild(sprite);
                    }
                    slot.currentSprite = slot.sprites[spriteName];
                    slot.currentSpriteName = spriteName;
                }
            }

            var bone = slot.bone;

            slotContainer.position.x = bone.worldX + attachment.x * bone.m00 + attachment.y * bone.m01;
            slotContainer.position.y = bone.worldY + attachment.x * bone.m10 + attachment.y * bone.m11;
            slotContainer.scale.x = bone.worldScaleX;
            slotContainer.scale.y = bone.worldScaleY;

            slotContainer.rotation = -(slot.bone.worldRotation * spine.degRad);

            slot.currentSprite.tint = PIXI.utils.rgb2hex([slot.r,slot.g,slot.b]);
        }
        else if (type === spine.AttachmentType.skinnedmesh)
        {
            if (!slot.currentMeshName || slot.currentMeshName !== attachment.name)
            {
                var meshName = attachment.name;
                if (slot.currentMesh !== undefined)
                {
                    slot.currentMesh.visible = false;
                }

                slot.meshes = slot.meshes || {};

                if (slot.meshes[meshName] !== undefined)
                {
                    slot.meshes[meshName].visible = true;
                }
                else
                {
                    var mesh = this.createMesh(slot, attachment);
                    slotContainer.addChild(mesh);
                }

                slot.currentMesh = slot.meshes[meshName];
                slot.currentMeshName = meshName;
            }

            attachment.computeWorldVertices(slot.bone.skeleton.x, slot.bone.skeleton.y, slot, slot.currentMesh.vertices);

        }
        else
        {
            slotContainer.visible = false;
            continue;
        }
        slotContainer.visible = true;

        slotContainer.alpha = slot.a;
    }
};

/**
 * When autoupdate is set to yes this function is used as pixi's updateTransform function
 *
 * @private
 */
Spine.prototype.autoUpdateTransform = function ()
{
    this.lastTime = this.lastTime || Date.now();
    var timeDelta = (Date.now() - this.lastTime) * 0.001;
    this.lastTime = Date.now();

    this.update(timeDelta);

    PIXI.Container.prototype.updateTransform.call(this);
};

/**
 * Create a new sprite to be used with spine.RegionAttachment
 *
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createSprite = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var baseTexture = descriptor.page.rendererObject;
    var spriteRect = new PIXI.math.Rectangle(descriptor.x,
                                        descriptor.y,
                                        descriptor.rotate ? descriptor.height : descriptor.width,
                                        descriptor.rotate ? descriptor.width : descriptor.height);
    var spriteTexture = new PIXI.Texture(baseTexture, spriteRect);
    var sprite = new PIXI.Sprite(spriteTexture);

    var baseRotation = descriptor.rotate ? Math.PI * 0.5 : 0.0;
    sprite.scale.x = descriptor.width / descriptor.originalWidth * attachment.scaleX;
    sprite.scale.y = descriptor.height / descriptor.originalHeight * attachment.scaleY;
    sprite.rotation = baseRotation - (attachment.rotation * spine.degRad);
    sprite.anchor.x = sprite.anchor.y = 0.5;
    sprite.alpha = attachment.a;

    slot.sprites = slot.sprites || {};
    slot.sprites[descriptor.name] = sprite;
    return sprite;
};

/**
 * Creates a Strip from the spine data
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createMesh = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var baseTexture = descriptor.page.rendererObject;
    var texture = new PIXI.Texture(baseTexture);

    var strip = new PIXI.Strip(texture);
    strip.drawMode = PIXI.Strip.DRAW_MODES.TRIANGLES;
    strip.canvasPadding = 1.5;

    strip.vertices = new Float32Array(attachment.uvs.length);
    strip.uvs = attachment.uvs;
    strip.indices = attachment.triangles;
    strip.alpha = attachment.a;

    slot.meshes = slot.meshes || {};
    slot.meshes[attachment.name] = strip;

    return strip;
};

},{"../SpineRuntime":50,"pixi.js":"pixi.js"}],53:[function(require,module,exports){
/**
 * @file        Spine resource loader
 * @author      Ivan Popelyshev <ivan.popelyshev@gmail.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI.loaders
 */

var atlasParser = require('./atlasParser'),
    PIXI = require('pixi.js');

function Loader(baseUrl, concurrency)
{
    PIXI.loaders.Loader.call(this, baseUrl, concurrency);

    // parse any spine data into a spine object
    this.use(atlasParser());
}

Loader.prototype = Object.create(PIXI.loaders.Loader.prototype);
Loader.prototype.constructor = Loader;

module.exports = Loader;

},{"./atlasParser":54,"pixi.js":"pixi.js"}],54:[function(require,module,exports){
var Resource = require('resource-loader').Resource,
    async = require('async'),
    spine = require('../SpineRuntime');

module.exports = function () {
    return function (resource, next) {
        // skip if no data, its not json, or it isn't atlas data
        if (!resource.data || !resource.isJson || !resource.data.bones) {
            return next();
        }

        /**
         * use a bit of hackery to load the atlas file, here we assume that the .json, .atlas and .png files
         * that correspond to the spine file are in the same base URL and that the .json and .atlas files
         * have the same name
         */
        var atlasPath = resource.url.substr(0, resource.url.lastIndexOf('.')) + '.atlas';
        var atlasOptions = {
            crossOrigin: resource.crossOrigin,
            xhrType: Resource.XHR_RESPONSE_TYPE.TEXT
        };
        var baseUrl = resource.url.substr(0, resource.url.lastIndexOf('/') + 1);


        this.add(resource.name + '_atlas', atlasPath, atlasOptions, function (res) {
            // create a spine atlas using the loaded text
            var spineAtlas = new spine.Atlas(this.xhr.responseText, baseUrl, res.crossOrigin);

            // spine animation
            var spineJsonParser = new spine.SkeletonJsonParser(new spine.AtlasAttachmentParser(spineAtlas));
            var skeletonData = spineJsonParser.readSkeletonData(resource.data);

            resource.spineData = skeletonData;
            resource.spineAtlas = spineAtlas;

            // Go through each spineAtlas.pages and wait for page.rendererObject (a baseTexture) to
            // load. Once all loaded, then call the next function.
            async.each(spineAtlas.pages, function (page, done) {
                if (page.rendererObject.hasLoaded) {
                    done();
                }
                else {
                    page.rendererObject.once('loaded', done);
                }
            }, next);
        });
    };
};

},{"../SpineRuntime":50,"async":2,"resource-loader":8}],55:[function(require,module,exports){
module.exports = {
    atlasParser: require('./atlasParser'),
    Loader: require('./Loader')
};

},{"./Loader":53,"./atlasParser":54}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXgiLCJub2RlX21vZHVsZXMvYXN5bmMvbGliL2FzeW5jLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9yZXNvdXJjZS1sb2FkZXIvbm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVzb3VyY2UtbG9hZGVyL3NyYy9Mb2FkZXIuanMiLCJub2RlX21vZHVsZXMvcmVzb3VyY2UtbG9hZGVyL3NyYy9SZXNvdXJjZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXNvdXJjZS1sb2FkZXIvc3JjL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9yZXNvdXJjZS1sb2FkZXIvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Jlc291cmNlLWxvYWRlci9zcmMvbWlkZGxld2FyZXMvY2FjaGluZy9tZW1vcnkuanMiLCJub2RlX21vZHVsZXMvcmVzb3VyY2UtbG9hZGVyL3NyYy9taWRkbGV3YXJlcy9wYXJzaW5nL2Jsb2IuanMiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvbi5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQW5pbWF0aW9uU3RhdGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0FuaW1hdGlvblN0YXRlRGF0YS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXMuanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0bGFzQXR0YWNobWVudFBhcnNlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNQYWdlLmpzIiwic3JjL1NwaW5lUnVudGltZS9BdGxhc1JlYWRlci5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXRsYXNSZWdpb24uanMiLCJzcmMvU3BpbmVSdW50aW1lL0F0dGFjaG1lbnRUaW1lbGluZS5qcyIsInNyYy9TcGluZVJ1bnRpbWUvQXR0YWNobWVudFR5cGUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0JvbmVEYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Cb3VuZGluZ0JveEF0dGFjaG1lbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0NvbG9yVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0N1cnZlcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvRHJhd09yZGVyVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50LmpzIiwic3JjL1NwaW5lUnVudGltZS9FdmVudERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0V2ZW50VGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL0ZmZFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9GbGlwWVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ja0NvbnN0cmFpbnQuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL0lrQ29uc3RyYWludFRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9NZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUmVnaW9uQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvUm90YXRlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NjYWxlVGltZWxpbmUuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NrZWxldG9uLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkJvdW5kcy5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2tlbGV0b25EYXRhLmpzIiwic3JjL1NwaW5lUnVudGltZS9Ta2VsZXRvbkpzb25QYXJzZXIuanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW4uanMiLCJzcmMvU3BpbmVSdW50aW1lL1NraW5uZWRNZXNoQXR0YWNobWVudC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdC5qcyIsInNyYy9TcGluZVJ1bnRpbWUvU2xvdERhdGEuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYWNrRW50cnkuanMiLCJzcmMvU3BpbmVSdW50aW1lL1RyYW5zbGF0ZVRpbWVsaW5lLmpzIiwic3JjL1NwaW5lUnVudGltZS9pbmRleC5qcyIsInNyYy9TcGluZVV0aWwvaW5kZXguanMiLCJzcmMvU3BpbmUvaW5kZXguanMiLCJzcmMvbG9hZGVycy9Mb2FkZXIuanMiLCJzcmMvbG9hZGVycy9hdGxhc1BhcnNlci5qcyIsInNyYy9sb2FkZXJzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbm1DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25zQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQG5hbWVzcGFjZSBQSVhJLnNwaW5lXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgncGl4aS5qcycpLnNwaW5lID0ge1xuICAgIFNwaW5lOiAgICAgICAgICByZXF1aXJlKCcuL1NwaW5lJyksXG4gICAgU3BpbmVSdW50aW1lOiAgIHJlcXVpcmUoJy4vU3BpbmVSdW50aW1lJyksXG4gICAgbG9hZGVyczogICAgICAgIHJlcXVpcmUoJy4vbG9hZGVycycpXG59O1xuIiwiLyohXG4gKiBhc3luY1xuICogaHR0cHM6Ly9naXRodWIuY29tL2Nhb2xhbi9hc3luY1xuICpcbiAqIENvcHlyaWdodCAyMDEwLTIwMTQgQ2FvbGFuIE1jTWFob25cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICovXG4vKmpzaGludCBvbmV2YXI6IGZhbHNlLCBpbmRlbnQ6NCAqL1xuLypnbG9iYWwgc2V0SW1tZWRpYXRlOiBmYWxzZSwgc2V0VGltZW91dDogZmFsc2UsIGNvbnNvbGU6IGZhbHNlICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHJvb3QsIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgcm9vdCA9IHRoaXM7XG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgcHJldmlvdXNfYXN5bmMgPSByb290LmFzeW5jO1xuICAgIH1cblxuICAgIGFzeW5jLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBwcmV2aW91c19hc3luYztcbiAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmx5X29uY2UoZm4pIHtcbiAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHJvb3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuICAgIHZhciBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gX3RvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9O1xuXG4gICAgdmFyIF9lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgaWYgKGFyci5mb3JFYWNoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLmZvckVhY2goaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaV0sIGksIGFycik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9tYXAgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLm1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5tYXAoaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvcih4LCBpLCBhKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9O1xuXG4gICAgdmFyIF9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWVtbykge1xuICAgICAgICBpZiAoYXJyLnJlZHVjZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pO1xuICAgICAgICB9XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIG1lbW8gPSBpdGVyYXRvcihtZW1vLCB4LCBpLCBhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG5cbiAgICB2YXIgX2tleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICEocHJvY2Vzcy5uZXh0VGljaykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBhc3luYy5uZXh0VGljaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICBfZWFjaChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBvbmx5X29uY2UoZG9uZSkgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIGRvbmUoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaCA9IGFzeW5jLmVhY2g7XG5cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIHZhciBpdGVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGl0ZXJhdGUoKTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2hTZXJpZXMgPSBhc3luYy5lYWNoU2VyaWVzO1xuXG4gICAgYXN5bmMuZWFjaExpbWl0ID0gZnVuY3Rpb24gKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZm4gPSBfZWFjaExpbWl0KGxpbWl0KTtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgW2FyciwgaXRlcmF0b3IsIGNhbGxiYWNrXSk7XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoTGltaXQgPSBhc3luYy5lYWNoTGltaXQ7XG5cbiAgICB2YXIgX2VhY2hMaW1pdCA9IGZ1bmN0aW9uIChsaW1pdCkge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICBpZiAoIWFyci5sZW5ndGggfHwgbGltaXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgICAgICB2YXIgc3RhcnRlZCA9IDA7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG5cbiAgICAgICAgICAgIChmdW5jdGlvbiByZXBsZW5pc2ggKCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAocnVubmluZyA8IGxpbWl0ICYmIHN0YXJ0ZWQgPCBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihhcnJbc3RhcnRlZCAtIDFdLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9O1xuICAgIH07XG5cblxuICAgIHZhciBkb1BhcmFsbGVsID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW2FzeW5jLmVhY2hdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZG9QYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24obGltaXQsIGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW19lYWNoTGltaXQobGltaXQpXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGRvU2VyaWVzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW2FzeW5jLmVhY2hTZXJpZXNdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcblxuXG4gICAgdmFyIF9hc3luY01hcCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW3guaW5kZXhdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLm1hcCA9IGRvUGFyYWxsZWwoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBTZXJpZXMgPSBkb1NlcmllcyhfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcExpbWl0ID0gZnVuY3Rpb24gKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX21hcExpbWl0KGxpbWl0KShhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHZhciBfbWFwTGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgICAgICByZXR1cm4gZG9QYXJhbGxlbExpbWl0KGxpbWl0LCBfYXN5bmNNYXApO1xuICAgIH07XG5cbiAgICAvLyByZWR1Y2Ugb25seSBoYXMgYSBzZXJpZXMgdmVyc2lvbiwgYXMgZG9pbmcgcmVkdWNlIGluIHBhcmFsbGVsIHdvbid0XG4gICAgLy8gd29yayBpbiBtYW55IHNpdHVhdGlvbnMuXG4gICAgYXN5bmMucmVkdWNlID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKG1lbW8sIHgsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICBtZW1vID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWVtbyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gaW5qZWN0IGFsaWFzXG4gICAgYXN5bmMuaW5qZWN0ID0gYXN5bmMucmVkdWNlO1xuICAgIC8vIGZvbGRsIGFsaWFzXG4gICAgYXN5bmMuZm9sZGwgPSBhc3luYy5yZWR1Y2U7XG5cbiAgICBhc3luYy5yZWR1Y2VSaWdodCA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmV2ZXJzZWQgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9KS5yZXZlcnNlKCk7XG4gICAgICAgIGFzeW5jLnJlZHVjZShyZXZlcnNlZCwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8vIGZvbGRyIGFsaWFzXG4gICAgYXN5bmMuZm9sZHIgPSBhc3luYy5yZWR1Y2VSaWdodDtcblxuICAgIHZhciBfZmlsdGVyID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZmlsdGVyID0gZG9QYXJhbGxlbChfZmlsdGVyKTtcbiAgICBhc3luYy5maWx0ZXJTZXJpZXMgPSBkb1NlcmllcyhfZmlsdGVyKTtcbiAgICAvLyBzZWxlY3QgYWxpYXNcbiAgICBhc3luYy5zZWxlY3QgPSBhc3luYy5maWx0ZXI7XG4gICAgYXN5bmMuc2VsZWN0U2VyaWVzID0gYXN5bmMuZmlsdGVyU2VyaWVzO1xuXG4gICAgdmFyIF9yZWplY3QgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMucmVqZWN0ID0gZG9QYXJhbGxlbChfcmVqZWN0KTtcbiAgICBhc3luYy5yZWplY3RTZXJpZXMgPSBkb1NlcmllcyhfcmVqZWN0KTtcblxuICAgIHZhciBfZGV0ZWN0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soeCk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2soKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5kZXRlY3QgPSBkb1BhcmFsbGVsKF9kZXRlY3QpO1xuICAgIGFzeW5jLmRldGVjdFNlcmllcyA9IGRvU2VyaWVzKF9kZXRlY3QpO1xuXG4gICAgYXN5bmMuc29tZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2goYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGFueSBhbGlhc1xuICAgIGFzeW5jLmFueSA9IGFzeW5jLnNvbWU7XG5cbiAgICBhc3luYy5ldmVyeSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2goYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBhbGwgYWxpYXNcbiAgICBhc3luYy5hbGwgPSBhc3luYy5ldmVyeTtcblxuICAgIGFzeW5jLnNvcnRCeSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5tYXAoYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uIChlcnIsIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge3ZhbHVlOiB4LCBjcml0ZXJpYTogY3JpdGVyaWF9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYSwgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBfbWFwKHJlc3VsdHMuc29ydChmbiksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmF1dG8gPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIHZhciBrZXlzID0gX2tleXModGFza3MpO1xuICAgICAgICB2YXIgcmVtYWluaW5nVGFza3MgPSBrZXlzLmxlbmd0aFxuICAgICAgICBpZiAoIXJlbWFpbmluZ1Rhc2tzKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHRzID0ge307XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICAgICAgICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy51bnNoaWZ0KGZuKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciB0YXNrQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZW1haW5pbmdUYXNrcy0tXG4gICAgICAgICAgICBfZWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRMaXN0ZW5lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXJlbWFpbmluZ1Rhc2tzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgLy8gcHJldmVudCBmaW5hbCBjYWxsYmFjayBmcm9tIGNhbGxpbmcgaXRzZWxmIGlmIGl0IGVycm9yc1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAgICAgICAgICAgICB0aGVDYWxsYmFjayhudWxsLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2VhY2goa2V5cywgZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gX2lzQXJyYXkodGFza3Nba10pID8gdGFza3Nba106IFt0YXNrc1trXV07XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2VhY2goX2tleXMocmVzdWx0cyksIGZ1bmN0aW9uKHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gcmVzdWx0c1tya2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3Agc3Vic2VxdWVudCBlcnJvcnMgaGl0dGluZyBjYWxsYmFjayBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5yZXRyeSA9IGZ1bmN0aW9uKHRpbWVzLCB0YXNrLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgREVGQVVMVF9USU1FUyA9IDU7XG4gICAgICAgIHZhciBhdHRlbXB0cyA9IFtdO1xuICAgICAgICAvLyBVc2UgZGVmYXVsdHMgaWYgdGltZXMgbm90IHBhc3NlZFxuICAgICAgICBpZiAodHlwZW9mIHRpbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHRhc2s7XG4gICAgICAgICAgICB0YXNrID0gdGltZXM7XG4gICAgICAgICAgICB0aW1lcyA9IERFRkFVTFRfVElNRVM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFrZSBzdXJlIHRpbWVzIGlzIGEgbnVtYmVyXG4gICAgICAgIHRpbWVzID0gcGFyc2VJbnQodGltZXMsIDEwKSB8fCBERUZBVUxUX1RJTUVTO1xuICAgICAgICB2YXIgd3JhcHBlZFRhc2sgPSBmdW5jdGlvbih3cmFwcGVkQ2FsbGJhY2ssIHdyYXBwZWRSZXN1bHRzKSB7XG4gICAgICAgICAgICB2YXIgcmV0cnlBdHRlbXB0ID0gZnVuY3Rpb24odGFzaywgZmluYWxBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2soIWVyciB8fCBmaW5hbEF0dGVtcHQsIHtlcnI6IGVyciwgcmVzdWx0OiByZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgd3JhcHBlZFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd2hpbGUgKHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUF0dGVtcHQodGFzaywgISh0aW1lcy09MSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFzeW5jLnNlcmllcyhhdHRlbXB0cywgZnVuY3Rpb24oZG9uZSwgZGF0YSl7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAod3JhcHBlZENhbGxiYWNrIHx8IGNhbGxiYWNrKShkYXRhLmVyciwgZGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgYSBjYWxsYmFjayBpcyBwYXNzZWQsIHJ1biB0aGlzIGFzIGEgY29udHJvbGwgZmxvd1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sgPyB3cmFwcGVkVGFzaygpIDogd3JhcHBlZFRhc2tcbiAgICB9O1xuXG4gICAgYXN5bmMud2F0ZXJmYWxsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIV9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IHRvIHdhdGVyZmFsbCBtdXN0IGJlIGFuIGFycmF5IG9mIGZ1bmN0aW9ucycpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgd3JhcEl0ZXJhdG9yID0gZnVuY3Rpb24gKGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2god3JhcEl0ZXJhdG9yKG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICB3cmFwSXRlcmF0b3IoYXN5bmMuaXRlcmF0b3IodGFza3MpKSgpO1xuICAgIH07XG5cbiAgICB2YXIgX3BhcmFsbGVsID0gZnVuY3Rpb24oZWFjaGZuLCB0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKF9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgICAgZWFjaGZuLm1hcCh0YXNrcywgZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBlcnIsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgZWFjaGZuLmVhY2goX2tleXModGFza3MpLCBmdW5jdGlvbiAoaywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB0YXNrc1trXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbCA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKHsgbWFwOiBhc3luYy5tYXAsIGVhY2g6IGFzeW5jLmVhY2ggfSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMucGFyYWxsZWxMaW1pdCA9IGZ1bmN0aW9uKHRhc2tzLCBsaW1pdCwgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKHsgbWFwOiBfbWFwTGltaXQobGltaXQpLCBlYWNoOiBfZWFjaExpbWl0KGxpbWl0KSB9LCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXJpZXMgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmIChfaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgIGFzeW5jLm1hcFNlcmllcyh0YXNrcywgZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBlcnIsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhfa2V5cyh0YXNrcyksIGZ1bmN0aW9uIChrLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHRhc2tzW2tdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLml0ZXJhdG9yID0gZnVuY3Rpb24gKHRhc2tzKSB7XG4gICAgICAgIHZhciBtYWtlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzW2luZGV4XS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZm4ubmV4dCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZuLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpbmRleCA8IHRhc2tzLmxlbmd0aCAtIDEpID8gbWFrZUNhbGxiYWNrKGluZGV4ICsgMSk6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbWFrZUNhbGxiYWNrKDApO1xuICAgIH07XG5cbiAgICBhc3luYy5hcHBseSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkoXG4gICAgICAgICAgICAgICAgbnVsbCwgYXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBfY29uY2F0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHIgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNiKSB7XG4gICAgICAgICAgICBmbih4LCBmdW5jdGlvbiAoZXJyLCB5KSB7XG4gICAgICAgICAgICAgICAgciA9IHIuY29uY2F0KHkgfHwgW10pO1xuICAgICAgICAgICAgICAgIGNiKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5jb25jYXQgPSBkb1BhcmFsbGVsKF9jb25jYXQpO1xuICAgIGFzeW5jLmNvbmNhdFNlcmllcyA9IGRvU2VyaWVzKF9jb25jYXQpO1xuXG4gICAgYXN5bmMud2hpbHN0ID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXN5bmMud2hpbHN0KHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZG9XaGlsc3QgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGlmICh0ZXN0LmFwcGx5KG51bGwsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvVW50aWwgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGlmICghdGVzdC5hcHBseShudWxsLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvVW50aWwoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5xdWV1ZSA9IGZ1bmN0aW9uICh3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG4gICAgICAgIGlmIChjb25jdXJyZW5jeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwb3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKCFxLnN0YXJ0ZWQpe1xuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICBpZiAocS5kcmFpbikge1xuICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgICAgICAgICBxLnRhc2tzLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcS50YXNrcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHEuc2F0dXJhdGVkICYmIHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgcSA9IHtcbiAgICAgICAgICAgIHRhc2tzOiBbXSxcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5OiBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBzdGFydGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHBhdXNlZDogZmFsc2UsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtpbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcS5kcmFpbiA9IG51bGw7XG4gICAgICAgICAgICAgIHEudGFza3MgPSBbXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnNoaWZ0OiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJvY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghcS5wYXVzZWQgJiYgd29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhc2sgPSBxLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxLmVtcHR5ICYmIHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEuZHJhaW4gJiYgcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYiA9IG9ubHlfb25jZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKHRhc2suZGF0YSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlkbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBxLnRhc2tzLmxlbmd0aCArIHdvcmtlcnMgPT09IDA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAocS5wYXVzZWQgPT09IHRydWUpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBxLnByb2Nlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcbiAgICBcbiAgICBhc3luYy5wcmlvcml0eVF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9jb21wYXJlVGFza3MoYSwgYil7XG4gICAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX2JpbmFyeVNlYXJjaChzZXF1ZW5jZSwgaXRlbSwgY29tcGFyZSkge1xuICAgICAgICAgIHZhciBiZWcgPSAtMSxcbiAgICAgICAgICAgICAgZW5kID0gc2VxdWVuY2UubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoYmVnIDwgZW5kKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gYmVnICsgKChlbmQgLSBiZWcgKyAxKSA+Pj4gMSk7XG4gICAgICAgICAgICBpZiAoY29tcGFyZShpdGVtLCBzZXF1ZW5jZVttaWRdKSA+PSAwKSB7XG4gICAgICAgICAgICAgIGJlZyA9IG1pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGVuZCA9IG1pZCAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBiZWc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKCFxLnN0YXJ0ZWQpe1xuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICBpZiAocS5kcmFpbikge1xuICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoX2JpbmFyeVNlYXJjaChxLnRhc2tzLCBpdGVtLCBfY29tcGFyZVRhc2tzKSArIDEsIDAsIGl0ZW0pO1xuXG4gICAgICAgICAgICAgIGlmIChxLnNhdHVyYXRlZCAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gcS5jb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RhcnQgd2l0aCBhIG5vcm1hbCBxdWV1ZVxuICAgICAgICB2YXIgcSA9IGFzeW5jLnF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3kpO1xuICAgICAgICBcbiAgICAgICAgLy8gT3ZlcnJpZGUgcHVzaCB0byBhY2NlcHQgc2Vjb25kIHBhcmFtZXRlciByZXByZXNlbnRpbmcgcHJpb3JpdHlcbiAgICAgICAgcS5wdXNoID0gZnVuY3Rpb24gKGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSB1bnNoaWZ0IGZ1bmN0aW9uXG4gICAgICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICB2YXIgd29ya2luZyAgICAgPSBmYWxzZSxcbiAgICAgICAgICAgIHRhc2tzICAgICAgID0gW107XG5cbiAgICAgICAgdmFyIGNhcmdvID0ge1xuICAgICAgICAgICAgdGFza3M6IHRhc2tzLFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBkcmFpbmVkOiB0cnVlLFxuICAgICAgICAgICAgcHVzaDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhcmdvLmRyYWluZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmdvLnNhdHVyYXRlZCAmJiB0YXNrcy5sZW5ndGggPT09IHBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmdvLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGNhcmdvLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNhcmdvLmRyYWluICYmICFjYXJnby5kcmFpbmVkKSBjYXJnby5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICBjYXJnby5kcmFpbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0cyA9IHR5cGVvZiBwYXlsb2FkID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gdGFza3Muc3BsaWNlKDAsIHBheWxvYWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0YXNrcy5zcGxpY2UoMCwgdGFza3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIHZhciBkcyA9IF9tYXAodHMsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXNrLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjYXJnby5lbXB0eSkgY2FyZ28uZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB3b3JraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3b3JrZXIoZHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2luZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBfZWFjaCh0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FyZ287XG4gICAgfTtcblxuICAgIHZhciBfY29uc29sZV9mbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2VhY2goYXJncywgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlW25hbWVdKHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSkpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGtleSBpbiBtZW1vKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBtZW1vW2tleV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoa2V5IGluIHF1ZXVlcykge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0gPSBbY2FsbGJhY2tdO1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbW9ba2V5XSA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHEgPSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcVtpXS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH07XG5cbiAgICBhc3luYy51bm1lbW9pemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGFzeW5jLnRpbWVzID0gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudGVyLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzeW5jLm1hcChjb3VudGVyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy50aW1lc1NlcmllcyA9IGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjb3VudGVyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgY291bnRlci5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3luYy5tYXBTZXJpZXMoY291bnRlciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VxID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gYXJndW1lbnRzO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9XSkpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY29tcG9zZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbnMuLi4gKi8pIHtcbiAgICAgIHJldHVybiBhc3luYy5zZXEuYXBwbHkobnVsbCwgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9O1xuXG4gICAgdmFyIF9hcHBseUVhY2ggPSBmdW5jdGlvbiAoZWFjaGZuLCBmbnMgLyphcmdzLi4uKi8pIHtcbiAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLmFwcGx5RWFjaCA9IGRvUGFyYWxsZWwoX2FwcGx5RWFjaCk7XG4gICAgYXN5bmMuYXBwbHlFYWNoU2VyaWVzID0gZG9TZXJpZXMoX2FwcGx5RWFjaCk7XG5cbiAgICBhc3luYy5mb3JldmVyID0gZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4obmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICAvLyBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXN5bmM7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlZCBkaXJlY3RseSB2aWEgPHNjcmlwdD4gdGFnXG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBhc3luYztcbiAgICB9XG5cbn0oKSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFJlcHJlc2VudGF0aW9uIG9mIGEgc2luZ2xlIEV2ZW50RW1pdHRlciBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBFdmVudCBoYW5kbGVyIHRvIGJlIGNhbGxlZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgQ29udGV4dCBmb3IgZnVuY3Rpb24gZXhlY3V0aW9uLlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgZW1pdCBvbmNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgRXZlbnRFbWl0dGVyIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkgeyAvKiBOb3RoaW5nIHRvIHNldCAqLyB9XG5cbi8qKlxuICogSG9sZHMgdGhlIGFzc2lnbmVkIEV2ZW50RW1pdHRlcnMgYnkgbmFtZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHVybiBhIGxpc3Qgb2YgYXNzaWduZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnRzIHRoYXQgc2hvdWxkIGJlIGxpc3RlZC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXhpc3RzIFdlIG9ubHkgbmVlZCB0byBrbm93IGlmIHRoZXJlIGFyZSBsaXN0ZW5lcnMuXG4gKiBAcmV0dXJucyB7QXJyYXl8Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50LCBleGlzdHMpIHtcbiAgdmFyIHByZWZpeCA9ICd+JysgZXZlbnRcbiAgICAsIGF2YWlsYWJsZSA9IHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbcHJlZml4XTtcblxuICBpZiAoZXhpc3RzKSByZXR1cm4gISFhdmFpbGFibGU7XG4gIGlmICghYXZhaWxhYmxlKSByZXR1cm4gW107XG4gIGlmICh0aGlzLl9ldmVudHNbcHJlZml4XS5mbikgcmV0dXJuIFt0aGlzLl9ldmVudHNbcHJlZml4XS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9ldmVudHNbcHJlZml4XS5sZW5ndGgsIGVlID0gbmV3IEFycmF5KGwpOyBpIDwgbDsgaSsrKSB7XG4gICAgZWVbaV0gPSB0aGlzLl9ldmVudHNbcHJlZml4XVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBJbmRpY2F0aW9uIGlmIHdlJ3ZlIGVtaXR0ZWQgYW4gZXZlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgdmFyIHByZWZpeCA9ICd+JysgZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1twcmVmaXhdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1twcmVmaXhdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnMuZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgICBjYXNlIDE6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0KTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMik7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICghYXJncykgZm9yIChqID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbmV3IEV2ZW50TGlzdGVuZXIgZm9yIHRoZSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0b259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIHZhciBsaXN0ZW5lciA9IG5ldyBFRShmbiwgY29udGV4dCB8fCB0aGlzKVxuICAgICwgcHJlZml4ID0gJ34nKyBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIGlmICghdGhpcy5fZXZlbnRzW3ByZWZpeF0pIHRoaXMuX2V2ZW50c1twcmVmaXhdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW3ByZWZpeF0uZm4pIHRoaXMuX2V2ZW50c1twcmVmaXhdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW3ByZWZpeF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbcHJlZml4XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFdmVudExpc3RlbmVyIHRoYXQncyBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcywgdHJ1ZSlcbiAgICAsIHByZWZpeCA9ICd+JysgZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICBpZiAoIXRoaXMuX2V2ZW50c1twcmVmaXhdKSB0aGlzLl9ldmVudHNbcHJlZml4XSA9IGxpc3RlbmVyO1xuICBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1twcmVmaXhdLmZuKSB0aGlzLl9ldmVudHNbcHJlZml4XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1twcmVmaXhdID0gW1xuICAgICAgdGhpcy5fZXZlbnRzW3ByZWZpeF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2Ugd2FudCB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgdGhhdCB3ZSBuZWVkIHRvIGZpbmQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IE9ubHkgcmVtb3ZlIGxpc3RlbmVycyBtYXRjaGluZyB0aGlzIGNvbnRleHQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9uY2UgT25seSByZW1vdmUgb25jZSBsaXN0ZW5lcnMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHZhciBwcmVmaXggPSAnficrIGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbcHJlZml4XSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1twcmVmaXhdXG4gICAgLCBldmVudHMgPSBbXTtcblxuICBpZiAoZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLmZuKSB7XG4gICAgICBpZiAoXG4gICAgICAgICAgIGxpc3RlbmVycy5mbiAhPT0gZm5cbiAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVycy5vbmNlKVxuICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnMuY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICkge1xuICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4gIT09IGZuXG4gICAgICAgICAgfHwgKG9uY2UgJiYgIWxpc3RlbmVyc1tpXS5vbmNlKVxuICAgICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVyc1tpXS5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgICApIHtcbiAgICAgICAgICBldmVudHMucHVzaChsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAvL1xuICBpZiAoZXZlbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2V2ZW50c1twcmVmaXhdID0gZXZlbnRzLmxlbmd0aCA9PT0gMSA/IGV2ZW50c1swXSA6IGV2ZW50cztcbiAgfSBlbHNlIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3ByZWZpeF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgb3Igb25seSB0aGUgbGlzdGVuZXJzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2FudCB0byByZW1vdmUgYWxsIGxpc3RlbmVycyBmb3IuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG5cbiAgaWYgKGV2ZW50KSBkZWxldGUgdGhpcy5fZXZlbnRzWyd+JysgZXZlbnRdO1xuICBlbHNlIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4iLCJ2YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpLFxuICAgIFJlc291cmNlID0gcmVxdWlyZSgnLi9SZXNvdXJjZScpLFxuICAgIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBzdGF0ZSBhbmQgbG9hZGluZyBvZiBtdWx0aXBsZSByZXNvdXJjZXMgdG8gbG9hZC5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSBbYmFzZVVybD0nJ10ge3N0cmluZ30gVGhlIGJhc2UgdXJsIGZvciBhbGwgcmVzb3VyY2VzIGxvYWRlZCBieSB0aGlzIGxvYWRlci5cbiAqIEBwYXJhbSBbY29uY3VycmVuY3k9MTBdIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgcmVzb3VyY2VzIHRvIGxvYWQgY29uY3VycmVudGx5LlxuICovXG5mdW5jdGlvbiBMb2FkZXIoYmFzZVVybCwgY29uY3VycmVuY3kpIHtcbiAgICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAgIGNvbmN1cnJlbmN5ID0gY29uY3VycmVuY3kgfHwgMTA7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSB1cmwgZm9yIGFsbCByZXNvdXJjZXMgbG9hZGVkIGJ5IHRoaXMgbG9hZGVyLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7c3RyaW5nfVxuICAgICAqL1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmwgfHwgJyc7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcHJvZ3Jlc3MgcGVyY2VudCBvZiB0aGUgbG9hZGVyIGdvaW5nIHRocm91Z2ggdGhlIHF1ZXVlLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xuXG4gICAgLyoqXG4gICAgICogTG9hZGluZyBzdGF0ZSBvZiB0aGUgbG9hZGVyLCB0cnVlIGlmIGl0IGlzIGN1cnJlbnRseSBsb2FkaW5nIHJlc291cmNlcy5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGVyY2VudGFnZSBvZiB0b3RhbCBwcm9ncmVzcyB0aGF0IGEgc2luZ2xlIHJlc291cmNlIHJlcHJlc2VudHMuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5fcHJvZ3Jlc3NDaHVuayA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWlkZGxld2FyZSB0byBydW4gYmVmb3JlIGxvYWRpbmcgZWFjaCByZXNvdXJjZS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Z1bmN0aW9uW119XG4gICAgICovXG4gICAgdGhpcy5fYmVmb3JlTWlkZGxld2FyZSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG1pZGRsZXdhcmUgdG8gcnVuIGFmdGVyIGxvYWRpbmcgZWFjaCByZXNvdXJjZS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Z1bmN0aW9uW119XG4gICAgICovXG4gICAgdGhpcy5fYWZ0ZXJNaWRkbGV3YXJlID0gW107XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYF9sb2FkUmVzb3VyY2VgIGZ1bmN0aW9uIGJvdW5kIHdpdGggdGhpcyBvYmplY3QgY29udGV4dC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1lbWJlciB7ZnVuY3Rpb259XG4gICAgICovXG4gICAgdGhpcy5fYm91bmRMb2FkUmVzb3VyY2UgPSB0aGlzLl9sb2FkUmVzb3VyY2UuYmluZCh0aGlzKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgX29uTG9hZGAgZnVuY3Rpb24gYm91bmQgd2l0aCB0aGlzIG9iamVjdCBjb250ZXh0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWVtYmVyIHtmdW5jdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLl9ib3VuZE9uTG9hZCA9IHRoaXMuX29uTG9hZC5iaW5kKHRoaXMpO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHJlc291cmNlIGJ1ZmZlciB0aGF0IGZpbGxzIHVudGlsIGBsb2FkYCBpcyBjYWxsZWQgdG8gc3RhcnQgbG9hZGluZyByZXNvdXJjZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZW1iZXIge1Jlc291cmNlW119XG4gICAgICovXG4gICAgdGhpcy5fYnVmZmVyID0gW107XG5cbiAgICAvKipcbiAgICAgKiBVc2VkIHRvIHRyYWNrIGxvYWQgY29tcGxldGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1lbWJlciB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuX251bVRvTG9hZCA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcmVzb3VyY2VzIHdhaXRpbmcgdG8gYmUgbG9hZGVkLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWVtYmVyIHtSZXNvdXJjZVtdfVxuICAgICAqL1xuICAgIHRoaXMuX3F1ZXVlID0gYXN5bmMucXVldWUodGhpcy5fYm91bmRMb2FkUmVzb3VyY2UsIGNvbmN1cnJlbmN5KTtcblxuICAgIC8qKlxuICAgICAqIEFsbCB0aGUgcmVzb3VyY2VzIGZvciB0aGlzIGxvYWRlciBrZXllZCBieSBuYW1lLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7b2JqZWN0PHN0cmluZywgUmVzb3VyY2U+fVxuICAgICAqL1xuICAgIHRoaXMucmVzb3VyY2VzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBFbWl0dGVkIG9uY2UgcGVyIGxvYWRlZCBvciBlcnJvcmVkIHJlc291cmNlLlxuICAgICAqXG4gICAgICogQGV2ZW50IHByb2dyZXNzXG4gICAgICogQG1lbWJlcm9mIExvYWRlciNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEVtaXR0ZWQgb25jZSBwZXIgZXJyb3JlZCByZXNvdXJjZS5cbiAgICAgKlxuICAgICAqIEBldmVudCBlcnJvclxuICAgICAqIEBtZW1iZXJvZiBMb2FkZXIjXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBFbWl0dGVkIG9uY2UgcGVyIGxvYWRlZCByZXNvdXJjZS5cbiAgICAgKlxuICAgICAqIEBldmVudCBsb2FkXG4gICAgICogQG1lbWJlcm9mIExvYWRlciNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEVtaXR0ZWQgd2hlbiB0aGUgbG9hZGVyIGJlZ2lucyB0byBwcm9jZXNzIHRoZSBxdWV1ZS5cbiAgICAgKlxuICAgICAqIEBldmVudCBzdGFydFxuICAgICAqIEBtZW1iZXJvZiBMb2FkZXIjXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBFbWl0dGVkIHdoZW4gdGhlIHF1ZXVlZCByZXNvdXJjZXMgYWxsIGxvYWQuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgY29tcGxldGVcbiAgICAgKiBAbWVtYmVyb2YgTG9hZGVyI1xuICAgICAqL1xufVxuXG5Mb2FkZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcbkxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBMb2FkZXI7XG5tb2R1bGUuZXhwb3J0cyA9IExvYWRlcjtcblxuLyoqXG4gKiBBZGRzIGEgcmVzb3VyY2UgKG9yIG11bHRpcGxlIHJlc291cmNlcykgdG8gdGhlIGxvYWRlciBxdWV1ZS5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGNhbiB0YWtlIGEgd2lkZSB2YXJpZXR5IG9mIGRpZmZlcmVudCBwYXJhbWV0ZXJzLiBUaGUgb25seSB0aGluZyB0aGF0IGlzIGFsd2F5c1xuICogcmVxdWlyZWQgdGhlIHVybCB0byBsb2FkLiBBbGwgdGhlIGZvbGxvd2luZyB3aWxsIHdvcms6XG4gKlxuICogYGBganNcbiAqIGxvYWRlclxuICogICAgIC8vIG5vcm1hbCBwYXJhbSBzeW50YXhcbiAqICAgICAuYWRkKCdrZXknLCAnaHR0cDovLy4uLicsIGZ1bmN0aW9uICgpIHt9KVxuICogICAgIC5hZGQoJ2h0dHA6Ly8uLi4nLCBmdW5jdGlvbiAoKSB7fSlcbiAqICAgICAuYWRkKCdodHRwOi8vLi4uJylcbiAqXG4gKiAgICAgLy8gb2JqZWN0IHN5bnRheFxuICogICAgIC5hZGQoe1xuICogICAgICAgICBuYW1lOiAna2V5MicsXG4gKiAgICAgICAgIHVybDogJ2h0dHA6Ly8uLi4nXG4gKiAgICAgfSwgZnVuY3Rpb24gKCkge30pXG4gKiAgICAgLmFkZCh7XG4gKiAgICAgICAgIHVybDogJ2h0dHA6Ly8uLi4nXG4gKiAgICAgfSwgZnVuY3Rpb24gKCkge30pXG4gKiAgICAgLmFkZCh7XG4gKiAgICAgICAgIG5hbWU6ICdrZXkzJyxcbiAqICAgICAgICAgdXJsOiAnaHR0cDovLy4uLidcbiAqICAgICAgICAgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge31cbiAqICAgICB9KVxuICogICAgIC5hZGQoe1xuICogICAgICAgICB1cmw6ICdodHRwczovLy4uLicsXG4gKiAgICAgICAgIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHt9LFxuICogICAgICAgICBjcm9zc09yaWdpbjogdHJ1ZVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIHlvdSBjYW4gYWxzbyBwYXNzIGFuIGFycmF5IG9mIG9iamVjdHMgb3IgdXJscyBvciBib3RoXG4gKiAgICAgLmFkZChbXG4gKiAgICAgICAgIHsgbmFtZTogJ2tleTQnLCB1cmw6ICdodHRwOi8vLi4uJywgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge30gfSxcbiAqICAgICAgICAgeyB1cmw6ICdodHRwOi8vLi4uJywgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge30gfSxcbiAqICAgICAgICAgJ2h0dHA6Ly8uLi4nXG4gKiAgICAgXSk7XG4gKiBgYGBcbiAqXG4gKiBAYWxpYXMgZW5xdWV1ZVxuICogQHBhcmFtIFtuYW1lXSB7c3RyaW5nfSBUaGUgbmFtZSBvZiB0aGUgcmVzb3VyY2UgdG8gbG9hZCwgaWYgbm90IHBhc3NlZCB0aGUgdXJsIGlzIHVzZWQuXG4gKiBAcGFyYW0gdXJsIHtzdHJpbmd9IFRoZSB1cmwgZm9yIHRoaXMgcmVzb3VyY2UsIHJlbGF0aXZlIHRvIHRoZSBiYXNlVXJsIG9mIHRoaXMgbG9hZGVyLlxuICogQHBhcmFtIFtvcHRpb25zXSB7b2JqZWN0fSBUaGUgb3B0aW9ucyBmb3IgdGhlIGxvYWQuXG4gKiBAcGFyYW0gW29wdGlvbnMuY3Jvc3NPcmlnaW5dIHtib29sZWFufSBJcyB0aGlzIHJlcXVlc3QgY3Jvc3Mtb3JpZ2luPyBEZWZhdWx0IGlzIHRvIGRldGVybWluZSBhdXRvbWF0aWNhbGx5LlxuICogQHBhcmFtIFtvcHRpb25zLmxvYWRUeXBlPVJlc291cmNlLkxPQURfVFlQRS5YSFJdIHtSZXNvdXJjZS5YSFJfTE9BRF9UWVBFfSBIb3cgc2hvdWxkIHRoaXMgcmVzb3VyY2UgYmUgbG9hZGVkP1xuICogQHBhcmFtIFtvcHRpb25zLnhoclR5cGU9UmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuREVGQVVMVF0ge1Jlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFfSBIb3cgc2hvdWxkIHRoZSBkYXRhIGJlaW5nXG4gKiAgICAgIGxvYWRlZCBiZSBpbnRlcnByZXRlZCB3aGVuIHVzaW5nIFhIUj9cbiAqIEBwYXJhbSBbY2FsbGJhY2tdIHtmdW5jdGlvbn0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoaXMgc3BlY2lmaWMgcmVzb3VyY2UgY29tcGxldGVzIGxvYWRpbmcuXG4gKiBAcmV0dXJuIHtMb2FkZXJ9XG4gKi9cbkxvYWRlci5wcm90b3R5cGUuYWRkID0gTG9hZGVyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24gKG5hbWUsIHVybCwgb3B0aW9ucywgY2IpIHtcbiAgICAvLyBzcGVjaWFsIGNhc2Ugb2YgYW4gYXJyYXkgb2Ygb2JqZWN0cyBvciB1cmxzXG4gICAgaWYgKEFycmF5LmlzQXJyYXkobmFtZSkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChuYW1lW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIGlmIGFuIG9iamVjdCBpcyBwYXNzZWQgaW5zdGVhZCBvZiBwYXJhbXNcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNiID0gdXJsIHx8IG5hbWUuY2FsbGJhY2sgfHwgbmFtZS5vbkNvbXBsZXRlO1xuICAgICAgICBvcHRpb25zID0gbmFtZTtcbiAgICAgICAgdXJsID0gbmFtZS51cmw7XG4gICAgICAgIG5hbWUgPSBuYW1lLm5hbWUgfHwgbmFtZS5rZXkgfHwgbmFtZS51cmw7XG4gICAgfVxuXG4gICAgLy8gY2FzZSB3aGVyZSBubyBuYW1lIGlzIHBhc3NlZCBzaGlmdCBhbGwgYXJncyBvdmVyIGJ5IG9uZS5cbiAgICBpZiAodHlwZW9mIHVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgY2IgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0gdXJsO1xuICAgICAgICB1cmwgPSBuYW1lO1xuICAgIH1cblxuICAgIC8vIG5vdyB0aGF0IHdlIHNoaWZ0ZWQgbWFrZSBzdXJlIHdlIGhhdmUgYSBwcm9wZXIgdXJsLlxuICAgIGlmICh0eXBlb2YgdXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHVybCBwYXNzZWQgdG8gYWRkIHJlc291cmNlIHRvIGxvYWRlci4nKTtcbiAgICB9XG5cbiAgICAvLyBvcHRpb25zIGFyZSBvcHRpb25hbCBzbyBwZW9wbGUgbWlnaHQgcGFzcyBhIGZ1bmN0aW9uIGFuZCBubyBvcHRpb25zXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNiID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgcmVzb3VyY2UgYWxyZWFkeSBleGlzdHMuXG4gICAgaWYgKHRoaXMucmVzb3VyY2VzW25hbWVdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb3VyY2Ugd2l0aCBuYW1lIFwiJyArIG5hbWUgKyAnXCIgYWxyZWFkeSBleGlzdHMuJyk7XG4gICAgfVxuXG4gICAgLy8gYWRkIGJhc2UgdXJsIGlmIHRoaXMgaXNuJ3QgYSBkYXRhIHVybFxuICAgIGlmICh1cmwuaW5kZXhPZignZGF0YTonKSAhPT0gMCkge1xuICAgICAgICB1cmwgPSB0aGlzLmJhc2VVcmwgKyB1cmw7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIHRoZSBzdG9yZSB0aGUgcmVzb3VyY2VcbiAgICB0aGlzLnJlc291cmNlc1tuYW1lXSA9IG5ldyBSZXNvdXJjZShuYW1lLCB1cmwsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnJlc291cmNlc1tuYW1lXS5vbmNlKCdhZnRlck1pZGRsZXdhcmUnLCBjYik7XG4gICAgfVxuXG4gICAgdGhpcy5fbnVtVG9Mb2FkKys7XG5cbiAgICAvLyBpZiBhbHJlYWR5IGxvYWRpbmcgYWRkIGl0IHRvIHRoZSB3b3JrZXIgcXVldWVcbiAgICBpZiAodGhpcy5fcXVldWUuc3RhcnRlZCkge1xuICAgICAgICB0aGlzLl9xdWV1ZS5wdXNoKHRoaXMucmVzb3VyY2VzW25hbWVdKTtcbiAgICAgICAgdGhpcy5fcHJvZ3Jlc3NDaHVuayA9ICgxMDAgLSB0aGlzLnByb2dyZXNzKSAvICh0aGlzLl9xdWV1ZS5sZW5ndGgoKSArIHRoaXMuX3F1ZXVlLnJ1bm5pbmcoKSk7XG4gICAgfVxuICAgIC8vIG90aGVyd2lzZSBidWZmZXIgaXQgdG8gYmUgYWRkZWQgdG8gdGhlIHF1ZXVlIGxhdGVyXG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2J1ZmZlci5wdXNoKHRoaXMucmVzb3VyY2VzW25hbWVdKTtcbiAgICAgICAgdGhpcy5fcHJvZ3Jlc3NDaHVuayA9IDEwMCAvIHRoaXMuX2J1ZmZlci5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU2V0cyB1cCBhIG1pZGRsZXdhcmUgZnVuY3Rpb24gdGhhdCB3aWxsIHJ1biAqYmVmb3JlKiB0aGVcbiAqIHJlc291cmNlIGlzIGxvYWRlZC5cbiAqXG4gKiBAYWxpYXMgcHJlXG4gKiBAcGFyYW0gbWlkZGxld2FyZSB7ZnVuY3Rpb259IFRoZSBtaWRkbGV3YXJlIGZ1bmN0aW9uIHRvIHJlZ2lzdGVyLlxuICogQHJldHVybiB7TG9hZGVyfVxuICovXG5Mb2FkZXIucHJvdG90eXBlLmJlZm9yZSA9IExvYWRlci5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdGhpcy5fYmVmb3JlTWlkZGxld2FyZS5wdXNoKGZuKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHVwIGEgbWlkZGxld2FyZSBmdW5jdGlvbiB0aGF0IHdpbGwgcnVuICphZnRlciogdGhlXG4gKiByZXNvdXJjZSBpcyBsb2FkZWQuXG4gKlxuICogQGFsaWFzIHVzZVxuICogQHBhcmFtIG1pZGRsZXdhcmUge2Z1bmN0aW9ufSBUaGUgbWlkZGxld2FyZSBmdW5jdGlvbiB0byByZWdpc3Rlci5cbiAqIEByZXR1cm4ge0xvYWRlcn1cbiAqL1xuTG9hZGVyLnByb3RvdHlwZS5hZnRlciA9IExvYWRlci5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdGhpcy5fYWZ0ZXJNaWRkbGV3YXJlLnB1c2goZm4pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgcXVldWUgb2YgdGhlIGxvYWRlciB0byBwcmVwYXJlIGZvciBhIG5ldyBsb2FkLlxuICpcbiAqIEByZXR1cm4ge0xvYWRlcn1cbiAqL1xuTG9hZGVyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9idWZmZXIubGVuZ3RoID0gMDtcblxuICAgIHRoaXMuX3F1ZXVlLmtpbGwoKTtcbiAgICB0aGlzLl9xdWV1ZS5zdGFydGVkID0gZmFsc2U7XG5cbiAgICB0aGlzLnByb2dyZXNzID0gMDtcbiAgICB0aGlzLl9wcm9ncmVzc0NodW5rID0gMDtcbiAgICB0aGlzLmxvYWRpbmcgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogU3RhcnRzIGxvYWRpbmcgdGhlIHF1ZXVlZCByZXNvdXJjZXMuXG4gKlxuICogQGZpcmVzIHN0YXJ0XG4gKiBAcGFyYW0gW2NhbGxiYWNrXSB7ZnVuY3Rpb259IE9wdGlvbmFsIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBib3VuZCB0byB0aGUgYGNvbXBsZXRlYCBldmVudC5cbiAqIEByZXR1cm4ge0xvYWRlcn1cbiAqL1xuTG9hZGVyLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgLy8gcmVnaXN0ZXIgY29tcGxldGUgY2FsbGJhY2sgaWYgdGhleSBwYXNzIG9uZVxuICAgIGlmICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5vbmNlKCdjb21wbGV0ZScsIGNiKTtcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgcXVldWUgaGFzIGFscmVhZHkgc3RhcnRlZCB3ZSBhcmUgZG9uZSBoZXJlXG4gICAgaWYgKHRoaXMuX3F1ZXVlLnN0YXJ0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gbm90aWZ5IG9mIHN0YXJ0XG4gICAgdGhpcy5lbWl0KCdzdGFydCcsIHRoaXMpO1xuXG4gICAgLy8gc3RhcnQgdGhlIGludGVybmFsIHF1ZXVlXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9idWZmZXIubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdGhpcy5fcXVldWUucHVzaCh0aGlzLl9idWZmZXJbaV0pO1xuICAgIH1cblxuICAgIC8vIGVtcHR5IHRoZSBidWZmZXJcbiAgICB0aGlzLl9idWZmZXIubGVuZ3RoID0gMDtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBMb2FkcyBhIHNpbmdsZSByZXNvdXJjZS5cbiAqXG4gKiBAZmlyZXMgcHJvZ3Jlc3NcbiAqIEBwcml2YXRlXG4gKi9cbkxvYWRlci5wcm90b3R5cGUuX2xvYWRSZXNvdXJjZSA9IGZ1bmN0aW9uIChyZXNvdXJjZSwgZGVxdWV1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHJlc291cmNlLl9kZXF1ZXVlID0gZGVxdWV1ZTtcblxuICAgIHRoaXMuX3J1bk1pZGRsZXdhcmUocmVzb3VyY2UsIHRoaXMuX2JlZm9yZU1pZGRsZXdhcmUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gcmVzb3VyY2Uub24oJ3Byb2dyZXNzJywgc2VsZi5lbWl0LmJpbmQoc2VsZiwgJ3Byb2dyZXNzJykpO1xuXG4gICAgICAgIHJlc291cmNlLmxvYWQoc2VsZi5fYm91bmRPbkxvYWQpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgb25jZSBlYWNoIHJlc291cmNlIGhhcyBsb2FkZWQuXG4gKlxuICogQGZpcmVzIGNvbXBsZXRlXG4gKiBAcHJpdmF0ZVxuICovXG5Mb2FkZXIucHJvdG90eXBlLl9vbkNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW1pdCgnY29tcGxldGUnLCB0aGlzLCB0aGlzLnJlc291cmNlcyk7XG59O1xuXG4vKipcbiAqIENhbGxlZCBlYWNoIHRpbWUgYSByZXNvdXJjZXMgaXMgbG9hZGVkLlxuICpcbiAqIEBmaXJlcyBwcm9ncmVzc1xuICogQGZpcmVzIGVycm9yXG4gKiBAZmlyZXMgbG9hZFxuICogQHByaXZhdGVcbiAqL1xuTG9hZGVyLnByb3RvdHlwZS5fb25Mb2FkID0gZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgdGhpcy5wcm9ncmVzcyArPSB0aGlzLl9wcm9ncmVzc0NodW5rO1xuXG4gICAgdGhpcy5lbWl0KCdwcm9ncmVzcycsIHRoaXMsIHJlc291cmNlKTtcblxuICAgIGlmIChyZXNvdXJjZS5lcnJvcikge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgcmVzb3VyY2UuZXJyb3IsIHRoaXMsIHJlc291cmNlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9hZCcsIHRoaXMsIHJlc291cmNlKTtcbiAgICB9XG5cbiAgICAvLyBydW4gbWlkZGxld2FyZSwgdGhpcyAqbXVzdCogaGFwcGVuIGJlZm9yZSBkZXF1ZXVlIHNvIHN1Yi1hc3NldHMgZ2V0IGFkZGVkIHByb3Blcmx5XG4gICAgdGhpcy5fcnVuTWlkZGxld2FyZShyZXNvdXJjZSwgdGhpcy5fYWZ0ZXJNaWRkbGV3YXJlLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc291cmNlLmVtaXQoJ2FmdGVyTWlkZGxld2FyZScsIHJlc291cmNlKTtcblxuICAgICAgICB0aGlzLl9udW1Ub0xvYWQtLTtcblxuICAgICAgICAvLyBkbyBjb21wbGV0aW9uIGNoZWNrXG4gICAgICAgIGlmICh0aGlzLl9udW1Ub0xvYWQgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX29uQ29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoaXMgcmVzb3VyY2UgZnJvbSB0aGUgYXN5bmMgcXVldWVcbiAgICByZXNvdXJjZS5fZGVxdWV1ZSgpO1xufTtcblxuLyoqXG4gKiBSdW4gbWlkZGxld2FyZSBmdW5jdGlvbnMgb24gYSByZXNvdXJjZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5Mb2FkZXIucHJvdG90eXBlLl9ydW5NaWRkbGV3YXJlID0gZnVuY3Rpb24gKHJlc291cmNlLCBmbnMsIGNiKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgYXN5bmMuZWFjaFNlcmllcyhmbnMsIGZ1bmN0aW9uIChmbiwgbmV4dCkge1xuICAgICAgICBmbi5jYWxsKHNlbGYsIHJlc291cmNlLCBuZXh0KTtcbiAgICB9LCBjYi5iaW5kKHRoaXMsIHJlc291cmNlKSk7XG59O1xuXG5Mb2FkZXIuTE9BRF9UWVBFID0gUmVzb3VyY2UuTE9BRF9UWVBFO1xuTG9hZGVyLlhIUl9SRUFEWV9TVEFURSA9IFJlc291cmNlLlhIUl9SRUFEWV9TVEFURTtcbkxvYWRlci5YSFJfUkVTUE9OU0VfVFlQRSA9IFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFO1xuIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKSxcbiAgICAvLyB0ZXN0cyBpcyBDT1JTIGlzIHN1cHBvcnRlZCBpbiBYSFIsIGlmIG5vdCB3ZSBuZWVkIHRvIHVzZSBYRFJcbiAgICB1c2VYZHIgPSAhISh3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiAobmV3IFhNTEh0dHBSZXF1ZXN0KCkpKSk7XG5cbi8qKlxuICogTWFuYWdlcyB0aGUgc3RhdGUgYW5kIGxvYWRpbmcgb2YgYSBzaW5nbGUgcmVzb3VyY2UgcmVwcmVzZW50ZWQgYnlcbiAqIGEgc2luZ2xlIFVSTC5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSBuYW1lIHtzdHJpbmd9IFRoZSBuYW1lIG9mIHRoZSByZXNvdXJjZSB0byBsb2FkLlxuICogQHBhcmFtIHVybCB7c3RyaW5nfHN0cmluZ1tdfSBUaGUgdXJsIGZvciB0aGlzIHJlc291cmNlLCBmb3IgYXVkaW8vdmlkZW8gbG9hZHMgeW91IGNhbiBwYXNzIGFuIGFycmF5IG9mIHNvdXJjZXMuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHtvYmplY3R9IFRoZSBvcHRpb25zIGZvciB0aGUgbG9hZC5cbiAqIEBwYXJhbSBbb3B0aW9ucy5jcm9zc09yaWdpbl0ge2Jvb2xlYW59IElzIHRoaXMgcmVxdWVzdCBjcm9zcy1vcmlnaW4/IERlZmF1bHQgaXMgdG8gZGV0ZXJtaW5lIGF1dG9tYXRpY2FsbHkuXG4gKiBAcGFyYW0gW29wdGlvbnMubG9hZFR5cGU9UmVzb3VyY2UuTE9BRF9UWVBFLlhIUl0ge1Jlc291cmNlLkxPQURfVFlQRX0gSG93IHNob3VsZCB0aGlzIHJlc291cmNlIGJlIGxvYWRlZD9cbiAqIEBwYXJhbSBbb3B0aW9ucy54aHJUeXBlPVJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLkRFRkFVTFRdIHtSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRX0gSG93IHNob3VsZCB0aGUgZGF0YSBiZWluZ1xuICogICAgICBsb2FkZWQgYmUgaW50ZXJwcmV0ZWQgd2hlbiB1c2luZyBYSFI/XG4gKi9cbmZ1bmN0aW9uIFJlc291cmNlKG5hbWUsIHVybCwgb3B0aW9ucykge1xuICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQm90aCBuYW1lIGFuZCB1cmwgYXJlIHJlcXVpcmVkIGZvciBjb25zdHJ1Y3RpbmcgYSByZXNvdXJjZS4nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGlzIHJlc291cmNlLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7c3RyaW5nfVxuICAgICAqIEByZWFkb25seVxuICAgICAqL1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgdXJsIHVzZWQgdG8gbG9hZCB0aGlzIHJlc291cmNlLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7c3RyaW5nfVxuICAgICAqIEByZWFkb25seVxuICAgICAqL1xuICAgIHRoaXMudXJsID0gdXJsO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGRhdGEgdGhhdCB3YXMgbG9hZGVkIGJ5IHRoZSByZXNvdXJjZS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2FueX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogSXMgdGhpcyByZXF1ZXN0IGNyb3NzLW9yaWdpbj8gSWYgdW5zZXQsIGRldGVybWluZWQgYXV0b21hdGljYWxseS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLmNyb3NzT3JpZ2luID0gb3B0aW9ucy5jcm9zc09yaWdpbjtcblxuICAgIC8qKlxuICAgICAqIFRoZSBtZXRob2Qgb2YgbG9hZGluZyB0byB1c2UgZm9yIHRoaXMgcmVzb3VyY2UuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyIHtSZXNvdXJjZS5MT0FEX1RZUEV9XG4gICAgICovXG4gICAgdGhpcy5sb2FkVHlwZSA9IG9wdGlvbnMubG9hZFR5cGUgfHwgdGhpcy5fZGV0ZXJtaW5lTG9hZFR5cGUoKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSB0eXBlIHVzZWQgdG8gbG9hZCB0aGUgcmVzb3VyY2UgdmlhIFhIUi4gSWYgdW5zZXQsIGRldGVybWluZWQgYXV0b21hdGljYWxseS5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLnhoclR5cGUgPSBvcHRpb25zLnhoclR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZCB3aGlsZSBsb2FkaW5nIChpZiBhbnkpLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7RXJyb3J9XG4gICAgICogQHJlYWRvbmx5XG4gICAgICovXG4gICAgdGhpcy5lcnJvciA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgWEhSIG9iamVjdCB0aGF0IHdhcyB1c2VkIHRvIGxvYWQgdGhpcyByZXNvdXJjZS4gVGhpcyBpcyBvbmx5IHNldFxuICAgICAqIHdoZW4gYGxvYWRUeXBlYCBpcyBgUmVzb3VyY2UuTE9BRF9UWVBFLlhIUmAuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyIHtYTUxIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB0aGlzLnhociA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmliZXMgaWYgdGhpcyByZXNvdXJjZSB3YXMgbG9hZGVkIGFzIGpzb24uIE9ubHkgdmFsaWQgYWZ0ZXIgdGhlIHJlc291cmNlXG4gICAgICogaGFzIGNvbXBsZXRlbHkgbG9hZGVkLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmlzSnNvbiA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpYmVzIGlmIHRoaXMgcmVzb3VyY2Ugd2FzIGxvYWRlZCBhcyB4bWwuIE9ubHkgdmFsaWQgYWZ0ZXIgdGhlIHJlc291cmNlXG4gICAgICogaGFzIGNvbXBsZXRlbHkgbG9hZGVkLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmlzWG1sID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmliZXMgaWYgdGhpcyByZXNvdXJjZSB3YXMgbG9hZGVkIGFzIGFuIGltYWdlIHRhZy4gT25seSB2YWxpZCBhZnRlciB0aGUgcmVzb3VyY2VcbiAgICAgKiBoYXMgY29tcGxldGVseSBsb2FkZWQuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMuaXNJbWFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpYmVzIGlmIHRoaXMgcmVzb3VyY2Ugd2FzIGxvYWRlZCBhcyBhbiBhdWRpbyB0YWcuIE9ubHkgdmFsaWQgYWZ0ZXIgdGhlIHJlc291cmNlXG4gICAgICogaGFzIGNvbXBsZXRlbHkgbG9hZGVkLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmlzQXVkaW8gPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaWJlcyBpZiB0aGlzIHJlc291cmNlIHdhcyBsb2FkZWQgYXMgYSB2aWRlbyB0YWcuIE9ubHkgdmFsaWQgYWZ0ZXIgdGhlIHJlc291cmNlXG4gICAgICogaGFzIGNvbXBsZXRlbHkgbG9hZGVkLlxuICAgICAqXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmlzVmlkZW8gPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgZGVxdWV1ZWAgbWV0aG9kIHRoYXQgd2lsbCBiZSB1c2VkIGEgc3RvcmFnZSBwbGFjZSBmb3IgdGhlIGFzeW5jIHF1ZXVlIGRlcXVldWUgbWV0aG9kXG4gICAgICogdXNlZCBwcml2YXRlbHkgYnkgdGhlIGxvYWRlci5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Z1bmN0aW9ufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdGhpcy5fZGVxdWV1ZSA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYGNvbXBsZXRlYCBmdW5jdGlvbiBib3VuZCB0byB0aGlzIHJlc291cmNlJ3MgY29udGV4dC5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Z1bmN0aW9ufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdGhpcy5fYm91bmRDb21wbGV0ZSA9IHRoaXMuY29tcGxldGUuYmluZCh0aGlzKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgX29uRXJyb3JgIGZ1bmN0aW9uIGJvdW5kIHRvIHRoaXMgcmVzb3VyY2UncyBjb250ZXh0LlxuICAgICAqXG4gICAgICogQG1lbWJlciB7ZnVuY3Rpb259XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB0aGlzLl9ib3VuZE9uRXJyb3IgPSB0aGlzLl9vbkVycm9yLmJpbmQodGhpcyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYF9vblByb2dyZXNzYCBmdW5jdGlvbiBib3VuZCB0byB0aGlzIHJlc291cmNlJ3MgY29udGV4dC5cbiAgICAgKlxuICAgICAqIEBtZW1iZXIge2Z1bmN0aW9ufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdGhpcy5fYm91bmRPblByb2dyZXNzID0gdGhpcy5fb25Qcm9ncmVzcy5iaW5kKHRoaXMpO1xuXG4gICAgLy8geGhyIGNhbGxiYWNrc1xuICAgIHRoaXMuX2JvdW5kWGhyT25FcnJvciA9IHRoaXMuX3hock9uRXJyb3IuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9ib3VuZFhock9uQWJvcnQgPSB0aGlzLl94aHJPbkFib3J0LmJpbmQodGhpcyk7XG4gICAgdGhpcy5fYm91bmRYaHJPbkxvYWQgPSB0aGlzLl94aHJPbkxvYWQuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9ib3VuZFhkck9uVGltZW91dCA9IHRoaXMuX3hkck9uVGltZW91dC5iaW5kKHRoaXMpO1xuXG4gICAgLyoqXG4gICAgICogRW1pdHRlZCB3aGVuIHRoZSByZXNvdXJjZSBiZWluZ3MgdG8gbG9hZC5cbiAgICAgKlxuICAgICAqIEBldmVudCBzdGFydFxuICAgICAqIEBtZW1iZXJvZiBSZXNvdXJjZSNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEVtaXR0ZWQgZWFjaCB0aW1lIHByb2dyZXNzIG9mIHRoaXMgcmVzb3VyY2UgbG9hZCB1cGRhdGVzLlxuICAgICAqIE5vdCBhbGwgcmVzb3VyY2VzIHR5cGVzIGFuZCBsb2FkZXIgc3lzdGVtcyBjYW4gc3VwcG9ydCB0aGlzIGV2ZW50XG4gICAgICogc28gc29tZXRpbWVzIGl0IG1heSBub3QgYmUgYXZhaWxhYmxlLiBJZiB0aGUgcmVzb3VyY2VcbiAgICAgKiBpcyBiZWluZyBsb2FkZWQgb24gYSBtb2Rlcm4gYnJvd3NlciwgdXNpbmcgWEhSLCBhbmQgdGhlIHJlbW90ZSBzZXJ2ZXJcbiAgICAgKiBwcm9wZXJseSBzZXRzIENvbnRlbnQtTGVuZ3RoIGhlYWRlcnMsIHRoZW4gdGhpcyB3aWxsIGJlIGF2YWlsYWJsZS5cbiAgICAgKlxuICAgICAqIEBldmVudCBwcm9ncmVzc1xuICAgICAqIEBtZW1iZXJvZiBSZXNvdXJjZSNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEVtaXR0ZWQgb25jZSB0aGlzIHJlc291cmNlIGhhcyBsb2FkZWQsIGlmIHRoZXJlIHdhcyBhbiBlcnJvciBpdCB3aWxsXG4gICAgICogYmUgaW4gdGhlIGBlcnJvcmAgcHJvcGVydHkuXG4gICAgICpcbiAgICAgKiBAZXZlbnQgY29tcGxldGVcbiAgICAgKiBAbWVtYmVyb2YgUmVzb3VyY2UjXG4gICAgICovXG59XG5cblJlc291cmNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5SZXNvdXJjZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBSZXNvdXJjZTtcbm1vZHVsZS5leHBvcnRzID0gUmVzb3VyY2U7XG5cbi8qKlxuICogTWFya3MgdGhlIHJlc291cmNlIGFzIGNvbXBsZXRlLlxuICpcbiAqIEBmaXJlcyBjb21wbGV0ZVxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUuY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogQ2xlYW4gdGhpcyB1cCBpbiBhIHdyYXBwZXIgb3Igc29tZXRoaW5nLi4uZ3Jvc3MuLi4uXG4gICAgaWYgKHRoaXMuZGF0YSAmJiB0aGlzLmRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICB0aGlzLmRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9ib3VuZE9uRXJyb3IpO1xuICAgICAgICB0aGlzLmRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIHRoaXMuX2JvdW5kQ29tcGxldGUpO1xuICAgICAgICB0aGlzLmRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCB0aGlzLl9ib3VuZE9uUHJvZ3Jlc3MpO1xuICAgICAgICB0aGlzLmRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCB0aGlzLl9ib3VuZENvbXBsZXRlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy54aHIpIHtcbiAgICAgICAgaWYgKHRoaXMueGhyLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMueGhyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5fYm91bmRYaHJPbkVycm9yKTtcbiAgICAgICAgICAgIHRoaXMueGhyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgdGhpcy5fYm91bmRYaHJPbkFib3J0KTtcbiAgICAgICAgICAgIHRoaXMueGhyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgdGhpcy5fYm91bmRPblByb2dyZXNzKTtcbiAgICAgICAgICAgIHRoaXMueGhyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzLl9ib3VuZFhock9uTG9hZCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnhoci5vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMueGhyLm9udGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnhoci5vbnByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMueGhyLm9ubG9hZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmVtaXQoJ2NvbXBsZXRlJywgdGhpcyk7XG59O1xuXG4vKipcbiAqIEtpY2tzIG9mZiBsb2FkaW5nIG9mIHRoaXMgcmVzb3VyY2UuXG4gKlxuICogQGZpcmVzIHN0YXJ0XG4gKiBAcGFyYW0gW2NhbGxiYWNrXSB7ZnVuY3Rpb259IE9wdGlvbmFsIGNhbGxiYWNrIHRvIGNhbGwgb25jZSB0aGUgcmVzb3VyY2UgaXMgbG9hZGVkLlxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uIChjYikge1xuICAgIHRoaXMuZW1pdCgnc3RhcnQnLCB0aGlzKTtcblxuICAgIC8vIGlmIGEgY2FsbGJhY2sgaXMgc2V0LCBsaXN0ZW4gZm9yIGNvbXBsZXRlIGV2ZW50XG4gICAgaWYgKGNiKSB7XG4gICAgICAgIHRoaXMub25jZSgnY29tcGxldGUnLCBjYik7XG4gICAgfVxuXG4gICAgLy8gaWYgdW5zZXQsIGRldGVybWluZSB0aGUgdmFsdWVcbiAgICBpZiAodHlwZW9mIHRoaXMuY3Jvc3NPcmlnaW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuY3Jvc3NPcmlnaW4gPSB0aGlzLl9kZXRlcm1pbmVDcm9zc09yaWdpbigpO1xuICAgIH1cblxuICAgIHN3aXRjaCh0aGlzLmxvYWRUeXBlKSB7XG4gICAgICAgIGNhc2UgUmVzb3VyY2UuTE9BRF9UWVBFLklNQUdFOlxuICAgICAgICAgICAgdGhpcy5fbG9hZEltYWdlKCk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFJlc291cmNlLkxPQURfVFlQRS5BVURJTzpcbiAgICAgICAgICAgIHRoaXMuX2xvYWRFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBSZXNvdXJjZS5MT0FEX1RZUEUuVklERU86XG4gICAgICAgICAgICB0aGlzLl9sb2FkRWxlbWVudCgndmlkZW8nKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgUmVzb3VyY2UuTE9BRF9UWVBFLlhIUjpcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGlmICh1c2VYZHIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2FkWGRyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2FkWGhyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59O1xuXG4vKipcbiAqIExvYWRzIHRoaXMgcmVzb3VyY2VzIHVzaW5nIGFuIEltYWdlIG9iamVjdC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5SZXNvdXJjZS5wcm90b3R5cGUuX2xvYWRJbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRhdGEgPSBuZXcgSW1hZ2UoKTtcblxuICAgIGlmICh0aGlzLmNyb3NzT3JpZ2luKSB7XG4gICAgICAgIHRoaXMuZGF0YS5jcm9zc09yaWdpbiA9ICcnO1xuICAgIH1cblxuICAgIHRoaXMuZGF0YS5zcmMgPSB0aGlzLnVybDtcblxuICAgIHRoaXMuaXNJbWFnZSA9IHRydWU7XG5cbiAgICB0aGlzLmRhdGEuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9ib3VuZE9uRXJyb3IsIGZhbHNlKTtcbiAgICB0aGlzLmRhdGEuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHRoaXMuX2JvdW5kQ29tcGxldGUsIGZhbHNlKTtcbiAgICB0aGlzLmRhdGEuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCB0aGlzLl9ib3VuZE9uUHJvZ3Jlc3MsIGZhbHNlKTtcbn07XG5cbi8qKlxuICogTG9hZHMgdGhpcyByZXNvdXJjZXMgdXNpbmcgYW4gSFRNTEF1ZGlvRWxlbWVudCBvciBIVE1MVmlkZW9FbGVtZW50LlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fbG9hZEVsZW1lbnQgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHRoaXMuZGF0YSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLnVybCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnVybC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdGhpcy5kYXRhLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNvdXJjZSh0eXBlLCB0aGlzLnVybFtpXSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmRhdGEuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU291cmNlKHR5cGUsIHRoaXMudXJsKSk7XG4gICAgfVxuXG4gICAgdGhpc1snaXMnICsgdHlwZVswXS50b1VwcGVyQ2FzZSgpICsgdHlwZS5zdWJzdHJpbmcoMSldID0gdHJ1ZTtcblxuICAgIHRoaXMuZGF0YS5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMuX2JvdW5kT25FcnJvciwgZmFsc2UpO1xuICAgIHRoaXMuZGF0YS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgdGhpcy5fYm91bmRDb21wbGV0ZSwgZmFsc2UpO1xuICAgIHRoaXMuZGF0YS5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIHRoaXMuX2JvdW5kT25Qcm9ncmVzcywgZmFsc2UpO1xuICAgIHRoaXMuZGF0YS5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHRoaXMuX2JvdW5kQ29tcGxldGUsIGZhbHNlKTtcblxuICAgIHRoaXMuZGF0YS5sb2FkKCk7XG59O1xuXG4vKipcbiAqIExvYWRzIHRoaXMgcmVzb3VyY2VzIHVzaW5nIGFuIFhNTEh0dHBSZXF1ZXN0LlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fbG9hZFhociA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpZiB1bnNldCwgZGV0ZXJtaW5lIHRoZSB2YWx1ZVxuICAgIGlmICh0eXBlb2YgdGhpcy54aHJUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLnhoclR5cGUgPSB0aGlzLl9kZXRlcm1pbmVYaHJUeXBlKCk7XG4gICAgfVxuXG4gICAgdmFyIHhociA9IHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAvLyBzZXQgdGhlIHJlcXVlc3QgdHlwZSBhbmQgdXJsXG4gICAgeGhyLm9wZW4oJ0dFVCcsIHRoaXMudXJsLCB0cnVlKTtcblxuICAgIC8vIGxvYWQganNvbiBhcyB0ZXh0IGFuZCBwYXJzZSBpdCBvdXJzZWx2ZXMuIFdlIGRvIHRoaXMgYmVjYXVzZSBzb21lIGJyb3dzZXJzXG4gICAgLy8gKmNvdWdoKiBzYWZhcmkgKmNvdWdoKiBjYW4ndCBkZWFsIHdpdGggaXQuXG4gICAgaWYgKHRoaXMueGhyVHlwZSA9PT0gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuSlNPTiB8fCB0aGlzLnhoclR5cGUgPT09IFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLkRPQ1VNRU5UKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSBSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRS5URVhUO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9IHRoaXMueGhyVHlwZTtcbiAgICB9XG5cbiAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9ib3VuZFhock9uRXJyb3IsIGZhbHNlKTtcbiAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCB0aGlzLl9ib3VuZFhock9uQWJvcnQsIGZhbHNlKTtcbiAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCB0aGlzLl9ib3VuZE9uUHJvZ3Jlc3MsIGZhbHNlKTtcbiAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHRoaXMuX2JvdW5kWGhyT25Mb2FkLCBmYWxzZSk7XG5cbiAgICB4aHIuc2VuZCgpO1xufTtcblxuLyoqXG4gKiBMb2FkcyB0aGlzIHJlc291cmNlcyB1c2luZyBhbiBYRG9tYWluUmVxdWVzdC4gVGhpcyBpcyBoZXJlIGJlY2F1c2Ugd2UgbmVlZCB0byBzdXBwb3J0IElFOSAoZ3Jvc3MpLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fbG9hZFhkciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpZiB1bnNldCwgZGV0ZXJtaW5lIHRoZSB2YWx1ZVxuICAgIGlmICh0eXBlb2YgdGhpcy54aHJUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLnhoclR5cGUgPSB0aGlzLl9kZXRlcm1pbmVYaHJUeXBlKCk7XG4gICAgfVxuXG4gICAgdmFyIHhkciA9IHRoaXMueGhyID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG5cbiAgICAvLyBYRG9tYWluUmVxdWVzdCBoYXMgYSBmZXcgcXVpcmtzLiBPY2Nhc2lvbmFsbHkgaXQgd2lsbCBhYm9ydCByZXF1ZXN0c1xuICAgIC8vIEEgd2F5IHRvIGF2b2lkIHRoaXMgaXMgdG8gbWFrZSBzdXJlIEFMTCBjYWxsYmFja3MgYXJlIHNldCBldmVuIGlmIG5vdCB1c2VkXG4gICAgLy8gTW9yZSBpbmZvIGhlcmU6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTU3ODY5NjYveGRvbWFpbnJlcXVlc3QtYWJvcnRzLXBvc3Qtb24taWUtOVxuICAgIHhkci50aW1lb3V0ID0gNTAwMDtcblxuICAgIHhkci5vbmVycm9yID0gdGhpcy5fYm91bmRYaHJPbkVycm9yO1xuICAgIHhkci5vbnRpbWVvdXQgPSB0aGlzLl9ib3VuZFhkck9uVGltZW91dDtcbiAgICB4ZHIub25wcm9ncmVzcyA9IHRoaXMuX2JvdW5kT25Qcm9ncmVzcztcbiAgICB4ZHIub25sb2FkID0gdGhpcy5fYm91bmRYaHJPbkxvYWQ7XG5cbiAgICB4ZHIub3BlbignR0VUJywgdGhpcy51cmwsIHRydWUpO1xuXG4gICAgLy8gIE5vdGU6IFRoZSB4ZHIuc2VuZCgpIGNhbGwgaXMgd3JhcHBlZCBpbiBhIHRpbWVvdXQgdG8gcHJldmVudCBhbiBpc3N1ZSB3aXRoIHRoZSBpbnRlcmZhY2Ugd2hlcmUgc29tZSByZXF1ZXN0cyBhcmUgbG9zdFxuICAgIC8vICBpZiBtdWx0aXBsZSBYRG9tYWluUmVxdWVzdHMgYXJlIGJlaW5nIHNlbnQgYXQgdGhlIHNhbWUgdGltZS5cbiAgICAvLyBTb21lIGluZm8gaGVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Bob3RvbnN0b3JtL3BoYXNlci9pc3N1ZXMvMTI0OFxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB4ZHIuc2VuZCgpO1xuICAgIH0sIDApO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc291cmNlIHVzZWQgaW4gbG9hZGluZyB2aWEgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0gdHlwZSB7c3RyaW5nfSBUaGUgZWxlbWVudCB0eXBlICh2aWRlbyBvciBhdWRpbykuXG4gKiBAcGFyYW0gdXJsIHtzdHJpbmd9IFRoZSBzb3VyY2UgVVJMIHRvIGxvYWQgZnJvbS5cbiAqIEBwYXJhbSBbbWltZV0ge3N0cmluZ30gVGhlIG1pbWUgdHlwZSBvZiB0aGUgdmlkZW9cbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fY3JlYXRlU291cmNlID0gZnVuY3Rpb24gKHR5cGUsIHVybCwgbWltZSkge1xuICAgIGlmICghbWltZSkge1xuICAgICAgICBtaW1lID0gdHlwZSArICcvJyArIHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcuJykgKyAxKTtcbiAgICB9XG5cbiAgICB2YXIgc291cmNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc291cmNlJyk7XG5cbiAgICBzb3VyY2Uuc3JjID0gdXJsO1xuICAgIHNvdXJjZS50eXBlID0gbWltZTtcblxuICAgIHJldHVybiBzb3VyY2U7XG59O1xuXG4vKipcbiAqIENhbGxlZCBpZiBhIGxvYWQgZXJyb3JzIG91dC5cbiAqXG4gKiBAcGFyYW0gZXZlbnQge0V2ZW50fSBUaGUgZXJyb3IgZXZlbnQgZnJvbSB0aGUgZWxlbWVudCB0aGF0IGVtaXRzIGl0LlxuICogQHByaXZhdGVcbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLl9vbkVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5lcnJvciA9IG5ldyBFcnJvcignRmFpbGVkIHRvIGxvYWQgZWxlbWVudCB1c2luZyAnICsgZXZlbnQudGFyZ2V0Lm5vZGVOYW1lKTtcbiAgICB0aGlzLmNvbXBsZXRlKCk7XG59O1xuXG4vKipcbiAqIENhbGxlZCBpZiBhIGxvYWQgcHJvZ3Jlc3MgZXZlbnQgZmlyZXMgZm9yIHhoci94ZHIuXG4gKlxuICogQGZpcmVzIHByb2dyZXNzXG4gKiBAcGFyYW0gZXZlbnQge1hNTEh0dHBSZXF1ZXN0UHJvZ3Jlc3NFdmVudHxFdmVudH1cbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fb25Qcm9ncmVzcyA9ICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICB0aGlzLmVtaXQoJ3Byb2dyZXNzJywgdGhpcywgZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWwpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2FsbGVkIGlmIGFuIGVycm9yIGV2ZW50IGZpcmVzIGZvciB4aHIveGRyLlxuICpcbiAqIEBwYXJhbSBldmVudCB7WE1MSHR0cFJlcXVlc3RFcnJvckV2ZW50fEV2ZW50fVxuICogQHByaXZhdGVcbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLl94aHJPbkVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgIHJlcVR5cGUodGhpcy54aHIpICsgJyBSZXF1ZXN0IGZhaWxlZC4gJyArXG4gICAgICAgICdTdGF0dXM6ICcgKyB0aGlzLnhoci5zdGF0dXMgKyAnLCB0ZXh0OiBcIicgKyB0aGlzLnhoci5zdGF0dXNUZXh0ICsgJ1wiJ1xuICAgICk7XG5cbiAgICB0aGlzLmNvbXBsZXRlKCk7XG59O1xuXG4vKipcbiAqIENhbGxlZCBpZiBhbiBhYm9ydCBldmVudCBmaXJlcyBmb3IgeGhyLlxuICpcbiAqIEBwYXJhbSBldmVudCB7WE1MSHR0cFJlcXVlc3RBYm9ydEV2ZW50fVxuICogQHByaXZhdGVcbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLl94aHJPbkFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZXJyb3IgPSBuZXcgRXJyb3IocmVxVHlwZSh0aGlzLnhocikgKyAnIFJlcXVlc3Qgd2FzIGFib3J0ZWQgYnkgdGhlIHVzZXIuJyk7XG4gICAgdGhpcy5jb21wbGV0ZSgpO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgaWYgYSB0aW1lb3V0IGV2ZW50IGZpcmVzIGZvciB4ZHIuXG4gKlxuICogQHBhcmFtIGV2ZW50IHtFdmVudH1cbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5feGRyT25UaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZXJyb3IgPSBuZXcgRXJyb3IocmVxVHlwZSh0aGlzLnhocikgKyAnIFJlcXVlc3QgdGltZWQgb3V0LicpO1xuICAgIHRoaXMuY29tcGxldGUoKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHdoZW4gZGF0YSBzdWNjZXNzZnVsbHkgbG9hZHMgZnJvbSBhbiB4aHIveGRyIHJlcXVlc3QuXG4gKlxuICogQHBhcmFtIGV2ZW50IHtYTUxIdHRwUmVxdWVzdExvYWRFdmVudHxFdmVudH1cbiAqIEBwcml2YXRlXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5feGhyT25Mb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB4aHIgPSB0aGlzLnhocjtcblxuICAgIGlmICh4aHIuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgLy8gaWYgdGV4dCwganVzdCByZXR1cm4gaXRcbiAgICAgICAgaWYgKHRoaXMueGhyVHlwZSA9PT0gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuVEVYVCkge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0geGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBqc29uLCBwYXJzZSBpbnRvIGpzb24gb2JqZWN0XG4gICAgICAgIGVsc2UgaWYgKHRoaXMueGhyVHlwZSA9PT0gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuSlNPTikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNKc29uID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBuZXcgRXJyb3IoJ0Vycm9yIHRyeWluZyB0byBwYXJzZSBsb2FkZWQganNvbjonLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBpZiB4bWwsIHBhcnNlIGludG8gYW4geG1sIGRvY3VtZW50IG9yIGRpdiBlbGVtZW50XG4gICAgICAgIGVsc2UgaWYgKHRoaXMueGhyVHlwZSA9PT0gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuRE9DVU1FTlQpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5ET01QYXJzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRvbXBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhID0gZG9tcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh4aHIucmVzcG9uc2VUZXh0LCAndGV4dC94bWwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgZGl2LmlubmVySFRNTCA9IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRpdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pc1htbCA9IHRydWU7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvciA9IG5ldyBFcnJvcignRXJyb3IgdHJ5aW5nIHRvIHBhcnNlIGxvYWRlZCB4bWw6JywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3RoZXIgdHlwZXMganVzdCByZXR1cm4gdGhlIHJlc3BvbnNlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0geGhyLnJlc3BvbnNlIHx8IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuZXJyb3IgPSBuZXcgRXJyb3IoJ1snICsgeGhyLnN0YXR1cyArICddJyArIHhoci5zdGF0dXNUZXh0ICsgJzonICsgeGhyLnJlc3BvbnNlVVJMKTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbXBsZXRlKCk7XG59O1xuXG5mdW5jdGlvbiByZXFUeXBlKHhocikge1xuICAgIHJldHVybiB4aHIudG9TdHJpbmcoKS5yZXBsYWNlKCdvYmplY3QgJywgJycpO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIGBjcm9zc09yaWdpbmAgcHJvcGVydHkgZm9yIHRoaXMgcmVzb3VyY2UgYmFzZWQgb24gaWYgdGhlIHVybFxuICogZm9yIHRoaXMgcmVzb3VyY2UgaXMgY3Jvc3Mtb3JpZ2luLiBJZiBjcm9zc09yaWdpbiB3YXMgbWFudWFsbHkgc2V0LCB0aGlzXG4gKiBmdW5jdGlvbiBkb2VzIG5vdGhpbmcuXG4gKlxuICogQHByaXZhdGVcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGNyb3NzT3JpZ2luIHZhbHVlIHRvIHVzZSAob3IgZW1wdHkgc3RyaW5nIGZvciBub25lKS5cbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLl9kZXRlcm1pbmVDcm9zc09yaWdpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBkYXRhOiBhbmQgamF2YXNjcmlwdDogdXJscyBhcmUgY29uc2lkZXJlZCBzYW1lLW9yaWdpblxuICAgIGlmICh0aGlzLnVybC5pbmRleE9mKCdkYXRhOicpID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiB0aGlzIGlzIGEgY3Jvc3Mtb3JpZ2luIHVybFxuICAgIHZhciBsb2MgPSB3aW5kb3cubG9jYXRpb24sXG4gICAgICAgIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICBhLmhyZWYgPSB0aGlzLnVybDtcblxuICAgIC8vIGlmIGNyb3NzIG9yaWdpblxuICAgIGlmIChhLmhvc3RuYW1lICE9PSBsb2MuaG9zdG5hbWUgfHwgYS5wb3J0ICE9PSBsb2MucG9ydCB8fCBhLnByb3RvY29sICE9PSBsb2MucHJvdG9jb2wpIHtcbiAgICAgICAgcmV0dXJuICdhbm9ueW1vdXMnO1xuICAgIH1cblxuICAgIHJldHVybiAnJztcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgcmVzcG9uc2VUeXBlIG9mIGFuIFhIUiByZXF1ZXN0IGJhc2VkIG9uIHRoZSBleHRlbnNpb24gb2YgdGhlXG4gKiByZXNvdXJjZSBiZWluZyBsb2FkZWQuXG4gKlxuICogQHByaXZhdGVcbiAqIEByZXR1cm4ge1Jlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFfSBUaGUgcmVzcG9uc2VUeXBlIHRvIHVzZS5cbiAqL1xuUmVzb3VyY2UucHJvdG90eXBlLl9kZXRlcm1pbmVYaHJUeXBlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBleHQgPSB0aGlzLnVybC5zdWJzdHIodGhpcy51cmwubGFzdEluZGV4T2YoJy4nKSArIDEpO1xuXG4gICAgc3dpdGNoKGV4dCkge1xuICAgICAgICAvLyB4bWxcbiAgICAgICAgY2FzZSAneGh0bWwnOlxuICAgICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgY2FzZSAnaHRtJzpcbiAgICAgICAgY2FzZSAneG1sJzpcbiAgICAgICAgY2FzZSAndG14JzpcbiAgICAgICAgY2FzZSAndHN4JzpcbiAgICAgICAgY2FzZSAnc3ZnJzpcbiAgICAgICAgICAgIHJldHVybiBSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRS5ET0NVTUVOVDtcblxuICAgICAgICAvLyBpbWFnZXNcbiAgICAgICAgY2FzZSAnZ2lmJzpcbiAgICAgICAgY2FzZSAncG5nJzpcbiAgICAgICAgY2FzZSAnYm1wJzpcbiAgICAgICAgY2FzZSAnanBnJzpcbiAgICAgICAgY2FzZSAnanBlZyc6XG4gICAgICAgIGNhc2UgJ3RpZic6XG4gICAgICAgIGNhc2UgJ3RpZmYnOlxuICAgICAgICBjYXNlICd3ZWJwJzpcbiAgICAgICAgICAgIHJldHVybiBSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRS5CTE9CO1xuXG4gICAgICAgIC8vIGpzb25cbiAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgICByZXR1cm4gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuSlNPTjtcblxuICAgICAgICAvLyB0ZXh0XG4gICAgICAgIGNhc2UgJ3RleHQnOlxuICAgICAgICBjYXNlICd0eHQnOlxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLlRFWFQ7XG4gICAgfVxufTtcblxuUmVzb3VyY2UucHJvdG90eXBlLl9kZXRlcm1pbmVMb2FkVHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXh0ID0gdGhpcy51cmwuc3Vic3RyKHRoaXMudXJsLmxhc3RJbmRleE9mKCcuJykgKyAxKTtcblxuICAgIHN3aXRjaChleHQpIHtcbiAgICAgICAgLy8gaW1hZ2VzXG4gICAgICAgIGNhc2UgJ2dpZic6XG4gICAgICAgIGNhc2UgJ3BuZyc6XG4gICAgICAgIGNhc2UgJ2JtcCc6XG4gICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgIGNhc2UgJ2pwZWcnOlxuICAgICAgICBjYXNlICd0aWYnOlxuICAgICAgICBjYXNlICd0aWZmJzpcbiAgICAgICAgY2FzZSAnd2VicCc6XG4gICAgICAgICAgICByZXR1cm4gUmVzb3VyY2UuTE9BRF9UWVBFLklNQUdFO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gUmVzb3VyY2UuTE9BRF9UWVBFLlhIUjtcbiAgICB9XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG1pbWUgdHlwZSBvZiBhbiBYSFIgcmVxdWVzdCBiYXNlZCBvbiB0aGUgcmVzcG9uc2VUeXBlIG9mXG4gKiByZXNvdXJjZSBiZWluZyBsb2FkZWQuXG4gKlxuICogQHByaXZhdGVcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIG1pbWUgdHlwZSB0byB1c2UuXG4gKi9cblJlc291cmNlLnByb3RvdHlwZS5fZ2V0TWltZUZyb21YaHJUeXBlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICBjYXNlIFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLkJVRkZFUjpcbiAgICAgICAgICAgIHJldHVybiAnYXBwbGljYXRpb24vb2N0ZXQtYmluYXJ5JztcblxuICAgICAgICBjYXNlIFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLkJMT0I6XG4gICAgICAgICAgICByZXR1cm4gJ2FwcGxpY2F0aW9uL2Jsb2InO1xuXG4gICAgICAgIGNhc2UgUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuRE9DVU1FTlQ6XG4gICAgICAgICAgICByZXR1cm4gJ2FwcGxpY2F0aW9uL3htbCc7XG5cbiAgICAgICAgY2FzZSBSZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRS5KU09OOlxuICAgICAgICAgICAgcmV0dXJuICdhcHBsaWNhdGlvbi9qc29uJztcblxuICAgICAgICBjYXNlIFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLkRFRkFVTFQ6XG4gICAgICAgIGNhc2UgUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuVEVYVDpcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiAndGV4dC9wbGFpbic7XG5cbiAgICB9XG59O1xuXG4vKipcbiAqIFRoZSB0eXBlcyBvZiBsb2FkaW5nIGEgcmVzb3VyY2UgY2FuIHVzZS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY29uc3RhbnRcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBMT0FEX1RZUEVcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBMT0FEX1RZUEUuWEhSIC0gVXNlcyBYTUxIdHRwUmVxdWVzdCB0byBsb2FkIHRoZSByZXNvdXJjZS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBMT0FEX1RZUEUuSU1BR0UgLSBVc2VzIGFuIGBJbWFnZWAgb2JqZWN0IHRvIGxvYWQgdGhlIHJlc291cmNlLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IExPQURfVFlQRS5BVURJTyAtIFVzZXMgYW4gYEF1ZGlvYCBvYmplY3QgdG8gbG9hZCB0aGUgcmVzb3VyY2UuXG4gKiBAcHJvcGVydHkge251bWJlcn0gTE9BRF9UWVBFLlZJREVPIC0gVXNlcyBhIGBWaWRlb2Agb2JqZWN0IHRvIGxvYWQgdGhlIHJlc291cmNlLlxuICovXG5SZXNvdXJjZS5MT0FEX1RZUEUgPSB7XG4gICAgWEhSOiAgICAxLFxuICAgIElNQUdFOiAgMixcbiAgICBBVURJTzogIDMsXG4gICAgVklERU86ICA0XG59O1xuXG4vKipcbiAqIFRoZSBYSFIgcmVhZHkgc3RhdGVzLCB1c2VkIGludGVybmFsbHkuXG4gKlxuICogQHN0YXRpY1xuICogQGNvbnN0YW50XG4gKiBAcHJvcGVydHkge29iamVjdH0gWEhSX1JFQURZX1NUQVRFXG4gKiBAcHJvcGVydHkge251bWJlcn0gWEhSX1JFQURZX1NUQVRFLlVOU0VOVCAtIG9wZW4oKWhhcyBub3QgYmVlbiBjYWxsZWQgeWV0LlxuICogQHByb3BlcnR5IHtudW1iZXJ9IFhIUl9SRUFEWV9TVEFURS5PUEVORUQgLSBzZW5kKCloYXMgbm90IGJlZW4gY2FsbGVkIHlldC5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBYSFJfUkVBRFlfU1RBVEUuSEVBREVSU19SRUNFSVZFRCAtIHNlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCBoZWFkZXJzIGFuZCBzdGF0dXMgYXJlIGF2YWlsYWJsZS5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBYSFJfUkVBRFlfU1RBVEUuTE9BRElORyAtIERvd25sb2FkaW5nOyByZXNwb25zZVRleHQgaG9sZHMgcGFydGlhbCBkYXRhLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IFhIUl9SRUFEWV9TVEFURS5ET05FIC0gVGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZS5cbiAqL1xuUmVzb3VyY2UuWEhSX1JFQURZX1NUQVRFID0ge1xuICAgIFVOU0VOVDogMCxcbiAgICBPUEVORUQ6IDEsXG4gICAgSEVBREVSU19SRUNFSVZFRDogMixcbiAgICBMT0FESU5HOiAzLFxuICAgIERPTkU6IDRcbn07XG5cbi8qKlxuICogVGhlIFhIUiByZWFkeSBzdGF0ZXMsIHVzZWQgaW50ZXJuYWxseS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY29uc3RhbnRcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBYSFJfUkVTUE9OU0VfVFlQRVxuICogQHByb3BlcnR5IHtzdHJpbmd9IFhIUl9SRVNQT05TRV9UWVBFLkRFRkFVTFQgLSBkZWZhdWx0cyB0byB0ZXh0XG4gKiBAcHJvcGVydHkge3N0cmluZ30gWEhSX1JFU1BPTlNFX1RZUEUuQlVGRkVSIC0gQXJyYXlCdWZmZXJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBYSFJfUkVTUE9OU0VfVFlQRS5CTE9CIC0gQmxvYlxuICogQHByb3BlcnR5IHtzdHJpbmd9IFhIUl9SRVNQT05TRV9UWVBFLkRPQ1VNRU5UIC0gRG9jdW1lbnRcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBYSFJfUkVTUE9OU0VfVFlQRS5KU09OIC0gT2JqZWN0XG4gKiBAcHJvcGVydHkge3N0cmluZ30gWEhSX1JFU1BPTlNFX1RZUEUuVEVYVCAtIFN0cmluZ1xuICovXG5SZXNvdXJjZS5YSFJfUkVTUE9OU0VfVFlQRSA9IHtcbiAgICBERUZBVUxUOiAgICAndGV4dCcsXG4gICAgQlVGRkVSOiAgICAgJ2FycmF5YnVmZmVyJyxcbiAgICBCTE9COiAgICAgICAnYmxvYicsXG4gICAgRE9DVU1FTlQ6ICAgJ2RvY3VtZW50JyxcbiAgICBKU09OOiAgICAgICAnanNvbicsXG4gICAgVEVYVDogICAgICAgJ3RleHQnXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAvLyBwcml2YXRlIHByb3BlcnR5XG4gICAgX2tleVN0cjogXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiLFxuXG4gICAgZW5jb2RlQmluYXJ5OiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IFwiXCI7XG4gICAgICAgIHZhciBieXRlYnVmZmVyO1xuICAgICAgICB2YXIgZW5jb2RlZENoYXJJbmRleGVzID0gbmV3IEFycmF5KDQpO1xuICAgICAgICB2YXIgaW54ID0gMDtcbiAgICAgICAgdmFyIGpueCA9IDA7XG4gICAgICAgIHZhciBwYWRkaW5nQnl0ZXMgPSAwO1xuXG4gICAgICAgIHdoaWxlIChpbnggPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEZpbGwgYnl0ZSBidWZmZXIgYXJyYXlcbiAgICAgICAgICAgIGJ5dGVidWZmZXIgPSBuZXcgQXJyYXkoMyk7XG4gICAgICAgICAgICBmb3IgKGpueCA9IDA7IGpueCA8IGJ5dGVidWZmZXIubGVuZ3RoOyBqbngrKykge1xuICAgICAgICAgICAgICAgIGlmIChpbnggPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhyb3cgYXdheSBoaWdoLW9yZGVyIGJ5dGUsIGFzIGRvY3VtZW50ZWQgYXQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL0VuL1VzaW5nX1hNTEh0dHBSZXF1ZXN0I0hhbmRsaW5nX2JpbmFyeV9kYXRhXG4gICAgICAgICAgICAgICAgICAgIGJ5dGVidWZmZXJbam54XSA9IGlucHV0LmNoYXJDb2RlQXQoaW54KyspICYgMHhmZjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJ5dGVidWZmZXJbam54XSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgZWFjaCBlbmNvZGVkIGNoYXJhY3RlciwgNiBiaXRzIGF0IGEgdGltZVxuICAgICAgICAgICAgLy8gaW5kZXggMTogZmlyc3QgNiBiaXRzXG4gICAgICAgICAgICBlbmNvZGVkQ2hhckluZGV4ZXNbMF0gPSBieXRlYnVmZmVyWzBdID4+IDI7XG4gICAgICAgICAgICAvLyBpbmRleCAyOiBzZWNvbmQgNiBiaXRzICgyIGxlYXN0IHNpZ25pZmljYW50IGJpdHMgZnJvbSBpbnB1dCBieXRlIDEgKyA0IG1vc3Qgc2lnbmlmaWNhbnQgYml0cyBmcm9tIGJ5dGUgMilcbiAgICAgICAgICAgIGVuY29kZWRDaGFySW5kZXhlc1sxXSA9ICgoYnl0ZWJ1ZmZlclswXSAmIDB4MykgPDwgNCkgfCAoYnl0ZWJ1ZmZlclsxXSA+PiA0KTtcbiAgICAgICAgICAgIC8vIGluZGV4IDM6IHRoaXJkIDYgYml0cyAoNCBsZWFzdCBzaWduaWZpY2FudCBiaXRzIGZyb20gaW5wdXQgYnl0ZSAyICsgMiBtb3N0IHNpZ25pZmljYW50IGJpdHMgZnJvbSBieXRlIDMpXG4gICAgICAgICAgICBlbmNvZGVkQ2hhckluZGV4ZXNbMl0gPSAoKGJ5dGVidWZmZXJbMV0gJiAweDBmKSA8PCAyKSB8IChieXRlYnVmZmVyWzJdID4+IDYpO1xuICAgICAgICAgICAgLy8gaW5kZXggMzogZm9ydGggNiBiaXRzICg2IGxlYXN0IHNpZ25pZmljYW50IGJpdHMgZnJvbSBpbnB1dCBieXRlIDMpXG4gICAgICAgICAgICBlbmNvZGVkQ2hhckluZGV4ZXNbM10gPSBieXRlYnVmZmVyWzJdICYgMHgzZjtcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgcGFkZGluZyBoYXBwZW5lZCwgYW5kIGFkanVzdCBhY2NvcmRpbmdseVxuICAgICAgICAgICAgcGFkZGluZ0J5dGVzID0gaW54IC0gKGlucHV0Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgc3dpdGNoIChwYWRkaW5nQnl0ZXMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBsYXN0IDIgY2hhcmFjdGVycyB0byBwYWRkaW5nIGNoYXJcbiAgICAgICAgICAgICAgICAgICAgZW5jb2RlZENoYXJJbmRleGVzWzNdID0gNjQ7XG4gICAgICAgICAgICAgICAgICAgIGVuY29kZWRDaGFySW5kZXhlc1syXSA9IDY0O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGxhc3QgY2hhcmFjdGVyIHRvIHBhZGRpbmcgY2hhclxuICAgICAgICAgICAgICAgICAgICBlbmNvZGVkQ2hhckluZGV4ZXNbM10gPSA2NDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gTm8gcGFkZGluZyAtIHByb2NlZWRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHdlIHdpbGwgZ3JhYiBlYWNoIGFwcHJvcHJpYXRlIGNoYXJhY3RlciBvdXQgb2Ygb3VyIGtleXN0cmluZ1xuICAgICAgICAgICAgLy8gYmFzZWQgb24gb3VyIGluZGV4IGFycmF5IGFuZCBhcHBlbmQgaXQgdG8gdGhlIG91dHB1dCBzdHJpbmdcbiAgICAgICAgICAgIGZvciAoam54ID0gMDsgam54IDwgZW5jb2RlZENoYXJJbmRleGVzLmxlbmd0aDsgam54KyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gdGhpcy5fa2V5U3RyLmNoYXJBdChlbmNvZGVkQ2hhckluZGV4ZXNbam54XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL0xvYWRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cy5SZXNvdXJjZSA9IHJlcXVpcmUoJy4vUmVzb3VyY2UnKTtcblxubW9kdWxlLmV4cG9ydHMubWlkZGxld2FyZSA9IHtcbiAgICBjYWNoaW5nOiB7XG4gICAgICAgIG1lbW9yeTogcmVxdWlyZSgnLi9taWRkbGV3YXJlcy9jYWNoaW5nL21lbW9yeScpXG4gICAgfSxcbiAgICBwYXJzaW5nOiB7XG4gICAgICAgIGJsb2I6IHJlcXVpcmUoJy4vbWlkZGxld2FyZXMvcGFyc2luZy9ibG9iJylcbiAgICB9XG59O1xuIiwiLy8gYSBzaW1wbGUgaW4tbWVtb3J5IGNhY2hlIGZvciByZXNvdXJjZXNcbnZhciBjYWNoZSA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlc291cmNlLCBuZXh0KSB7XG4gICAgICAgIC8vIGlmIGNhY2hlZCwgdGhlbiBzZXQgZGF0YSBhbmQgY29tcGxldGUgdGhlIHJlc291cmNlXG4gICAgICAgIGlmIChjYWNoZVtyZXNvdXJjZS51cmxdKSB7XG4gICAgICAgICAgICByZXNvdXJjZS5kYXRhID0gY2FjaGVbcmVzb3VyY2UudXJsXTtcbiAgICAgICAgICAgIHJlc291cmNlLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgbm90IGNhY2hlZCwgd2FpdCBmb3IgY29tcGxldGUgYW5kIHN0b3JlIGl0IGluIHRoZSBjYWNoZS5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXNvdXJjZS5vbmNlKCdjb21wbGV0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgIGNhY2hlW3RoaXMudXJsXSA9IHRoaXMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbiIsInZhciBSZXNvdXJjZSA9IHJlcXVpcmUoJy4uLy4uL1Jlc291cmNlJyksXG4gICAgYjY0ID0gcmVxdWlyZSgnLi4vLi4vYjY0Jyk7XG5cbndpbmRvdy5VUkwgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG5cbi8vIGEgbWlkZGxld2FyZSBmb3IgdHJhbnNmb3JtaW5nIFhIUiBsb2FkZWQgQmxvYnMgaW50byBtb3JlIHVzZWZ1bCBvYmplY3RzXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAocmVzb3VyY2UsIG5leHQpIHtcbiAgICAgICAgaWYgKCFyZXNvdXJjZS5kYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgdGhpcyB3YXMgYW4gWEhSIGxvYWQgb2YgYSBibG9iXG4gICAgICAgIGlmIChyZXNvdXJjZS54aHIgJiYgcmVzb3VyY2UueGhyVHlwZSA9PT0gUmVzb3VyY2UuWEhSX1JFU1BPTlNFX1RZUEUuQkxPQikge1xuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gYmxvYiBzdXBwb3J0IHdlIHByb2JhYmx5IGdvdCBhIGJpbmFyeSBzdHJpbmcgYmFja1xuICAgICAgICAgICAgaWYgKCF3aW5kb3cuQmxvYiB8fCB0eXBlb2YgcmVzb3VyY2UuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IHJlc291cmNlLnhoci5nZXRSZXNwb25zZUhlYWRlcignY29udGVudC10eXBlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFuIGltYWdlLCBjb252ZXJ0IHRoZSBiaW5hcnkgc3RyaW5nIGludG8gYSBkYXRhIHVybFxuICAgICAgICAgICAgICAgIGlmICh0eXBlICYmIHR5cGUuaW5kZXhPZignaW1hZ2UnKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZS5kYXRhID0gbmV3IEltYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlLmRhdGEuc3JjID0gJ2RhdGE6JyArIHR5cGUgKyAnO2Jhc2U2NCwnICsgYjY0LmVuY29kZUJpbmFyeShyZXNvdXJjZS54aHIucmVzcG9uc2VUZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZS5pc0ltYWdlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IHVudGlsIHRoZSBpbWFnZSBsb2FkcyBhbmQgdGhlbiBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZS5kYXRhLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlLmRhdGEub25sb2FkID0gbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmIGNvbnRlbnQgdHlwZSBzYXlzIHRoaXMgaXMgYW4gaW1hZ2UsIHRoZW4gd2Ugc2hvdWxkIHRyYW5zZm9ybSB0aGUgYmxvYiBpbnRvIGFuIEltYWdlIG9iamVjdFxuICAgICAgICAgICAgZWxzZSBpZiAocmVzb3VyY2UuZGF0YS50eXBlLmluZGV4T2YoJ2ltYWdlJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChyZXNvdXJjZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIHJlc291cmNlLmJsb2IgPSByZXNvdXJjZS5kYXRhO1xuICAgICAgICAgICAgICAgIHJlc291cmNlLmRhdGEgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICByZXNvdXJjZS5kYXRhLnNyYyA9IHNyYztcblxuICAgICAgICAgICAgICAgIHJlc291cmNlLmlzSW1hZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgLy8gY2xlYW51cCB0aGUgbm8gbG9uZ2VyIHVzZWQgYmxvYiBhZnRlciB0aGUgaW1hZ2UgbG9hZHNcbiAgICAgICAgICAgICAgICByZXNvdXJjZS5kYXRhLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChzcmMpO1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZS5kYXRhLm9ubG9hZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSBmdW5jdGlvbiAobmFtZSwgdGltZWxpbmVzLCBkdXJhdGlvbilcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMudGltZWxpbmVzID0gdGltZWxpbmVzO1xyXG4gICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xyXG59O1xyXG5zcGluZS5BbmltYXRpb24ucHJvdG90eXBlID0ge1xyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGxvb3AsIGV2ZW50cylcclxuICAgIHtcclxuICAgICAgICBpZiAobG9vcCAmJiB0aGlzLmR1cmF0aW9uICE9IDApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aW1lICU9IHRoaXMuZHVyYXRpb247XHJcbiAgICAgICAgICAgIGxhc3RUaW1lICU9IHRoaXMuZHVyYXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB0aW1lbGluZXMgPSB0aGlzLnRpbWVsaW5lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHRpbWVsaW5lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIHRpbWVsaW5lc1tpXS5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGV2ZW50cywgMSk7XHJcbiAgICB9LFxyXG4gICAgbWl4OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBsb29wLCBldmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIGlmIChsb29wICYmIHRoaXMuZHVyYXRpb24gIT0gMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpbWUgJT0gdGhpcy5kdXJhdGlvbjtcclxuICAgICAgICAgICAgbGFzdFRpbWUgJT0gdGhpcy5kdXJhdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHRpbWVsaW5lcyA9IHRoaXMudGltZWxpbmVzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGltZWxpbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgdGltZWxpbmVzW2ldLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZXZlbnRzLCBhbHBoYSk7XHJcbiAgICB9XHJcbn07XHJcbnNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2ggPSBmdW5jdGlvbiAodmFsdWVzLCB0YXJnZXQsIHN0ZXApXHJcbntcclxuICAgIHZhciBsb3cgPSAwO1xyXG4gICAgdmFyIGhpZ2ggPSBNYXRoLmZsb29yKHZhbHVlcy5sZW5ndGggLyBzdGVwKSAtIDI7XHJcbiAgICBpZiAoIWhpZ2gpIHJldHVybiBzdGVwO1xyXG4gICAgdmFyIGN1cnJlbnQgPSBoaWdoID4+PiAxO1xyXG4gICAgd2hpbGUgKHRydWUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHZhbHVlc1soY3VycmVudCArIDEpICogc3RlcF0gPD0gdGFyZ2V0KVxyXG4gICAgICAgICAgICBsb3cgPSBjdXJyZW50ICsgMTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGhpZ2ggPSBjdXJyZW50O1xyXG4gICAgICAgIGlmIChsb3cgPT0gaGlnaCkgcmV0dXJuIChsb3cgKyAxKSAqIHN0ZXA7XHJcbiAgICAgICAgY3VycmVudCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcclxuICAgIH1cclxufTtcclxuc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaDEgPSBmdW5jdGlvbiAodmFsdWVzLCB0YXJnZXQpXHJcbntcclxuICAgIHZhciBsb3cgPSAwO1xyXG4gICAgdmFyIGhpZ2ggPSB2YWx1ZXMubGVuZ3RoIC0gMjtcclxuICAgIGlmICghaGlnaCkgcmV0dXJuIDE7XHJcbiAgICB2YXIgY3VycmVudCA9IGhpZ2ggPj4+IDE7XHJcbiAgICB3aGlsZSAodHJ1ZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodmFsdWVzW2N1cnJlbnQgKyAxXSA8PSB0YXJnZXQpXHJcbiAgICAgICAgICAgIGxvdyA9IGN1cnJlbnQgKyAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgaGlnaCA9IGN1cnJlbnQ7XHJcbiAgICAgICAgaWYgKGxvdyA9PSBoaWdoKSByZXR1cm4gbG93ICsgMTtcclxuICAgICAgICBjdXJyZW50ID0gKGxvdyArIGhpZ2gpID4+PiAxO1xyXG4gICAgfVxyXG59O1xyXG5zcGluZS5BbmltYXRpb24ubGluZWFyU2VhcmNoID0gZnVuY3Rpb24gKHZhbHVlcywgdGFyZ2V0LCBzdGVwKVxyXG57XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGFzdCA9IHZhbHVlcy5sZW5ndGggLSBzdGVwOyBpIDw9IGxhc3Q7IGkgKz0gc3RlcClcclxuICAgICAgICBpZiAodmFsdWVzW2ldID4gdGFyZ2V0KSByZXR1cm4gaTtcclxuICAgIHJldHVybiAtMTtcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BbmltYXRpb247XHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5UcmFja0VudHJ5ID0gcmVxdWlyZSgnLi9UcmFja0VudHJ5Jyk7XHJcbnNwaW5lLkFuaW1hdGlvblN0YXRlID0gZnVuY3Rpb24gKHN0YXRlRGF0YSlcclxue1xyXG4gICAgdGhpcy5kYXRhID0gc3RhdGVEYXRhO1xyXG4gICAgdGhpcy50cmFja3MgPSBbXTtcclxuICAgIHRoaXMuZXZlbnRzID0gW107XHJcbn07XHJcbnNwaW5lLkFuaW1hdGlvblN0YXRlLnByb3RvdHlwZSA9IHtcclxuICAgIG9uU3RhcnQ6IG51bGwsXHJcbiAgICBvbkVuZDogbnVsbCxcclxuICAgIG9uQ29tcGxldGU6IG51bGwsXHJcbiAgICBvbkV2ZW50OiBudWxsLFxyXG4gICAgdGltZVNjYWxlOiAxLFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZGVsdGEpXHJcbiAgICB7XHJcbiAgICAgICAgZGVsdGEgKj0gdGhpcy50aW1lU2NhbGU7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyYWNrcy5sZW5ndGg7IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50ID0gdGhpcy50cmFja3NbaV07XHJcbiAgICAgICAgICAgIGlmICghY3VycmVudCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjdXJyZW50LnRpbWUgKz0gZGVsdGEgKiBjdXJyZW50LnRpbWVTY2FsZTtcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnQucHJldmlvdXMpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c0RlbHRhID0gZGVsdGEgKiBjdXJyZW50LnByZXZpb3VzLnRpbWVTY2FsZTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQucHJldmlvdXMudGltZSArPSBwcmV2aW91c0RlbHRhO1xyXG4gICAgICAgICAgICAgICAgY3VycmVudC5taXhUaW1lICs9IHByZXZpb3VzRGVsdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBuZXh0ID0gY3VycmVudC5uZXh0O1xyXG4gICAgICAgICAgICBpZiAobmV4dClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmV4dC50aW1lID0gY3VycmVudC5sYXN0VGltZSAtIG5leHQuZGVsYXk7XHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dC50aW1lID49IDApIHRoaXMuc2V0Q3VycmVudChpLCBuZXh0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEVuZCBub24tbG9vcGluZyBhbmltYXRpb24gd2hlbiBpdCByZWFjaGVzIGl0cyBlbmQgdGltZSBhbmQgdGhlcmUgaXMgbm8gbmV4dCBlbnRyeS5cclxuICAgICAgICAgICAgICAgIGlmICghY3VycmVudC5sb29wICYmIGN1cnJlbnQubGFzdFRpbWUgPj0gY3VycmVudC5lbmRUaW1lKSB0aGlzLmNsZWFyVHJhY2soaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbilcclxuICAgIHtcclxuICAgICAgICBza2VsZXRvbi5yZXNldERyYXdPcmRlcigpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudHJhY2tzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRyYWNrc1tpXTtcclxuICAgICAgICAgICAgaWYgKCFjdXJyZW50KSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgICAgICAgICB2YXIgdGltZSA9IGN1cnJlbnQudGltZTtcclxuICAgICAgICAgICAgdmFyIGxhc3RUaW1lID0gY3VycmVudC5sYXN0VGltZTtcclxuICAgICAgICAgICAgdmFyIGVuZFRpbWUgPSBjdXJyZW50LmVuZFRpbWU7XHJcbiAgICAgICAgICAgIHZhciBsb29wID0gY3VycmVudC5sb29wO1xyXG4gICAgICAgICAgICBpZiAoIWxvb3AgJiYgdGltZSA+IGVuZFRpbWUpIHRpbWUgPSBlbmRUaW1lO1xyXG5cclxuICAgICAgICAgICAgdmFyIHByZXZpb3VzID0gY3VycmVudC5wcmV2aW91cztcclxuICAgICAgICAgICAgaWYgKCFwcmV2aW91cylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQubWl4ID09IDEpXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudC5hbmltYXRpb24uYXBwbHkoc2tlbGV0b24sIGN1cnJlbnQubGFzdFRpbWUsIHRpbWUsIGxvb3AsIHRoaXMuZXZlbnRzKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50LmFuaW1hdGlvbi5taXgoc2tlbGV0b24sIGN1cnJlbnQubGFzdFRpbWUsIHRpbWUsIGxvb3AsIHRoaXMuZXZlbnRzLCBjdXJyZW50Lm1peCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNUaW1lID0gcHJldmlvdXMudGltZTtcclxuICAgICAgICAgICAgICAgIGlmICghcHJldmlvdXMubG9vcCAmJiBwcmV2aW91c1RpbWUgPiBwcmV2aW91cy5lbmRUaW1lKSBwcmV2aW91c1RpbWUgPSBwcmV2aW91cy5lbmRUaW1lO1xyXG4gICAgICAgICAgICAgICAgcHJldmlvdXMuYW5pbWF0aW9uLmFwcGx5KHNrZWxldG9uLCBwcmV2aW91c1RpbWUsIHByZXZpb3VzVGltZSwgcHJldmlvdXMubG9vcCwgbnVsbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGFscGhhID0gY3VycmVudC5taXhUaW1lIC8gY3VycmVudC5taXhEdXJhdGlvbiAqIGN1cnJlbnQubWl4O1xyXG4gICAgICAgICAgICAgICAgaWYgKGFscGhhID49IDEpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxwaGEgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQucHJldmlvdXMgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY3VycmVudC5hbmltYXRpb24ubWl4KHNrZWxldG9uLCBjdXJyZW50Lmxhc3RUaW1lLCB0aW1lLCBsb29wLCB0aGlzLmV2ZW50cywgYWxwaGEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IDAsIG5uID0gdGhpcy5ldmVudHMubGVuZ3RoOyBpaSA8IG5uOyBpaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLmV2ZW50c1tpaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5vbkV2ZW50KSBjdXJyZW50Lm9uRXZlbnQoaSwgZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25FdmVudCkgdGhpcy5vbkV2ZW50KGksIGV2ZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY29tcGxldGVkIHRoZSBhbmltYXRpb24gb3IgYSBsb29wIGl0ZXJhdGlvbi5cclxuICAgICAgICAgICAgaWYgKGxvb3AgPyAobGFzdFRpbWUgJSBlbmRUaW1lID4gdGltZSAlIGVuZFRpbWUpIDogKGxhc3RUaW1lIDwgZW5kVGltZSAmJiB0aW1lID49IGVuZFRpbWUpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY291bnQgPSBNYXRoLmZsb29yKHRpbWUgLyBlbmRUaW1lKTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Lm9uQ29tcGxldGUpIGN1cnJlbnQub25Db21wbGV0ZShpLCBjb3VudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vbkNvbXBsZXRlKSB0aGlzLm9uQ29tcGxldGUoaSwgY291bnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjdXJyZW50Lmxhc3RUaW1lID0gY3VycmVudC50aW1lO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjbGVhclRyYWNrczogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHRoaXMudHJhY2tzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgdGhpcy5jbGVhclRyYWNrKGkpO1xyXG4gICAgICAgIHRoaXMudHJhY2tzLmxlbmd0aCA9IDA7XHJcbiAgICB9LFxyXG4gICAgY2xlYXJUcmFjazogZnVuY3Rpb24gKHRyYWNrSW5kZXgpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRyYWNrSW5kZXggPj0gdGhpcy50cmFja3MubGVuZ3RoKSByZXR1cm47XHJcbiAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRyYWNrc1t0cmFja0luZGV4XTtcclxuICAgICAgICBpZiAoIWN1cnJlbnQpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYgKGN1cnJlbnQub25FbmQpIGN1cnJlbnQub25FbmQodHJhY2tJbmRleCk7XHJcbiAgICAgICAgaWYgKHRoaXMub25FbmQpIHRoaXMub25FbmQodHJhY2tJbmRleCk7XHJcblxyXG4gICAgICAgIHRoaXMudHJhY2tzW3RyYWNrSW5kZXhdID0gbnVsbDtcclxuICAgIH0sXHJcbiAgICBfZXhwYW5kVG9JbmRleDogZnVuY3Rpb24gKGluZGV4KVxyXG4gICAge1xyXG4gICAgICAgIGlmIChpbmRleCA8IHRoaXMudHJhY2tzLmxlbmd0aCkgcmV0dXJuIHRoaXMudHJhY2tzW2luZGV4XTtcclxuICAgICAgICB3aGlsZSAoaW5kZXggPj0gdGhpcy50cmFja3MubGVuZ3RoKVxyXG4gICAgICAgICAgICB0aGlzLnRyYWNrcy5wdXNoKG51bGwpO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIHNldEN1cnJlbnQ6IGZ1bmN0aW9uIChpbmRleCwgZW50cnkpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLl9leHBhbmRUb0luZGV4KGluZGV4KTtcclxuICAgICAgICBpZiAoY3VycmVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBwcmV2aW91cyA9IGN1cnJlbnQucHJldmlvdXM7XHJcbiAgICAgICAgICAgIGN1cnJlbnQucHJldmlvdXMgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgaWYgKGN1cnJlbnQub25FbmQpIGN1cnJlbnQub25FbmQoaW5kZXgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vbkVuZCkgdGhpcy5vbkVuZChpbmRleCk7XHJcblxyXG4gICAgICAgICAgICBlbnRyeS5taXhEdXJhdGlvbiA9IHRoaXMuZGF0YS5nZXRNaXgoY3VycmVudC5hbmltYXRpb24sIGVudHJ5LmFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5taXhEdXJhdGlvbiA+IDApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGVudHJ5Lm1peFRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgYSBtaXggaXMgaW4gcHJvZ3Jlc3MsIG1peCBmcm9tIHRoZSBjbG9zZXN0IGFuaW1hdGlvbi5cclxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91cyAmJiBjdXJyZW50Lm1peFRpbWUgLyBjdXJyZW50Lm1peER1cmF0aW9uIDwgMC41KVxyXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LnByZXZpb3VzID0gcHJldmlvdXM7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgZW50cnkucHJldmlvdXMgPSBjdXJyZW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRyYWNrc1tpbmRleF0gPSBlbnRyeTtcclxuXHJcbiAgICAgICAgaWYgKGVudHJ5Lm9uU3RhcnQpIGVudHJ5Lm9uU3RhcnQoaW5kZXgpO1xyXG4gICAgICAgIGlmICh0aGlzLm9uU3RhcnQpIHRoaXMub25TdGFydChpbmRleCk7XHJcbiAgICB9LFxyXG4gICAgc2V0QW5pbWF0aW9uQnlOYW1lOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uTmFtZSwgbG9vcClcclxuICAgIHtcclxuICAgICAgICB2YXIgYW5pbWF0aW9uID0gdGhpcy5kYXRhLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGFuaW1hdGlvbk5hbWUpO1xyXG4gICAgICAgIGlmICghYW5pbWF0aW9uKSB0aHJvdyBcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiICsgYW5pbWF0aW9uTmFtZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBbmltYXRpb24odHJhY2tJbmRleCwgYW5pbWF0aW9uLCBsb29wKTtcclxuICAgIH0sXHJcbiAgICAvKiogU2V0IHRoZSBjdXJyZW50IGFuaW1hdGlvbi4gQW55IHF1ZXVlZCBhbmltYXRpb25zIGFyZSBjbGVhcmVkLiAqL1xyXG4gICAgc2V0QW5pbWF0aW9uOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uLCBsb29wKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBlbnRyeSA9IG5ldyBzcGluZS5UcmFja0VudHJ5KCk7XHJcbiAgICAgICAgZW50cnkuYW5pbWF0aW9uID0gYW5pbWF0aW9uO1xyXG4gICAgICAgIGVudHJ5Lmxvb3AgPSBsb29wO1xyXG4gICAgICAgIGVudHJ5LmVuZFRpbWUgPSBhbmltYXRpb24uZHVyYXRpb247XHJcbiAgICAgICAgdGhpcy5zZXRDdXJyZW50KHRyYWNrSW5kZXgsIGVudHJ5KTtcclxuICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICB9LFxyXG4gICAgYWRkQW5pbWF0aW9uQnlOYW1lOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uTmFtZSwgbG9vcCwgZGVsYXkpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGFuaW1hdGlvbiA9IHRoaXMuZGF0YS5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhbmltYXRpb25OYW1lKTtcclxuICAgICAgICBpZiAoIWFuaW1hdGlvbikgdGhyb3cgXCJBbmltYXRpb24gbm90IGZvdW5kOiBcIiArIGFuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQW5pbWF0aW9uKHRyYWNrSW5kZXgsIGFuaW1hdGlvbiwgbG9vcCwgZGVsYXkpO1xyXG4gICAgfSxcclxuICAgIC8qKiBBZGRzIGFuIGFuaW1hdGlvbiB0byBiZSBwbGF5ZWQgZGVsYXkgc2Vjb25kcyBhZnRlciB0aGUgY3VycmVudCBvciBsYXN0IHF1ZXVlZCBhbmltYXRpb24uXHJcbiAgICAgKiBAcGFyYW0gZGVsYXkgTWF5IGJlIDw9IDAgdG8gdXNlIGR1cmF0aW9uIG9mIHByZXZpb3VzIGFuaW1hdGlvbiBtaW51cyBhbnkgbWl4IGR1cmF0aW9uIHBsdXMgdGhlIG5lZ2F0aXZlIGRlbGF5LiAqL1xyXG4gICAgYWRkQW5pbWF0aW9uOiBmdW5jdGlvbiAodHJhY2tJbmRleCwgYW5pbWF0aW9uLCBsb29wLCBkZWxheSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZW50cnkgPSBuZXcgc3BpbmUuVHJhY2tFbnRyeSgpO1xyXG4gICAgICAgIGVudHJ5LmFuaW1hdGlvbiA9IGFuaW1hdGlvbjtcclxuICAgICAgICBlbnRyeS5sb29wID0gbG9vcDtcclxuICAgICAgICBlbnRyeS5lbmRUaW1lID0gYW5pbWF0aW9uLmR1cmF0aW9uO1xyXG5cclxuICAgICAgICB2YXIgbGFzdCA9IHRoaXMuX2V4cGFuZFRvSW5kZXgodHJhY2tJbmRleCk7XHJcbiAgICAgICAgaWYgKGxhc3QpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB3aGlsZSAobGFzdC5uZXh0KVxyXG4gICAgICAgICAgICAgICAgbGFzdCA9IGxhc3QubmV4dDtcclxuICAgICAgICAgICAgbGFzdC5uZXh0ID0gZW50cnk7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tzW3RyYWNrSW5kZXhdID0gZW50cnk7XHJcblxyXG4gICAgICAgIGlmIChkZWxheSA8PSAwKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGxhc3QpXHJcbiAgICAgICAgICAgICAgICBkZWxheSArPSBsYXN0LmVuZFRpbWUgLSB0aGlzLmRhdGEuZ2V0TWl4KGxhc3QuYW5pbWF0aW9uLCBhbmltYXRpb24pO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBkZWxheSA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudHJ5LmRlbGF5ID0gZGVsYXk7XHJcblxyXG4gICAgICAgIHJldHVybiBlbnRyeTtcclxuICAgIH0sXHJcbiAgICAvKiogTWF5IGJlIG51bGwuICovXHJcbiAgICBnZXRDdXJyZW50OiBmdW5jdGlvbiAodHJhY2tJbmRleClcclxuICAgIHtcclxuICAgICAgICBpZiAodHJhY2tJbmRleCA+PSB0aGlzLnRyYWNrcy5sZW5ndGgpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRyYWNrc1t0cmFja0luZGV4XTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BbmltYXRpb25TdGF0ZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZURhdGEgPSBmdW5jdGlvbiAoc2tlbGV0b25EYXRhKVxyXG57XHJcbiAgICB0aGlzLnNrZWxldG9uRGF0YSA9IHNrZWxldG9uRGF0YTtcclxuICAgIHRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lID0ge307XHJcbn07XHJcbnNwaW5lLkFuaW1hdGlvblN0YXRlRGF0YS5wcm90b3R5cGUgPSB7XHJcbiAgICBkZWZhdWx0TWl4OiAwLFxyXG4gICAgc2V0TWl4QnlOYW1lOiBmdW5jdGlvbiAoZnJvbU5hbWUsIHRvTmFtZSwgZHVyYXRpb24pXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyb20gPSB0aGlzLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGZyb21OYW1lKTtcclxuICAgICAgICBpZiAoIWZyb20pIHRocm93IFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyBmcm9tTmFtZTtcclxuICAgICAgICB2YXIgdG8gPSB0aGlzLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKHRvTmFtZSk7XHJcbiAgICAgICAgaWYgKCF0bykgdGhyb3cgXCJBbmltYXRpb24gbm90IGZvdW5kOiBcIiArIHRvTmFtZTtcclxuICAgICAgICB0aGlzLnNldE1peChmcm9tLCB0bywgZHVyYXRpb24pO1xyXG4gICAgfSxcclxuICAgIHNldE1peDogZnVuY3Rpb24gKGZyb20sIHRvLCBkdXJhdGlvbilcclxuICAgIHtcclxuICAgICAgICB0aGlzLmFuaW1hdGlvblRvTWl4VGltZVtmcm9tLm5hbWUgKyBcIjpcIiArIHRvLm5hbWVdID0gZHVyYXRpb247XHJcbiAgICB9LFxyXG4gICAgZ2V0TWl4OiBmdW5jdGlvbiAoZnJvbSwgdG8pXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGtleSA9IGZyb20ubmFtZSArIFwiOlwiICsgdG8ubmFtZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hbmltYXRpb25Ub01peFRpbWUuaGFzT3duUHJvcGVydHkoa2V5KSA/IHRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lW2tleV0gOiB0aGlzLmRlZmF1bHRNaXg7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0bGFzUmVhZGVyID0gcmVxdWlyZSgnLi9BdGxhc1JlYWRlcicpO1xyXG5zcGluZS5BdGxhc1BhZ2UgPSByZXF1aXJlKCcuL0F0bGFzUGFnZScpO1xyXG5zcGluZS5BdGxhc1JlZ2lvbiA9IHJlcXVpcmUoJy4vQXRsYXNSZWdpb24nKTtcclxudmFyIFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJyk7XHJcbnNwaW5lLkF0bGFzID0gZnVuY3Rpb24gKGF0bGFzVGV4dCwgYmFzZVVybCwgY3Jvc3NPcmlnaW4pXHJcbntcclxuICAgIGlmIChiYXNlVXJsICYmIGJhc2VVcmwuaW5kZXhPZignLycpICE9PSBiYXNlVXJsLmxlbmd0aClcclxuICAgIHtcclxuICAgICAgICBiYXNlVXJsICs9ICcvJztcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnBhZ2VzID0gW107XHJcbiAgICB0aGlzLnJlZ2lvbnMgPSBbXTtcclxuXHJcbiAgICB0aGlzLnRleHR1cmVzTG9hZGluZyA9IDA7XHJcblxyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciByZWFkZXIgPSBuZXcgc3BpbmUuQXRsYXNSZWFkZXIoYXRsYXNUZXh0KTtcclxuICAgIHZhciB0dXBsZSA9IFtdO1xyXG4gICAgdHVwbGUubGVuZ3RoID0gNDtcclxuICAgIHZhciBwYWdlID0gbnVsbDtcclxuICAgIHdoaWxlICh0cnVlKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBsaW5lID0gcmVhZGVyLnJlYWRMaW5lKCk7XHJcbiAgICAgICAgaWYgKGxpbmUgPT09IG51bGwpIGJyZWFrO1xyXG4gICAgICAgIGxpbmUgPSByZWFkZXIudHJpbShsaW5lKTtcclxuICAgICAgICBpZiAoIWxpbmUubGVuZ3RoKVxyXG4gICAgICAgICAgICBwYWdlID0gbnVsbDtcclxuICAgICAgICBlbHNlIGlmICghcGFnZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHBhZ2UgPSBuZXcgc3BpbmUuQXRsYXNQYWdlKCk7XHJcbiAgICAgICAgICAgIHBhZ2UubmFtZSA9IGxpbmU7XHJcblxyXG4gICAgICAgICAgICBpZiAocmVhZGVyLnJlYWRUdXBsZSh0dXBsZSkgPT0gMilcclxuICAgICAgICAgICAgeyAvLyBzaXplIGlzIG9ubHkgb3B0aW9uYWwgZm9yIGFuIGF0bGFzIHBhY2tlZCB3aXRoIGFuIG9sZCBUZXh0dXJlUGFja2VyLlxyXG4gICAgICAgICAgICAgICAgcGFnZS53aWR0aCA9IHBhcnNlSW50KHR1cGxlWzBdKTtcclxuICAgICAgICAgICAgICAgIHBhZ2UuaGVpZ2h0ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFnZS5mb3JtYXQgPSBzcGluZS5BdGxhcy5Gb3JtYXRbdHVwbGVbMF1dO1xyXG5cclxuICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XHJcbiAgICAgICAgICAgIHBhZ2UubWluRmlsdGVyID0gc3BpbmUuQXRsYXMuVGV4dHVyZUZpbHRlclt0dXBsZVswXV07XHJcbiAgICAgICAgICAgIHBhZ2UubWFnRmlsdGVyID0gc3BpbmUuQXRsYXMuVGV4dHVyZUZpbHRlclt0dXBsZVsxXV07XHJcblxyXG4gICAgICAgICAgICB2YXIgZGlyZWN0aW9uID0gcmVhZGVyLnJlYWRWYWx1ZSgpO1xyXG4gICAgICAgICAgICBwYWdlLnVXcmFwID0gc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAuY2xhbXBUb0VkZ2U7XHJcbiAgICAgICAgICAgIHBhZ2UudldyYXAgPSBzcGluZS5BdGxhcy5UZXh0dXJlV3JhcC5jbGFtcFRvRWRnZTtcclxuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PSBcInhcIilcclxuICAgICAgICAgICAgICAgIHBhZ2UudVdyYXAgPSBzcGluZS5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBcInlcIilcclxuICAgICAgICAgICAgICAgIHBhZ2UudldyYXAgPSBzcGluZS5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSBcInh5XCIpXHJcbiAgICAgICAgICAgICAgICBwYWdlLnVXcmFwID0gcGFnZS52V3JhcCA9IHNwaW5lLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdDtcclxuXHJcbiAgICAgICAgICAgIHBhZ2UucmVuZGVyZXJPYmplY3QgPSBQSVhJLkJhc2VUZXh0dXJlLmZyb21JbWFnZShiYXNlVXJsICsgbGluZSwgY3Jvc3NPcmlnaW4pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wYWdlcy5wdXNoKHBhZ2UpO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gbmV3IHNwaW5lLkF0bGFzUmVnaW9uKCk7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5uYW1lID0gbGluZTtcclxuICAgICAgICAgICAgcmVnaW9uLnBhZ2UgPSBwYWdlO1xyXG5cclxuICAgICAgICAgICAgcmVnaW9uLnJvdGF0ZSA9IHJlYWRlci5yZWFkVmFsdWUoKSA9PSBcInRydWVcIjtcclxuXHJcbiAgICAgICAgICAgIHJlYWRlci5yZWFkVHVwbGUodHVwbGUpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IHBhcnNlSW50KHR1cGxlWzBdKTtcclxuICAgICAgICAgICAgdmFyIHkgPSBwYXJzZUludCh0dXBsZVsxXSk7XHJcblxyXG4gICAgICAgICAgICByZWFkZXIucmVhZFR1cGxlKHR1cGxlKTtcclxuICAgICAgICAgICAgdmFyIHdpZHRoID0gcGFyc2VJbnQodHVwbGVbMF0pO1xyXG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gcGFyc2VJbnQodHVwbGVbMV0pO1xyXG5cclxuICAgICAgICAgICAgcmVnaW9uLnUgPSB4IC8gcGFnZS53aWR0aDtcclxuICAgICAgICAgICAgcmVnaW9uLnYgPSB5IC8gcGFnZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgIGlmIChyZWdpb24ucm90YXRlKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByZWdpb24udTIgPSAoeCArIGhlaWdodCkgLyBwYWdlLndpZHRoO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnYyID0gKHkgKyB3aWR0aCkgLyBwYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi51MiA9ICh4ICsgd2lkdGgpIC8gcGFnZS53aWR0aDtcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi52MiA9ICh5ICsgaGVpZ2h0KSAvIHBhZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlZ2lvbi54ID0geDtcclxuICAgICAgICAgICAgcmVnaW9uLnkgPSB5O1xyXG4gICAgICAgICAgICByZWdpb24ud2lkdGggPSBNYXRoLmFicyh3aWR0aCk7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5oZWlnaHQgPSBNYXRoLmFicyhoZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlYWRlci5yZWFkVHVwbGUodHVwbGUpID09IDQpXHJcbiAgICAgICAgICAgIHsgLy8gc3BsaXQgaXMgb3B0aW9uYWxcclxuICAgICAgICAgICAgICAgIHJlZ2lvbi5zcGxpdHMgPSBbcGFyc2VJbnQodHVwbGVbMF0pLCBwYXJzZUludCh0dXBsZVsxXSksIHBhcnNlSW50KHR1cGxlWzJdKSwgcGFyc2VJbnQodHVwbGVbM10pXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVhZGVyLnJlYWRUdXBsZSh0dXBsZSkgPT0gNClcclxuICAgICAgICAgICAgICAgIHsgLy8gcGFkIGlzIG9wdGlvbmFsLCBidXQgb25seSBwcmVzZW50IHdpdGggc3BsaXRzXHJcbiAgICAgICAgICAgICAgICAgICAgcmVnaW9uLnBhZHMgPSBbcGFyc2VJbnQodHVwbGVbMF0pLCBwYXJzZUludCh0dXBsZVsxXSksIHBhcnNlSW50KHR1cGxlWzJdKSwgcGFyc2VJbnQodHVwbGVbM10pXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRUdXBsZSh0dXBsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlZ2lvbi5vcmlnaW5hbFdpZHRoID0gcGFyc2VJbnQodHVwbGVbMF0pO1xyXG4gICAgICAgICAgICByZWdpb24ub3JpZ2luYWxIZWlnaHQgPSBwYXJzZUludCh0dXBsZVsxXSk7XHJcblxyXG4gICAgICAgICAgICByZWFkZXIucmVhZFR1cGxlKHR1cGxlKTtcclxuICAgICAgICAgICAgcmVnaW9uLm9mZnNldFggPSBwYXJzZUludCh0dXBsZVswXSk7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5vZmZzZXRZID0gcGFyc2VJbnQodHVwbGVbMV0pO1xyXG5cclxuICAgICAgICAgICAgcmVnaW9uLmluZGV4ID0gcGFyc2VJbnQocmVhZGVyLnJlYWRWYWx1ZSgpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVnaW9ucy5wdXNoKHJlZ2lvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5zcGluZS5BdGxhcy5wcm90b3R5cGUgPSB7XHJcbiAgICBmaW5kUmVnaW9uOiBmdW5jdGlvbiAobmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgcmVnaW9ucyA9IHRoaXMucmVnaW9ucztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHJlZ2lvbnMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAocmVnaW9uc1tpXS5uYW1lID09IG5hbWUpIHJldHVybiByZWdpb25zW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIGRpc3Bvc2U6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHBhZ2VzID0gdGhpcy5wYWdlcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBhZ2VzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgcGFnZXNbaV0ucmVuZGVyZXJPYmplY3QuZGVzdHJveSh0cnVlKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGVVVnM6IGZ1bmN0aW9uIChwYWdlKVxyXG4gICAge1xyXG4gICAgICAgIHZhciByZWdpb25zID0gdGhpcy5yZWdpb25zO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gcmVnaW9ucy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gcmVnaW9uc1tpXTtcclxuICAgICAgICAgICAgaWYgKHJlZ2lvbi5wYWdlICE9IHBhZ2UpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICByZWdpb24udSA9IHJlZ2lvbi54IC8gcGFnZS53aWR0aDtcclxuICAgICAgICAgICAgcmVnaW9uLnYgPSByZWdpb24ueSAvIHBhZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICBpZiAocmVnaW9uLnJvdGF0ZSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnUyID0gKHJlZ2lvbi54ICsgcmVnaW9uLmhlaWdodCkgLyBwYWdlLndpZHRoO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnYyID0gKHJlZ2lvbi55ICsgcmVnaW9uLndpZHRoKSAvIHBhZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnUyID0gKHJlZ2lvbi54ICsgcmVnaW9uLndpZHRoKSAvIHBhZ2Uud2lkdGg7XHJcbiAgICAgICAgICAgICAgICByZWdpb24udjIgPSAocmVnaW9uLnkgKyByZWdpb24uaGVpZ2h0KSAvIHBhZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuc3BpbmUuQXRsYXMuRm9ybWF0ID0ge1xyXG4gICAgYWxwaGE6IDAsXHJcbiAgICBpbnRlbnNpdHk6IDEsXHJcbiAgICBsdW1pbmFuY2VBbHBoYTogMixcclxuICAgIHJnYjU2NTogMyxcclxuICAgIHJnYmE0NDQ0OiA0LFxyXG4gICAgcmdiODg4OiA1LFxyXG4gICAgcmdiYTg4ODg6IDZcclxufTtcclxuXHJcbnNwaW5lLkF0bGFzLlRleHR1cmVGaWx0ZXIgPSB7XHJcbiAgICBuZWFyZXN0OiAwLFxyXG4gICAgbGluZWFyOiAxLFxyXG4gICAgbWlwTWFwOiAyLFxyXG4gICAgbWlwTWFwTmVhcmVzdE5lYXJlc3Q6IDMsXHJcbiAgICBtaXBNYXBMaW5lYXJOZWFyZXN0OiA0LFxyXG4gICAgbWlwTWFwTmVhcmVzdExpbmVhcjogNSxcclxuICAgIG1pcE1hcExpbmVhckxpbmVhcjogNlxyXG59O1xyXG5cclxuc3BpbmUuQXRsYXMuVGV4dHVyZVdyYXAgPSB7XHJcbiAgICBtaXJyb3JlZFJlcGVhdDogMCxcclxuICAgIGNsYW1wVG9FZGdlOiAxLFxyXG4gICAgcmVwZWF0OiAyXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXM7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuUmVnaW9uQXR0YWNobWVudCA9IHJlcXVpcmUoJy4vUmVnaW9uQXR0YWNobWVudCcpO1xyXG5zcGluZS5NZXNoQXR0YWNobWVudCA9IHJlcXVpcmUoJy4vTWVzaEF0dGFjaG1lbnQnKTtcclxuc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9Ta2lubmVkTWVzaEF0dGFjaG1lbnQnKTtcclxuc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50ID0gcmVxdWlyZSgnLi9Cb3VuZGluZ0JveEF0dGFjaG1lbnQnKTtcclxuc3BpbmUuQXRsYXNBdHRhY2htZW50UGFyc2VyID0gZnVuY3Rpb24gKGF0bGFzKVxyXG57XHJcbiAgICB0aGlzLmF0bGFzID0gYXRsYXM7XHJcbn07XHJcbnNwaW5lLkF0bGFzQXR0YWNobWVudFBhcnNlci5wcm90b3R5cGUgPSB7XHJcbiAgICBuZXdSZWdpb25BdHRhY2htZW50OiBmdW5jdGlvbiAoc2tpbiwgbmFtZSwgcGF0aClcclxuICAgIHtcclxuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdGxhcy5maW5kUmVnaW9uKHBhdGgpO1xyXG4gICAgICAgIGlmICghcmVnaW9uKSB0aHJvdyBcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiICsgcGF0aCArIFwiIChyZWdpb24gYXR0YWNobWVudDogXCIgKyBuYW1lICsgXCIpXCI7XHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBuZXcgc3BpbmUuUmVnaW9uQXR0YWNobWVudChuYW1lKTtcclxuICAgICAgICBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0ID0gcmVnaW9uO1xyXG4gICAgICAgIGF0dGFjaG1lbnQuc2V0VVZzKHJlZ2lvbi51LCByZWdpb24udiwgcmVnaW9uLnUyLCByZWdpb24udjIsIHJlZ2lvbi5yb3RhdGUpO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WCA9IHJlZ2lvbi5vZmZzZXRYO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WSA9IHJlZ2lvbi5vZmZzZXRZO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uV2lkdGggPSByZWdpb24ud2lkdGg7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25IZWlnaHQgPSByZWdpb24uaGVpZ2h0O1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxXaWR0aCA9IHJlZ2lvbi5vcmlnaW5hbFdpZHRoO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxIZWlnaHQgPSByZWdpb24ub3JpZ2luYWxIZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIGF0dGFjaG1lbnQ7XHJcbiAgICB9LFxyXG4gICAgbmV3TWVzaEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChza2luLCBuYW1lLCBwYXRoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciByZWdpb24gPSB0aGlzLmF0bGFzLmZpbmRSZWdpb24ocGF0aCk7XHJcbiAgICAgICAgaWYgKCFyZWdpb24pIHRocm93IFwiUmVnaW9uIG5vdCBmb3VuZCBpbiBhdGxhczogXCIgKyBwYXRoICsgXCIgKG1lc2ggYXR0YWNobWVudDogXCIgKyBuYW1lICsgXCIpXCI7XHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBuZXcgc3BpbmUuTWVzaEF0dGFjaG1lbnQobmFtZSk7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZW5kZXJlck9iamVjdCA9IHJlZ2lvbjtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblUgPSByZWdpb24udTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblYgPSByZWdpb24udjtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblUyID0gcmVnaW9uLnUyO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uVjIgPSByZWdpb24udjI7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25Sb3RhdGUgPSByZWdpb24ucm90YXRlO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WCA9IHJlZ2lvbi5vZmZzZXRYO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT2Zmc2V0WSA9IHJlZ2lvbi5vZmZzZXRZO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uV2lkdGggPSByZWdpb24ud2lkdGg7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25IZWlnaHQgPSByZWdpb24uaGVpZ2h0O1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxXaWR0aCA9IHJlZ2lvbi5vcmlnaW5hbFdpZHRoO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uT3JpZ2luYWxIZWlnaHQgPSByZWdpb24ub3JpZ2luYWxIZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIGF0dGFjaG1lbnQ7XHJcbiAgICB9LFxyXG4gICAgbmV3U2tpbm5lZE1lc2hBdHRhY2htZW50OiBmdW5jdGlvbiAoc2tpbiwgbmFtZSwgcGF0aClcclxuICAgIHtcclxuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5hdGxhcy5maW5kUmVnaW9uKHBhdGgpO1xyXG4gICAgICAgIGlmICghcmVnaW9uKSB0aHJvdyBcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiICsgcGF0aCArIFwiIChza2lubmVkIG1lc2ggYXR0YWNobWVudDogXCIgKyBuYW1lICsgXCIpXCI7XHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBuZXcgc3BpbmUuU2tpbm5lZE1lc2hBdHRhY2htZW50KG5hbWUpO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QgPSByZWdpb247XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25VID0gcmVnaW9uLnU7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25WID0gcmVnaW9uLnY7XHJcbiAgICAgICAgYXR0YWNobWVudC5yZWdpb25VMiA9IHJlZ2lvbi51MjtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvblYyID0gcmVnaW9uLnYyO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uUm90YXRlID0gcmVnaW9uLnJvdGF0ZTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFggPSByZWdpb24ub2Zmc2V0WDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9mZnNldFkgPSByZWdpb24ub2Zmc2V0WTtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbldpZHRoID0gcmVnaW9uLndpZHRoO1xyXG4gICAgICAgIGF0dGFjaG1lbnQucmVnaW9uSGVpZ2h0ID0gcmVnaW9uLmhlaWdodDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsV2lkdGggPSByZWdpb24ub3JpZ2luYWxXaWR0aDtcclxuICAgICAgICBhdHRhY2htZW50LnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ID0gcmVnaW9uLm9yaWdpbmFsSGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiBhdHRhY2htZW50O1xyXG4gICAgfSxcclxuICAgIG5ld0JvdW5kaW5nQm94QXR0YWNobWVudDogZnVuY3Rpb24gKHNraW4sIG5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBzcGluZS5Cb3VuZGluZ0JveEF0dGFjaG1lbnQobmFtZSk7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXNBdHRhY2htZW50UGFyc2VyO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0bGFzUGFnZSA9IGZ1bmN0aW9uICgpXHJcbnt9O1xyXG5zcGluZS5BdGxhc1BhZ2UucHJvdG90eXBlID0ge1xyXG4gICAgbmFtZTogbnVsbCxcclxuICAgIGZvcm1hdDogbnVsbCxcclxuICAgIG1pbkZpbHRlcjogbnVsbCxcclxuICAgIG1hZ0ZpbHRlcjogbnVsbCxcclxuICAgIHVXcmFwOiBudWxsLFxyXG4gICAgdldyYXA6IG51bGwsXHJcbiAgICByZW5kZXJlck9iamVjdDogbnVsbCxcclxuICAgIHdpZHRoOiAwLFxyXG4gICAgaGVpZ2h0OiAwXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXNQYWdlO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0bGFzUmVhZGVyID0gZnVuY3Rpb24gKHRleHQpXHJcbntcclxuICAgIHRoaXMubGluZXMgPSB0ZXh0LnNwbGl0KC9cXHJcXG58XFxyfFxcbi8pO1xyXG59O1xyXG5zcGluZS5BdGxhc1JlYWRlci5wcm90b3R5cGUgPSB7XHJcbiAgICBpbmRleDogMCxcclxuICAgIHRyaW06IGZ1bmN0aW9uICh2YWx1ZSlcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgXCJcIik7XHJcbiAgICB9LFxyXG4gICAgcmVhZExpbmU6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5saW5lcy5sZW5ndGgpIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxpbmVzW3RoaXMuaW5kZXgrK107XHJcbiAgICB9LFxyXG4gICAgcmVhZFZhbHVlOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBsaW5lID0gdGhpcy5yZWFkTGluZSgpO1xyXG4gICAgICAgIHZhciBjb2xvbiA9IGxpbmUuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgaWYgKGNvbG9uID09IC0xKSB0aHJvdyBcIkludmFsaWQgbGluZTogXCIgKyBsaW5lO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRyaW0obGluZS5zdWJzdHJpbmcoY29sb24gKyAxKSk7XHJcbiAgICB9LFxyXG4gICAgLyoqIFJldHVybnMgdGhlIG51bWJlciBvZiB0dXBsZSB2YWx1ZXMgcmVhZCAoMSwgMiBvciA0KS4gKi9cclxuICAgIHJlYWRUdXBsZTogZnVuY3Rpb24gKHR1cGxlKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBsaW5lID0gdGhpcy5yZWFkTGluZSgpO1xyXG4gICAgICAgIHZhciBjb2xvbiA9IGxpbmUuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgaWYgKGNvbG9uID09IC0xKSB0aHJvdyBcIkludmFsaWQgbGluZTogXCIgKyBsaW5lO1xyXG4gICAgICAgIHZhciBpID0gMCwgbGFzdE1hdGNoID0gY29sb24gKyAxO1xyXG4gICAgICAgIGZvciAoOyBpIDwgMzsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGNvbW1hID0gbGluZS5pbmRleE9mKFwiLFwiLCBsYXN0TWF0Y2gpO1xyXG4gICAgICAgICAgICBpZiAoY29tbWEgPT0gLTEpIGJyZWFrO1xyXG4gICAgICAgICAgICB0dXBsZVtpXSA9IHRoaXMudHJpbShsaW5lLnN1YnN0cihsYXN0TWF0Y2gsIGNvbW1hIC0gbGFzdE1hdGNoKSk7XHJcbiAgICAgICAgICAgIGxhc3RNYXRjaCA9IGNvbW1hICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHVwbGVbaV0gPSB0aGlzLnRyaW0obGluZS5zdWJzdHJpbmcobGFzdE1hdGNoKSk7XHJcbiAgICAgICAgcmV0dXJuIGkgKyAxO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0bGFzUmVhZGVyO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0bGFzUmVnaW9uID0gZnVuY3Rpb24gKClcclxue307XHJcbnNwaW5lLkF0bGFzUmVnaW9uLnByb3RvdHlwZSA9IHtcclxuICAgIHBhZ2U6IG51bGwsXHJcbiAgICBuYW1lOiBudWxsLFxyXG4gICAgeDogMCwgeTogMCxcclxuICAgIHdpZHRoOiAwLCBoZWlnaHQ6IDAsXHJcbiAgICB1OiAwLCB2OiAwLCB1MjogMCwgdjI6IDAsXHJcbiAgICBvZmZzZXRYOiAwLCBvZmZzZXRZOiAwLFxyXG4gICAgb3JpZ2luYWxXaWR0aDogMCwgb3JpZ2luYWxIZWlnaHQ6IDAsXHJcbiAgICBpbmRleDogMCxcclxuICAgIHJvdGF0ZTogZmFsc2UsXHJcbiAgICBzcGxpdHM6IG51bGwsXHJcbiAgICBwYWRzOiBudWxsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQXRsYXNSZWdpb247XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxuICAgIHRoaXMuYXR0YWNobWVudE5hbWVzID0gW107XHJcbiAgICB0aGlzLmF0dGFjaG1lbnROYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG59O1xyXG5zcGluZS5BdHRhY2htZW50VGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgc2xvdEluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgYXR0YWNobWVudE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuYXR0YWNobWVudE5hbWVzW2ZyYW1lSW5kZXhdID0gYXR0YWNobWVudE5hbWU7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAobGFzdFRpbWUgPiB0aW1lKSB0aGlzLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgTnVtYmVyLk1BWF9WQUxVRSwgbnVsbCwgMCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2UgaWYgKGxhc3RUaW1lID4gdGltZSkgLy9cclxuICAgICAgICAgICAgbGFzdFRpbWUgPSAtMTtcclxuXHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXggPSB0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV0gPyBmcmFtZXMubGVuZ3RoIC0gMSA6IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxKGZyYW1lcywgdGltZSkgLSAxO1xyXG4gICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleF0gPCBsYXN0VGltZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgYXR0YWNobWVudE5hbWUgPSB0aGlzLmF0dGFjaG1lbnROYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICBza2VsZXRvbi5zbG90c1t0aGlzLnNsb3RJbmRleF0uc2V0QXR0YWNobWVudChcclxuICAgICAgICAgICAgIWF0dGFjaG1lbnROYW1lID8gbnVsbCA6IHNrZWxldG9uLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLnNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUpKTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5BdHRhY2htZW50VGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQXR0YWNobWVudFR5cGUgPSB7XHJcbiAgICByZWdpb246IDAsXHJcbiAgICBib3VuZGluZ2JveDogMSxcclxuICAgIG1lc2g6IDIsXHJcbiAgICBza2lubmVkbWVzaDogM1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkF0dGFjaG1lbnRUeXBlO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkJvbmUgPSBmdW5jdGlvbiAoYm9uZURhdGEsIHNrZWxldG9uLCBwYXJlbnQpXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IGJvbmVEYXRhO1xyXG4gICAgdGhpcy5za2VsZXRvbiA9IHNrZWxldG9uO1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnNldFRvU2V0dXBQb3NlKCk7XHJcbn07XHJcbnNwaW5lLkJvbmUueURvd24gPSBmYWxzZTtcclxuc3BpbmUuQm9uZS5wcm90b3R5cGUgPSB7XHJcbiAgICB4OiAwLCB5OiAwLFxyXG4gICAgcm90YXRpb246IDAsIHJvdGF0aW9uSUs6IDAsXHJcbiAgICBzY2FsZVg6IDEsIHNjYWxlWTogMSxcclxuICAgIGZsaXBYOiBmYWxzZSwgZmxpcFk6IGZhbHNlLFxyXG4gICAgbTAwOiAwLCBtMDE6IDAsIHdvcmxkWDogMCwgLy8gYSBiIHhcclxuICAgIG0xMDogMCwgbTExOiAwLCB3b3JsZFk6IDAsIC8vIGMgZCB5XHJcbiAgICB3b3JsZFJvdGF0aW9uOiAwLFxyXG4gICAgd29ybGRTY2FsZVg6IDEsIHdvcmxkU2NhbGVZOiAxLFxyXG4gICAgd29ybGRGbGlwWDogZmFsc2UsIHdvcmxkRmxpcFk6IGZhbHNlLFxyXG4gICAgdXBkYXRlV29ybGRUcmFuc2Zvcm06IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50O1xyXG4gICAgICAgIGlmIChwYXJlbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkWCA9IHRoaXMueCAqIHBhcmVudC5tMDAgKyB0aGlzLnkgKiBwYXJlbnQubTAxICsgcGFyZW50LndvcmxkWDtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFkgPSB0aGlzLnggKiBwYXJlbnQubTEwICsgdGhpcy55ICogcGFyZW50Lm0xMSArIHBhcmVudC53b3JsZFk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhdGEuaW5oZXJpdFNjYWxlKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkU2NhbGVYID0gcGFyZW50LndvcmxkU2NhbGVYICogdGhpcy5zY2FsZVg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkU2NhbGVZID0gcGFyZW50LndvcmxkU2NhbGVZICogdGhpcy5zY2FsZVk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkU2NhbGVYID0gdGhpcy5zY2FsZVg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkU2NhbGVZID0gdGhpcy5zY2FsZVk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy53b3JsZFJvdGF0aW9uID0gdGhpcy5kYXRhLmluaGVyaXRSb3RhdGlvbiA/IChwYXJlbnQud29ybGRSb3RhdGlvbiArIHRoaXMucm90YXRpb25JSykgOiB0aGlzLnJvdGF0aW9uSUs7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRGbGlwWCA9IHBhcmVudC53b3JsZEZsaXBYICE9IHRoaXMuZmxpcFg7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRGbGlwWSA9IHBhcmVudC53b3JsZEZsaXBZICE9IHRoaXMuZmxpcFk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHNrZWxldG9uRmxpcFggPSB0aGlzLnNrZWxldG9uLmZsaXBYLCBza2VsZXRvbkZsaXBZID0gdGhpcy5za2VsZXRvbi5mbGlwWTtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFggPSBza2VsZXRvbkZsaXBYID8gLXRoaXMueCA6IHRoaXMueDtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFkgPSAoc2tlbGV0b25GbGlwWSAhPSBzcGluZS5Cb25lLnlEb3duKSA/IC10aGlzLnkgOiB0aGlzLnk7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRTY2FsZVggPSB0aGlzLnNjYWxlWDtcclxuICAgICAgICAgICAgdGhpcy53b3JsZFNjYWxlWSA9IHRoaXMuc2NhbGVZO1xyXG4gICAgICAgICAgICB0aGlzLndvcmxkUm90YXRpb24gPSB0aGlzLnJvdGF0aW9uSUs7XHJcbiAgICAgICAgICAgIHRoaXMud29ybGRGbGlwWCA9IHNrZWxldG9uRmxpcFggIT0gdGhpcy5mbGlwWDtcclxuICAgICAgICAgICAgdGhpcy53b3JsZEZsaXBZID0gc2tlbGV0b25GbGlwWSAhPSB0aGlzLmZsaXBZO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmFkaWFucyA9IHRoaXMud29ybGRSb3RhdGlvbiAqIHNwaW5lLmRlZ1JhZDtcclxuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MocmFkaWFucyk7XHJcbiAgICAgICAgdmFyIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpO1xyXG4gICAgICAgIGlmICh0aGlzLndvcmxkRmxpcFgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLm0wMCA9IC1jb3MgKiB0aGlzLndvcmxkU2NhbGVYO1xyXG4gICAgICAgICAgICB0aGlzLm0wMSA9IHNpbiAqIHRoaXMud29ybGRTY2FsZVk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tMDAgPSBjb3MgKiB0aGlzLndvcmxkU2NhbGVYO1xyXG4gICAgICAgICAgICB0aGlzLm0wMSA9IC1zaW4gKiB0aGlzLndvcmxkU2NhbGVZO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy53b3JsZEZsaXBZICE9IHNwaW5lLkJvbmUueURvd24pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLm0xMCA9IC1zaW4gKiB0aGlzLndvcmxkU2NhbGVYO1xyXG4gICAgICAgICAgICB0aGlzLm0xMSA9IC1jb3MgKiB0aGlzLndvcmxkU2NhbGVZO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubTEwID0gc2luICogdGhpcy53b3JsZFNjYWxlWDtcclxuICAgICAgICAgICAgdGhpcy5tMTEgPSBjb3MgKiB0aGlzLndvcmxkU2NhbGVZO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBzZXRUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcclxuICAgICAgICB0aGlzLnggPSBkYXRhLng7XHJcbiAgICAgICAgdGhpcy55ID0gZGF0YS55O1xyXG4gICAgICAgIHRoaXMucm90YXRpb24gPSBkYXRhLnJvdGF0aW9uO1xyXG4gICAgICAgIHRoaXMucm90YXRpb25JSyA9IHRoaXMucm90YXRpb247XHJcbiAgICAgICAgdGhpcy5zY2FsZVggPSBkYXRhLnNjYWxlWDtcclxuICAgICAgICB0aGlzLnNjYWxlWSA9IGRhdGEuc2NhbGVZO1xyXG4gICAgICAgIHRoaXMuZmxpcFggPSBkYXRhLmZsaXBYO1xyXG4gICAgICAgIHRoaXMuZmxpcFkgPSBkYXRhLmZsaXBZO1xyXG4gICAgfSxcclxuICAgIHdvcmxkVG9Mb2NhbDogZnVuY3Rpb24gKHdvcmxkKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBkeCA9IHdvcmxkWzBdIC0gdGhpcy53b3JsZFgsIGR5ID0gd29ybGRbMV0gLSB0aGlzLndvcmxkWTtcclxuICAgICAgICB2YXIgbTAwID0gdGhpcy5tMDAsIG0xMCA9IHRoaXMubTEwLCBtMDEgPSB0aGlzLm0wMSwgbTExID0gdGhpcy5tMTE7XHJcbiAgICAgICAgaWYgKHRoaXMud29ybGRGbGlwWCAhPSAodGhpcy53b3JsZEZsaXBZICE9IHNwaW5lLkJvbmUueURvd24pKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgbTAwID0gLW0wMDtcclxuICAgICAgICAgICAgbTExID0gLW0xMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGludkRldCA9IDEgLyAobTAwICogbTExIC0gbTAxICogbTEwKTtcclxuICAgICAgICB3b3JsZFswXSA9IGR4ICogbTAwICogaW52RGV0IC0gZHkgKiBtMDEgKiBpbnZEZXQ7XHJcbiAgICAgICAgd29ybGRbMV0gPSBkeSAqIG0xMSAqIGludkRldCAtIGR4ICogbTEwICogaW52RGV0O1xyXG4gICAgfSxcclxuICAgIGxvY2FsVG9Xb3JsZDogZnVuY3Rpb24gKGxvY2FsKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBsb2NhbFggPSBsb2NhbFswXSwgbG9jYWxZID0gbG9jYWxbMV07XHJcbiAgICAgICAgbG9jYWxbMF0gPSBsb2NhbFggKiB0aGlzLm0wMCArIGxvY2FsWSAqIHRoaXMubTAxICsgdGhpcy53b3JsZFg7XHJcbiAgICAgICAgbG9jYWxbMV0gPSBsb2NhbFggKiB0aGlzLm0xMCArIGxvY2FsWSAqIHRoaXMubTExICsgdGhpcy53b3JsZFk7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQm9uZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5Cb25lRGF0YSA9IGZ1bmN0aW9uIChuYW1lLCBwYXJlbnQpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxufTtcclxuc3BpbmUuQm9uZURhdGEucHJvdG90eXBlID0ge1xyXG4gICAgbGVuZ3RoOiAwLFxyXG4gICAgeDogMCwgeTogMCxcclxuICAgIHJvdGF0aW9uOiAwLFxyXG4gICAgc2NhbGVYOiAxLCBzY2FsZVk6IDEsXHJcbiAgICBpbmhlcml0U2NhbGU6IHRydWUsXHJcbiAgICBpbmhlcml0Um90YXRpb246IHRydWUsXHJcbiAgICBmbGlwWDogZmFsc2UsIGZsaXBZOiBmYWxzZVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkJvbmVEYXRhO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5Cb3VuZGluZ0JveEF0dGFjaG1lbnQgPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMudmVydGljZXMgPSBbXTtcclxufTtcclxuc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50LnByb3RvdHlwZSA9IHtcclxuICAgIHR5cGU6IHNwaW5lLkF0dGFjaG1lbnRUeXBlLmJvdW5kaW5nYm94LFxyXG4gICAgY29tcHV0ZVdvcmxkVmVydGljZXM6IGZ1bmN0aW9uICh4LCB5LCBib25lLCB3b3JsZFZlcnRpY2VzKVxyXG4gICAge1xyXG4gICAgICAgIHggKz0gYm9uZS53b3JsZFg7XHJcbiAgICAgICAgeSArPSBib25lLndvcmxkWTtcclxuICAgICAgICB2YXIgbTAwID0gYm9uZS5tMDAsIG0wMSA9IGJvbmUubTAxLCBtMTAgPSBib25lLm0xMCwgbTExID0gYm9uZS5tMTE7XHJcbiAgICAgICAgdmFyIHZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZlcnRpY2VzLmxlbmd0aDsgaSA8IG47IGkgKz0gMilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBweCA9IHZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICB2YXIgcHkgPSB2ZXJ0aWNlc1tpICsgMV07XHJcbiAgICAgICAgICAgIHdvcmxkVmVydGljZXNbaV0gPSBweCAqIG0wMCArIHB5ICogbTAxICsgeDtcclxuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpICsgMV0gPSBweCAqIG0xMCArIHB5ICogbTExICsgeTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQm91bmRpbmdCb3hBdHRhY2htZW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyk7XHJcbnNwaW5lLkN1cnZlcyA9IHJlcXVpcmUoJy4vQ3VydmVzJyk7XHJcbnNwaW5lLkNvbG9yVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgciwgZywgYiwgYSwgLi4uXHJcbiAgICB0aGlzLmZyYW1lcy5sZW5ndGggPSBmcmFtZUNvdW50ICogNTtcclxufTtcclxuc3BpbmUuQ29sb3JUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBzbG90SW5kZXg6IDAsXHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyA1O1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgciwgZywgYiwgYSlcclxuICAgIHtcclxuICAgICAgICBmcmFtZUluZGV4ICo9IDU7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IHI7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDJdID0gZztcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgM10gPSBiO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyA0XSA9IGE7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXHJcblxyXG4gICAgICAgIHZhciByLCBnLCBiLCBhO1xyXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gNV0pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXHJcbiAgICAgICAgICAgIHZhciBpID0gZnJhbWVzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgIHIgPSBmcmFtZXNbaSAtIDNdO1xyXG4gICAgICAgICAgICBnID0gZnJhbWVzW2kgLSAyXTtcclxuICAgICAgICAgICAgYiA9IGZyYW1lc1tpIC0gMV07XHJcbiAgICAgICAgICAgIGEgPSBmcmFtZXNbaV07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCA1KTtcclxuICAgICAgICAgICAgdmFyIHByZXZGcmFtZVIgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDRdO1xyXG4gICAgICAgICAgICB2YXIgcHJldkZyYW1lRyA9IGZyYW1lc1tmcmFtZUluZGV4IC0gM107XHJcbiAgICAgICAgICAgIHZhciBwcmV2RnJhbWVCID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAyXTtcclxuICAgICAgICAgICAgdmFyIHByZXZGcmFtZUEgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDFdO1xyXG4gICAgICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggLSA1LypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xyXG4gICAgICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyA1IC0gMSwgcGVyY2VudCk7XHJcblxyXG4gICAgICAgICAgICByID0gcHJldkZyYW1lUiArIChmcmFtZXNbZnJhbWVJbmRleCArIDEvKkZSQU1FX1IqL10gLSBwcmV2RnJhbWVSKSAqIHBlcmNlbnQ7XHJcbiAgICAgICAgICAgIGcgPSBwcmV2RnJhbWVHICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMi8qRlJBTUVfRyovXSAtIHByZXZGcmFtZUcpICogcGVyY2VudDtcclxuICAgICAgICAgICAgYiA9IHByZXZGcmFtZUIgKyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAzLypGUkFNRV9CKi9dIC0gcHJldkZyYW1lQikgKiBwZXJjZW50O1xyXG4gICAgICAgICAgICBhID0gcHJldkZyYW1lQSArIChmcmFtZXNbZnJhbWVJbmRleCArIDQvKkZSQU1FX0EqL10gLSBwcmV2RnJhbWVBKSAqIHBlcmNlbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzbG90ID0gc2tlbGV0b24uc2xvdHNbdGhpcy5zbG90SW5kZXhdO1xyXG4gICAgICAgIGlmIChhbHBoYSA8IDEpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzbG90LnIgKz0gKHIgLSBzbG90LnIpICogYWxwaGE7XHJcbiAgICAgICAgICAgIHNsb3QuZyArPSAoZyAtIHNsb3QuZykgKiBhbHBoYTtcclxuICAgICAgICAgICAgc2xvdC5iICs9IChiIC0gc2xvdC5iKSAqIGFscGhhO1xyXG4gICAgICAgICAgICBzbG90LmEgKz0gKGEgLSBzbG90LmEpICogYWxwaGE7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2xvdC5yID0gcjtcclxuICAgICAgICAgICAgc2xvdC5nID0gZztcclxuICAgICAgICAgICAgc2xvdC5iID0gYjtcclxuICAgICAgICAgICAgc2xvdC5hID0gYTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuQ29sb3JUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5DdXJ2ZXMgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBbXTsgLy8gdHlwZSwgeCwgeSwgLi4uXHJcbiAgICAvL3RoaXMuY3VydmVzLmxlbmd0aCA9IChmcmFtZUNvdW50IC0gMSkgKiAxOS8qQkVaSUVSX1NJWkUqLztcclxufTtcclxuc3BpbmUuQ3VydmVzLnByb3RvdHlwZSA9IHtcclxuICAgIHNldExpbmVhcjogZnVuY3Rpb24gKGZyYW1lSW5kZXgpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5jdXJ2ZXNbZnJhbWVJbmRleCAqIDE5LypCRVpJRVJfU0laRSovXSA9IDAvKkxJTkVBUiovO1xyXG4gICAgfSxcclxuICAgIHNldFN0ZXBwZWQ6IGZ1bmN0aW9uIChmcmFtZUluZGV4KVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuY3VydmVzW2ZyYW1lSW5kZXggKiAxOS8qQkVaSUVSX1NJWkUqL10gPSAxLypTVEVQUEVEKi87XHJcbiAgICB9LFxyXG4gICAgLyoqIFNldHMgdGhlIGNvbnRyb2wgaGFuZGxlIHBvc2l0aW9ucyBmb3IgYW4gaW50ZXJwb2xhdGlvbiBiZXppZXIgY3VydmUgdXNlZCB0byB0cmFuc2l0aW9uIGZyb20gdGhpcyBrZXlmcmFtZSB0byB0aGUgbmV4dC5cclxuICAgICAqIGN4MSBhbmQgY3gyIGFyZSBmcm9tIDAgdG8gMSwgcmVwcmVzZW50aW5nIHRoZSBwZXJjZW50IG9mIHRpbWUgYmV0d2VlbiB0aGUgdHdvIGtleWZyYW1lcy4gY3kxIGFuZCBjeTIgYXJlIHRoZSBwZXJjZW50IG9mXHJcbiAgICAgKiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBrZXlmcmFtZSdzIHZhbHVlcy4gKi9cclxuICAgIHNldEN1cnZlOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgY3gxLCBjeTEsIGN4MiwgY3kyKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzdWJkaXYxID0gMSAvIDEwLypCRVpJRVJfU0VHTUVOVFMqLywgc3ViZGl2MiA9IHN1YmRpdjEgKiBzdWJkaXYxLCBzdWJkaXYzID0gc3ViZGl2MiAqIHN1YmRpdjE7XHJcbiAgICAgICAgdmFyIHByZTEgPSAzICogc3ViZGl2MSwgcHJlMiA9IDMgKiBzdWJkaXYyLCBwcmU0ID0gNiAqIHN1YmRpdjIsIHByZTUgPSA2ICogc3ViZGl2MztcclxuICAgICAgICB2YXIgdG1wMXggPSAtY3gxICogMiArIGN4MiwgdG1wMXkgPSAtY3kxICogMiArIGN5MiwgdG1wMnggPSAoY3gxIC0gY3gyKSAqIDMgKyAxLCB0bXAyeSA9IChjeTEgLSBjeTIpICogMyArIDE7XHJcbiAgICAgICAgdmFyIGRmeCA9IGN4MSAqIHByZTEgKyB0bXAxeCAqIHByZTIgKyB0bXAyeCAqIHN1YmRpdjMsIGRmeSA9IGN5MSAqIHByZTEgKyB0bXAxeSAqIHByZTIgKyB0bXAyeSAqIHN1YmRpdjM7XHJcbiAgICAgICAgdmFyIGRkZnggPSB0bXAxeCAqIHByZTQgKyB0bXAyeCAqIHByZTUsIGRkZnkgPSB0bXAxeSAqIHByZTQgKyB0bXAyeSAqIHByZTU7XHJcbiAgICAgICAgdmFyIGRkZGZ4ID0gdG1wMnggKiBwcmU1LCBkZGRmeSA9IHRtcDJ5ICogcHJlNTtcclxuXHJcbiAgICAgICAgdmFyIGkgPSBmcmFtZUluZGV4ICogMTkvKkJFWklFUl9TSVpFKi87XHJcbiAgICAgICAgdmFyIGN1cnZlcyA9IHRoaXMuY3VydmVzO1xyXG4gICAgICAgIGN1cnZlc1tpKytdID0gMi8qQkVaSUVSKi87XHJcblxyXG4gICAgICAgIHZhciB4ID0gZGZ4LCB5ID0gZGZ5O1xyXG4gICAgICAgIGZvciAodmFyIG4gPSBpICsgMTkvKkJFWklFUl9TSVpFKi8gLSAxOyBpIDwgbjsgaSArPSAyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY3VydmVzW2ldID0geDtcclxuICAgICAgICAgICAgY3VydmVzW2kgKyAxXSA9IHk7XHJcbiAgICAgICAgICAgIGRmeCArPSBkZGZ4O1xyXG4gICAgICAgICAgICBkZnkgKz0gZGRmeTtcclxuICAgICAgICAgICAgZGRmeCArPSBkZGRmeDtcclxuICAgICAgICAgICAgZGRmeSArPSBkZGRmeTtcclxuICAgICAgICAgICAgeCArPSBkZng7XHJcbiAgICAgICAgICAgIHkgKz0gZGZ5O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBnZXRDdXJ2ZVBlcmNlbnQ6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCBwZXJjZW50KVxyXG4gICAge1xyXG4gICAgICAgIHBlcmNlbnQgPSBwZXJjZW50IDwgMCA/IDAgOiAocGVyY2VudCA+IDEgPyAxIDogcGVyY2VudCk7XHJcbiAgICAgICAgdmFyIGN1cnZlcyA9IHRoaXMuY3VydmVzO1xyXG4gICAgICAgIHZhciBpID0gZnJhbWVJbmRleCAqIDE5LypCRVpJRVJfU0laRSovO1xyXG4gICAgICAgIHZhciB0eXBlID0gY3VydmVzW2ldO1xyXG4gICAgICAgIGlmICh0eXBlID09PSAwLypMSU5FQVIqLykgcmV0dXJuIHBlcmNlbnQ7XHJcbiAgICAgICAgaWYgKHR5cGUgPT0gMS8qU1RFUFBFRCovKSByZXR1cm4gMDtcclxuICAgICAgICBpKys7XHJcbiAgICAgICAgdmFyIHggPSAwO1xyXG4gICAgICAgIGZvciAodmFyIHN0YXJ0ID0gaSwgbiA9IGkgKyAxOS8qQkVaSUVSX1NJWkUqLyAtIDE7IGkgPCBuOyBpICs9IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB4ID0gY3VydmVzW2ldO1xyXG4gICAgICAgICAgICBpZiAoeCA+PSBwZXJjZW50KVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJldlgsIHByZXZZO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gc3RhcnQpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldlggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZZID0gMDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldlggPSBjdXJ2ZXNbaSAtIDJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZZID0gY3VydmVzW2kgLSAxXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBwcmV2WSArIChjdXJ2ZXNbaSArIDFdIC0gcHJldlkpICogKHBlcmNlbnQgLSBwcmV2WCkgLyAoeCAtIHByZXZYKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgeSA9IGN1cnZlc1tpIC0gMV07XHJcbiAgICAgICAgcmV0dXJuIHkgKyAoMSAtIHkpICogKHBlcmNlbnQgLSB4KSAvICgxIC0geCk7IC8vIExhc3QgcG9pbnQgaXMgMSwxLlxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkN1cnZlcztcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5EcmF3T3JkZXJUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XHJcbiAgICB0aGlzLmRyYXdPcmRlcnMgPSBbXTtcclxuICAgIHRoaXMuZHJhd09yZGVycy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG59O1xyXG5zcGluZS5EcmF3T3JkZXJUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGg7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBkcmF3T3JkZXIpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZHJhd09yZGVyc1tmcmFtZUluZGV4XSA9IGRyYXdPcmRlcjtcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cclxuXHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXg7XHJcbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSkgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICBmcmFtZUluZGV4ID0gZnJhbWVzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaDEoZnJhbWVzLCB0aW1lKSAtIDE7XHJcblxyXG4gICAgICAgIHZhciBkcmF3T3JkZXIgPSBza2VsZXRvbi5kcmF3T3JkZXI7XHJcbiAgICAgICAgdmFyIHNsb3RzID0gc2tlbGV0b24uc2xvdHM7XHJcbiAgICAgICAgdmFyIGRyYXdPcmRlclRvU2V0dXBJbmRleCA9IHRoaXMuZHJhd09yZGVyc1tmcmFtZUluZGV4XTtcclxuICAgICAgICBpZiAoZHJhd09yZGVyVG9TZXR1cEluZGV4KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBkcmF3T3JkZXJUb1NldHVwSW5kZXgubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBkcmF3T3JkZXJbaV0gPSBkcmF3T3JkZXJUb1NldHVwSW5kZXhbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkRyYXdPcmRlclRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkV2ZW50ID0gZnVuY3Rpb24gKGRhdGEpXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbn07XHJcbnNwaW5lLkV2ZW50LnByb3RvdHlwZSA9IHtcclxuICAgIGludFZhbHVlOiAwLFxyXG4gICAgZmxvYXRWYWx1ZTogMCxcclxuICAgIHN0cmluZ1ZhbHVlOiBudWxsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuRXZlbnQ7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuRXZlbnREYXRhID0gZnVuY3Rpb24gKG5hbWUpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbn07XHJcbnNwaW5lLkV2ZW50RGF0YS5wcm90b3R5cGUgPSB7XHJcbiAgICBpbnRWYWx1ZTogMCxcclxuICAgIGZsb2F0VmFsdWU6IDAsXHJcbiAgICBzdHJpbmdWYWx1ZTogbnVsbFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkV2ZW50RGF0YTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5FdmVudFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudDtcclxuICAgIHRoaXMuZXZlbnRzID0gW107XHJcbiAgICB0aGlzLmV2ZW50cy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG59O1xyXG5zcGluZS5FdmVudFRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aDtcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIGV2ZW50KVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmV2ZW50c1tmcmFtZUluZGV4XSA9IGV2ZW50O1xyXG4gICAgfSxcclxuICAgIC8qKiBGaXJlcyBldmVudHMgZm9yIGZyYW1lcyA+IGxhc3RUaW1lIGFuZCA8PSB0aW1lLiAqL1xyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICBpZiAoIWZpcmVkRXZlbnRzKSByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICB2YXIgZnJhbWVDb3VudCA9IGZyYW1lcy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGlmIChsYXN0VGltZSA+IHRpbWUpXHJcbiAgICAgICAgeyAvLyBGaXJlIGV2ZW50cyBhZnRlciBsYXN0IHRpbWUgZm9yIGxvb3BlZCBhbmltYXRpb25zLlxyXG4gICAgICAgICAgICB0aGlzLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgTnVtYmVyLk1BWF9WQUxVRSwgZmlyZWRFdmVudHMsIGFscGhhKTtcclxuICAgICAgICAgICAgbGFzdFRpbWUgPSAtMTtcclxuICAgICAgICB9IGVsc2UgaWYgKGxhc3RUaW1lID49IGZyYW1lc1tmcmFtZUNvdW50IC0gMV0pIC8vIExhc3QgdGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXHJcblxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4O1xyXG4gICAgICAgIGlmIChsYXN0VGltZSA8IGZyYW1lc1swXSlcclxuICAgICAgICAgICAgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2gxKGZyYW1lcywgbGFzdFRpbWUpO1xyXG4gICAgICAgICAgICB2YXIgZnJhbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XHJcbiAgICAgICAgICAgIHdoaWxlIChmcmFtZUluZGV4ID4gMClcclxuICAgICAgICAgICAgeyAvLyBGaXJlIG11bHRpcGxlIGV2ZW50cyB3aXRoIHRoZSBzYW1lIGZyYW1lLlxyXG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lc1tmcmFtZUluZGV4IC0gMV0gIT0gZnJhbWUpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZnJhbWVJbmRleC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBldmVudHMgPSB0aGlzLmV2ZW50cztcclxuICAgICAgICBmb3IgKDsgZnJhbWVJbmRleCA8IGZyYW1lQ291bnQgJiYgdGltZSA+PSBmcmFtZXNbZnJhbWVJbmRleF07IGZyYW1lSW5kZXgrKylcclxuICAgICAgICAgICAgZmlyZWRFdmVudHMucHVzaChldmVudHNbZnJhbWVJbmRleF0pO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkV2ZW50VGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuRmZkVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTtcclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQ7XHJcbiAgICB0aGlzLmZyYW1lVmVydGljZXMgPSBbXTtcclxuICAgIHRoaXMuZnJhbWVWZXJ0aWNlcy5sZW5ndGggPSBmcmFtZUNvdW50O1xyXG59O1xyXG5zcGluZS5GZmRUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBzbG90SW5kZXg6IDAsXHJcbiAgICBhdHRhY2htZW50OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgdmVydGljZXMpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVWZXJ0aWNlc1tmcmFtZUluZGV4XSA9IHZlcnRpY2VzO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3QgPSBza2VsZXRvbi5zbG90c1t0aGlzLnNsb3RJbmRleF07XHJcbiAgICAgICAgaWYgKHNsb3QuYXR0YWNobWVudCAhPSB0aGlzLmF0dGFjaG1lbnQpIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgZnJhbWVWZXJ0aWNlcyA9IHRoaXMuZnJhbWVWZXJ0aWNlcztcclxuICAgICAgICB2YXIgdmVydGV4Q291bnQgPSBmcmFtZVZlcnRpY2VzWzBdLmxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIHZlcnRpY2VzID0gc2xvdC5hdHRhY2htZW50VmVydGljZXM7XHJcbiAgICAgICAgaWYgKHZlcnRpY2VzLmxlbmd0aCAhPSB2ZXJ0ZXhDb3VudCkgYWxwaGEgPSAxO1xyXG4gICAgICAgIHZlcnRpY2VzLmxlbmd0aCA9IHZlcnRleENvdW50O1xyXG5cclxuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdKVxyXG4gICAgICAgIHsgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICB2YXIgbGFzdFZlcnRpY2VzID0gZnJhbWVWZXJ0aWNlc1tmcmFtZXMubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIGlmIChhbHBoYSA8IDEpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGV4Q291bnQ7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpXSArPSAobGFzdFZlcnRpY2VzW2ldIC0gdmVydGljZXNbaV0pICogYWxwaGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRleENvdW50OyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaV0gPSBsYXN0VmVydGljZXNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaDEoZnJhbWVzLCB0aW1lKTtcclxuICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCAtIDFdIC0gZnJhbWVUaW1lKTtcclxuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLSAxLCBwZXJjZW50IDwgMCA/IDAgOiAocGVyY2VudCA+IDEgPyAxIDogcGVyY2VudCkpO1xyXG5cclxuICAgICAgICB2YXIgcHJldlZlcnRpY2VzID0gZnJhbWVWZXJ0aWNlc1tmcmFtZUluZGV4IC0gMV07XHJcbiAgICAgICAgdmFyIG5leHRWZXJ0aWNlcyA9IGZyYW1lVmVydGljZXNbZnJhbWVJbmRleF07XHJcblxyXG4gICAgICAgIGlmIChhbHBoYSA8IDEpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRleENvdW50OyBpKyspXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcmV2ID0gcHJldlZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmVydGljZXNbaV0gKz0gKHByZXYgKyAobmV4dFZlcnRpY2VzW2ldIC0gcHJldikgKiBwZXJjZW50IC0gdmVydGljZXNbaV0pICogYWxwaGE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRleENvdW50OyBpKyspXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcmV2ID0gcHJldlZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmVydGljZXNbaV0gPSBwcmV2ICsgKG5leHRWZXJ0aWNlc1tpXSAtIHByZXYpICogcGVyY2VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5GZmRUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xyXG5zcGluZS5GbGlwWFRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIGZsaXAsIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDI7XHJcbn07XHJcbnNwaW5lLkZsaXBYVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgYm9uZUluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMjtcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIGZsaXApXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSAyO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSBmbGlwID8gMSA6IDA7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAobGFzdFRpbWUgPiB0aW1lKSB0aGlzLmFwcGx5KHNrZWxldG9uLCBsYXN0VGltZSwgTnVtYmVyLk1BWF9WQUxVRSwgbnVsbCwgMCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2UgaWYgKGxhc3RUaW1lID4gdGltZSkgLy9cclxuICAgICAgICAgICAgbGFzdFRpbWUgPSAtMTtcclxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9ICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0gPyBmcmFtZXMubGVuZ3RoIDogc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDIpKSAtIDI7XHJcbiAgICAgICAgaWYgKGZyYW1lc1tmcmFtZUluZGV4XSA8IGxhc3RUaW1lKSByZXR1cm47XHJcbiAgICAgICAgc2tlbGV0b24uYm9uZXNbdGhpcy5ib25lSW5kZXhdLmZsaXBYID0gZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSAhPSAwO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLkZsaXBYVGltZWxpbmU7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuRmxpcFlUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCBmbGlwLCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAyO1xyXG59O1xyXG5zcGluZS5GbGlwWVRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGJvbmVJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDI7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBmbGlwKVxyXG4gICAge1xyXG4gICAgICAgIGZyYW1lSW5kZXggKj0gMjtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4XSA9IHRpbWU7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDFdID0gZmxpcCA/IDEgOiAwO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGxhc3RUaW1lID4gdGltZSkgdGhpcy5hcHBseShza2VsZXRvbiwgbGFzdFRpbWUsIE51bWJlci5NQVhfVkFMVUUsIG51bGwsIDApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0VGltZSA+IHRpbWUpIC8vXHJcbiAgICAgICAgICAgIGxhc3RUaW1lID0gLTE7XHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDJdID8gZnJhbWVzLmxlbmd0aCA6IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAyKSkgLSAyO1xyXG4gICAgICAgIGlmIChmcmFtZXNbZnJhbWVJbmRleF0gPCBsYXN0VGltZSkgcmV0dXJuO1xyXG4gICAgICAgIHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XS5mbGlwWSA9IGZyYW1lc1tmcmFtZUluZGV4ICsgMV0gIT0gMDtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5GbGlwWVRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLklrQ29uc3RyYWludCA9IGZ1bmN0aW9uIChkYXRhLCBza2VsZXRvbilcclxue1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YTtcclxuICAgIHRoaXMubWl4ID0gZGF0YS5taXg7XHJcbiAgICB0aGlzLmJlbmREaXJlY3Rpb24gPSBkYXRhLmJlbmREaXJlY3Rpb247XHJcblxyXG4gICAgdGhpcy5ib25lcyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBkYXRhLmJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB0aGlzLmJvbmVzLnB1c2goc2tlbGV0b24uZmluZEJvbmUoZGF0YS5ib25lc1tpXS5uYW1lKSk7XHJcbiAgICB0aGlzLnRhcmdldCA9IHNrZWxldG9uLmZpbmRCb25lKGRhdGEudGFyZ2V0Lm5hbWUpO1xyXG59O1xyXG5zcGluZS5Ja0NvbnN0cmFpbnQucHJvdG90eXBlID0ge1xyXG4gICAgYXBwbHk6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcbiAgICAgICAgc3dpdGNoIChib25lcy5sZW5ndGgpXHJcbiAgICAgICAge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgc3BpbmUuSWtDb25zdHJhaW50LmFwcGx5MShib25lc1swXSwgdGFyZ2V0LndvcmxkWCwgdGFyZ2V0LndvcmxkWSwgdGhpcy5taXgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIHNwaW5lLklrQ29uc3RyYWludC5hcHBseTIoYm9uZXNbMF0sIGJvbmVzWzFdLCB0YXJnZXQud29ybGRYLCB0YXJnZXQud29ybGRZLCB0aGlzLmJlbmREaXJlY3Rpb24sIHRoaXMubWl4KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG4vKiogQWRqdXN0cyB0aGUgYm9uZSByb3RhdGlvbiBzbyB0aGUgdGlwIGlzIGFzIGNsb3NlIHRvIHRoZSB0YXJnZXQgcG9zaXRpb24gYXMgcG9zc2libGUuIFRoZSB0YXJnZXQgaXMgc3BlY2lmaWVkIGluIHRoZSB3b3JsZFxyXG4gKiBjb29yZGluYXRlIHN5c3RlbS4gKi9cclxuc3BpbmUuSWtDb25zdHJhaW50LmFwcGx5MSA9IGZ1bmN0aW9uIChib25lLCB0YXJnZXRYLCB0YXJnZXRZLCBhbHBoYSlcclxue1xyXG4gICAgdmFyIHBhcmVudFJvdGF0aW9uID0gKCFib25lLmRhdGEuaW5oZXJpdFJvdGF0aW9uIHx8ICFib25lLnBhcmVudCkgPyAwIDogYm9uZS5wYXJlbnQud29ybGRSb3RhdGlvbjtcclxuICAgIHZhciByb3RhdGlvbiA9IGJvbmUucm90YXRpb247XHJcbiAgICB2YXIgcm90YXRpb25JSyA9IE1hdGguYXRhbjIodGFyZ2V0WSAtIGJvbmUud29ybGRZLCB0YXJnZXRYIC0gYm9uZS53b3JsZFgpICogc3BpbmUucmFkRGVnIC0gcGFyZW50Um90YXRpb247XHJcbiAgICBib25lLnJvdGF0aW9uSUsgPSByb3RhdGlvbiArIChyb3RhdGlvbklLIC0gcm90YXRpb24pICogYWxwaGE7XHJcbn07XHJcbi8qKiBBZGp1c3RzIHRoZSBwYXJlbnQgYW5kIGNoaWxkIGJvbmUgcm90YXRpb25zIHNvIHRoZSB0aXAgb2YgdGhlIGNoaWxkIGlzIGFzIGNsb3NlIHRvIHRoZSB0YXJnZXQgcG9zaXRpb24gYXMgcG9zc2libGUuIFRoZVxyXG4gKiB0YXJnZXQgaXMgc3BlY2lmaWVkIGluIHRoZSB3b3JsZCBjb29yZGluYXRlIHN5c3RlbS5cclxuICogQHBhcmFtIGNoaWxkIEFueSBkZXNjZW5kYW50IGJvbmUgb2YgdGhlIHBhcmVudC4gKi9cclxuc3BpbmUuSWtDb25zdHJhaW50LmFwcGx5MiA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkLCB0YXJnZXRYLCB0YXJnZXRZLCBiZW5kRGlyZWN0aW9uLCBhbHBoYSlcclxue1xyXG4gICAgdmFyIGNoaWxkUm90YXRpb24gPSBjaGlsZC5yb3RhdGlvbiwgcGFyZW50Um90YXRpb24gPSBwYXJlbnQucm90YXRpb247XHJcbiAgICBpZiAoIWFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIGNoaWxkLnJvdGF0aW9uSUsgPSBjaGlsZFJvdGF0aW9uO1xyXG4gICAgICAgIHBhcmVudC5yb3RhdGlvbklLID0gcGFyZW50Um90YXRpb247XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIHBvc2l0aW9uWCwgcG9zaXRpb25ZLCB0ZW1wUG9zaXRpb24gPSBzcGluZS50ZW1wO1xyXG4gICAgdmFyIHBhcmVudFBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XHJcbiAgICBpZiAocGFyZW50UGFyZW50KVxyXG4gICAge1xyXG4gICAgICAgIHRlbXBQb3NpdGlvblswXSA9IHRhcmdldFg7XHJcbiAgICAgICAgdGVtcFBvc2l0aW9uWzFdID0gdGFyZ2V0WTtcclxuICAgICAgICBwYXJlbnRQYXJlbnQud29ybGRUb0xvY2FsKHRlbXBQb3NpdGlvbik7XHJcbiAgICAgICAgdGFyZ2V0WCA9ICh0ZW1wUG9zaXRpb25bMF0gLSBwYXJlbnQueCkgKiBwYXJlbnRQYXJlbnQud29ybGRTY2FsZVg7XHJcbiAgICAgICAgdGFyZ2V0WSA9ICh0ZW1wUG9zaXRpb25bMV0gLSBwYXJlbnQueSkgKiBwYXJlbnRQYXJlbnQud29ybGRTY2FsZVk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRhcmdldFggLT0gcGFyZW50Lng7XHJcbiAgICAgICAgdGFyZ2V0WSAtPSBwYXJlbnQueTtcclxuICAgIH1cclxuICAgIGlmIChjaGlsZC5wYXJlbnQgPT0gcGFyZW50KVxyXG4gICAge1xyXG4gICAgICAgIHBvc2l0aW9uWCA9IGNoaWxkLng7XHJcbiAgICAgICAgcG9zaXRpb25ZID0gY2hpbGQueTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGVtcFBvc2l0aW9uWzBdID0gY2hpbGQueDtcclxuICAgICAgICB0ZW1wUG9zaXRpb25bMV0gPSBjaGlsZC55O1xyXG4gICAgICAgIGNoaWxkLnBhcmVudC5sb2NhbFRvV29ybGQodGVtcFBvc2l0aW9uKTtcclxuICAgICAgICBwYXJlbnQud29ybGRUb0xvY2FsKHRlbXBQb3NpdGlvbik7XHJcbiAgICAgICAgcG9zaXRpb25YID0gdGVtcFBvc2l0aW9uWzBdO1xyXG4gICAgICAgIHBvc2l0aW9uWSA9IHRlbXBQb3NpdGlvblsxXTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZFggPSBwb3NpdGlvblggKiBwYXJlbnQud29ybGRTY2FsZVgsIGNoaWxkWSA9IHBvc2l0aW9uWSAqIHBhcmVudC53b3JsZFNjYWxlWTtcclxuICAgIHZhciBvZmZzZXQgPSBNYXRoLmF0YW4yKGNoaWxkWSwgY2hpbGRYKTtcclxuICAgIHZhciBsZW4xID0gTWF0aC5zcXJ0KGNoaWxkWCAqIGNoaWxkWCArIGNoaWxkWSAqIGNoaWxkWSksIGxlbjIgPSBjaGlsZC5kYXRhLmxlbmd0aCAqIGNoaWxkLndvcmxkU2NhbGVYO1xyXG4gICAgLy8gQmFzZWQgb24gY29kZSBieSBSeWFuIEp1Y2tldHQgd2l0aCBwZXJtaXNzaW9uOiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAwOSBSeWFuIEp1Y2tldHQsIGh0dHA6Ly93d3cucnlhbmp1Y2tldHQuY29tL1xyXG4gICAgdmFyIGNvc0Rlbm9tID0gMiAqIGxlbjEgKiBsZW4yO1xyXG4gICAgaWYgKGNvc0Rlbm9tIDwgMC4wMDAxKVxyXG4gICAge1xyXG4gICAgICAgIGNoaWxkLnJvdGF0aW9uSUsgPSBjaGlsZFJvdGF0aW9uICsgKE1hdGguYXRhbjIodGFyZ2V0WSwgdGFyZ2V0WCkgKiBzcGluZS5yYWREZWcgLSBwYXJlbnRSb3RhdGlvbiAtIGNoaWxkUm90YXRpb24pICogYWxwaGE7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvcyA9ICh0YXJnZXRYICogdGFyZ2V0WCArIHRhcmdldFkgKiB0YXJnZXRZIC0gbGVuMSAqIGxlbjEgLSBsZW4yICogbGVuMikgLyBjb3NEZW5vbTtcclxuICAgIGlmIChjb3MgPCAtMSlcclxuICAgICAgICBjb3MgPSAtMTtcclxuICAgIGVsc2UgaWYgKGNvcyA+IDEpXHJcbiAgICAgICAgY29zID0gMTtcclxuICAgIHZhciBjaGlsZEFuZ2xlID0gTWF0aC5hY29zKGNvcykgKiBiZW5kRGlyZWN0aW9uO1xyXG4gICAgdmFyIGFkamFjZW50ID0gbGVuMSArIGxlbjIgKiBjb3MsIG9wcG9zaXRlID0gbGVuMiAqIE1hdGguc2luKGNoaWxkQW5nbGUpO1xyXG4gICAgdmFyIHBhcmVudEFuZ2xlID0gTWF0aC5hdGFuMih0YXJnZXRZICogYWRqYWNlbnQgLSB0YXJnZXRYICogb3Bwb3NpdGUsIHRhcmdldFggKiBhZGphY2VudCArIHRhcmdldFkgKiBvcHBvc2l0ZSk7XHJcbiAgICB2YXIgcm90YXRpb24gPSAocGFyZW50QW5nbGUgLSBvZmZzZXQpICogc3BpbmUucmFkRGVnIC0gcGFyZW50Um90YXRpb247XHJcbiAgICBpZiAocm90YXRpb24gPiAxODApXHJcbiAgICAgICAgcm90YXRpb24gLT0gMzYwO1xyXG4gICAgZWxzZSBpZiAocm90YXRpb24gPCAtMTgwKSAvL1xyXG4gICAgICAgIHJvdGF0aW9uICs9IDM2MDtcclxuICAgIHBhcmVudC5yb3RhdGlvbklLID0gcGFyZW50Um90YXRpb24gKyByb3RhdGlvbiAqIGFscGhhO1xyXG4gICAgcm90YXRpb24gPSAoY2hpbGRBbmdsZSArIG9mZnNldCkgKiBzcGluZS5yYWREZWcgLSBjaGlsZFJvdGF0aW9uO1xyXG4gICAgaWYgKHJvdGF0aW9uID4gMTgwKVxyXG4gICAgICAgIHJvdGF0aW9uIC09IDM2MDtcclxuICAgIGVsc2UgaWYgKHJvdGF0aW9uIDwgLTE4MCkgLy9cclxuICAgICAgICByb3RhdGlvbiArPSAzNjA7XHJcbiAgICBjaGlsZC5yb3RhdGlvbklLID0gY2hpbGRSb3RhdGlvbiArIChyb3RhdGlvbiArIHBhcmVudC53b3JsZFJvdGF0aW9uIC0gY2hpbGQucGFyZW50LndvcmxkUm90YXRpb24pICogYWxwaGE7XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuSWtDb25zdHJhaW50O1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJykgfHwge307XHJcbnNwaW5lLklrQ29uc3RyYWludERhdGEgPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMuYm9uZXMgPSBbXTtcclxufTtcclxuc3BpbmUuSWtDb25zdHJhaW50RGF0YS5wcm90b3R5cGUgPSB7XHJcbiAgICB0YXJnZXQ6IG51bGwsXHJcbiAgICBiZW5kRGlyZWN0aW9uOiAxLFxyXG4gICAgbWl4OiAxXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuSWtDb25zdHJhaW50RGF0YTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpIHx8IHt9O1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCBtaXgsIGJlbmREaXJlY3Rpb24sIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDM7XHJcbn07XHJcbnNwaW5lLklrQ29uc3RyYWludFRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGlrQ29uc3RyYWludEluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMztcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIG1peCwgYmVuZERpcmVjdGlvbilcclxuICAgIHtcclxuICAgICAgICBmcmFtZUluZGV4ICo9IDM7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IG1peDtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMl0gPSBiZW5kRGlyZWN0aW9uO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgaWtDb25zdHJhaW50ID0gc2tlbGV0b24uaWtDb25zdHJhaW50c1t0aGlzLmlrQ29uc3RyYWludEluZGV4XTtcclxuXHJcbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAzXSlcclxuICAgICAgICB7IC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgaWtDb25zdHJhaW50Lm1peCArPSAoZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSAtIGlrQ29uc3RyYWludC5taXgpICogYWxwaGE7XHJcbiAgICAgICAgICAgIGlrQ29uc3RyYWludC5iZW5kRGlyZWN0aW9uID0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDMpO1xyXG4gICAgICAgIHZhciBwcmV2RnJhbWVNaXggPSBmcmFtZXNbZnJhbWVJbmRleCArIC0yLypQUkVWX0ZSQU1FX01JWCovXTtcclxuICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCArIC0zLypQUkVWX0ZSQU1FX1RJTUUqL10gLSBmcmFtZVRpbWUpO1xyXG4gICAgICAgIHBlcmNlbnQgPSB0aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZnJhbWVJbmRleCAvIDMgLSAxLCBwZXJjZW50KTtcclxuXHJcbiAgICAgICAgdmFyIG1peCA9IHByZXZGcmFtZU1peCArIChmcmFtZXNbZnJhbWVJbmRleCArIDEvKkZSQU1FX01JWCovXSAtIHByZXZGcmFtZU1peCkgKiBwZXJjZW50O1xyXG4gICAgICAgIGlrQ29uc3RyYWludC5taXggKz0gKG1peCAtIGlrQ29uc3RyYWludC5taXgpICogYWxwaGE7XHJcbiAgICAgICAgaWtDb25zdHJhaW50LmJlbmREaXJlY3Rpb24gPSBmcmFtZXNbZnJhbWVJbmRleCArIC0xLypQUkVWX0ZSQU1FX0JFTkRfRElSRUNUSU9OKi9dO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLklrQ29uc3RyYWludFRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJykgfHwge307XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5NZXNoQXR0YWNobWVudCA9IGZ1bmN0aW9uIChuYW1lKVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG59O1xyXG5zcGluZS5NZXNoQXR0YWNobWVudC5wcm90b3R5cGUgPSB7XHJcbiAgICB0eXBlOiBzcGluZS5BdHRhY2htZW50VHlwZS5tZXNoLFxyXG4gICAgdmVydGljZXM6IG51bGwsXHJcbiAgICB1dnM6IG51bGwsXHJcbiAgICByZWdpb25VVnM6IG51bGwsXHJcbiAgICB0cmlhbmdsZXM6IG51bGwsXHJcbiAgICBodWxsTGVuZ3RoOiAwLFxyXG4gICAgcjogMSwgZzogMSwgYjogMSwgYTogMSxcclxuICAgIHBhdGg6IG51bGwsXHJcbiAgICByZW5kZXJlck9iamVjdDogbnVsbCxcclxuICAgIHJlZ2lvblU6IDAsIHJlZ2lvblY6IDAsIHJlZ2lvblUyOiAwLCByZWdpb25WMjogMCwgcmVnaW9uUm90YXRlOiBmYWxzZSxcclxuICAgIHJlZ2lvbk9mZnNldFg6IDAsIHJlZ2lvbk9mZnNldFk6IDAsXHJcbiAgICByZWdpb25XaWR0aDogMCwgcmVnaW9uSGVpZ2h0OiAwLFxyXG4gICAgcmVnaW9uT3JpZ2luYWxXaWR0aDogMCwgcmVnaW9uT3JpZ2luYWxIZWlnaHQ6IDAsXHJcbiAgICBlZGdlczogbnVsbCxcclxuICAgIHdpZHRoOiAwLCBoZWlnaHQ6IDAsXHJcbiAgICB1cGRhdGVVVnM6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5yZWdpb25VMiAtIHRoaXMucmVnaW9uVSwgaGVpZ2h0ID0gdGhpcy5yZWdpb25WMiAtIHRoaXMucmVnaW9uVjtcclxuICAgICAgICB2YXIgbiA9IHRoaXMucmVnaW9uVVZzLmxlbmd0aDtcclxuICAgICAgICBpZiAoIXRoaXMudXZzIHx8IHRoaXMudXZzLmxlbmd0aCAhPSBuKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy51dnMgPSBuZXcgc3BpbmUuRmxvYXQzMkFycmF5KG4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5yZWdpb25Sb3RhdGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKz0gMilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaV0gPSB0aGlzLnJlZ2lvblUgKyB0aGlzLnJlZ2lvblVWc1tpICsgMV0gKiB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIGhlaWdodCAtIHRoaXMucmVnaW9uVVZzW2ldICogaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICs9IDIpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2ldID0gdGhpcy5yZWdpb25VICsgdGhpcy5yZWdpb25VVnNbaV0gKiB3aWR0aDtcclxuICAgICAgICAgICAgICAgIHRoaXMudXZzW2kgKyAxXSA9IHRoaXMucmVnaW9uViArIHRoaXMucmVnaW9uVVZzW2kgKyAxXSAqIGhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjb21wdXRlV29ybGRWZXJ0aWNlczogZnVuY3Rpb24gKHgsIHksIHNsb3QsIHdvcmxkVmVydGljZXMpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmUgPSBzbG90LmJvbmU7XHJcbiAgICAgICAgeCArPSBib25lLndvcmxkWDtcclxuICAgICAgICB5ICs9IGJvbmUud29ybGRZO1xyXG4gICAgICAgIHZhciBtMDAgPSBib25lLm0wMCwgbTAxID0gYm9uZS5tMDEsIG0xMCA9IGJvbmUubTEwLCBtMTEgPSBib25lLm0xMTtcclxuICAgICAgICB2YXIgdmVydGljZXMgPSB0aGlzLnZlcnRpY2VzO1xyXG4gICAgICAgIHZhciB2ZXJ0aWNlc0NvdW50ID0gdmVydGljZXMubGVuZ3RoO1xyXG4gICAgICAgIGlmIChzbG90LmF0dGFjaG1lbnRWZXJ0aWNlcy5sZW5ndGggPT0gdmVydGljZXNDb3VudCkgdmVydGljZXMgPSBzbG90LmF0dGFjaG1lbnRWZXJ0aWNlcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzQ291bnQ7IGkgKz0gMilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB2eCA9IHZlcnRpY2VzW2ldO1xyXG4gICAgICAgICAgICB2YXIgdnkgPSB2ZXJ0aWNlc1tpICsgMV07XHJcbiAgICAgICAgICAgIHdvcmxkVmVydGljZXNbaV0gPSB2eCAqIG0wMCArIHZ5ICogbTAxICsgeDtcclxuICAgICAgICAgICAgd29ybGRWZXJ0aWNlc1tpICsgMV0gPSB2eCAqIG0xMCArIHZ5ICogbTExICsgeTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuTWVzaEF0dGFjaG1lbnQ7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuQXR0YWNobWVudFR5cGUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUeXBlJyk7XHJcbnNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQgPSBmdW5jdGlvbiAobmFtZSlcclxue1xyXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgIHRoaXMub2Zmc2V0ID0gW107XHJcbiAgICB0aGlzLm9mZnNldC5sZW5ndGggPSA4O1xyXG4gICAgdGhpcy51dnMgPSBbXTtcclxuICAgIHRoaXMudXZzLmxlbmd0aCA9IDg7XHJcbn07XHJcbnNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xyXG4gICAgdHlwZTogc3BpbmUuQXR0YWNobWVudFR5cGUucmVnaW9uLFxyXG4gICAgeDogMCwgeTogMCxcclxuICAgIHJvdGF0aW9uOiAwLFxyXG4gICAgc2NhbGVYOiAxLCBzY2FsZVk6IDEsXHJcbiAgICB3aWR0aDogMCwgaGVpZ2h0OiAwLFxyXG4gICAgcjogMSwgZzogMSwgYjogMSwgYTogMSxcclxuICAgIHBhdGg6IG51bGwsXHJcbiAgICByZW5kZXJlck9iamVjdDogbnVsbCxcclxuICAgIHJlZ2lvbk9mZnNldFg6IDAsIHJlZ2lvbk9mZnNldFk6IDAsXHJcbiAgICByZWdpb25XaWR0aDogMCwgcmVnaW9uSGVpZ2h0OiAwLFxyXG4gICAgcmVnaW9uT3JpZ2luYWxXaWR0aDogMCwgcmVnaW9uT3JpZ2luYWxIZWlnaHQ6IDAsXHJcbiAgICBzZXRVVnM6IGZ1bmN0aW9uICh1LCB2LCB1MiwgdjIsIHJvdGF0ZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgdXZzID0gdGhpcy51dnM7XHJcbiAgICAgICAgaWYgKHJvdGF0ZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHV2c1syLypYMiovXSA9IHU7XHJcbiAgICAgICAgICAgIHV2c1szLypZMiovXSA9IHYyO1xyXG4gICAgICAgICAgICB1dnNbNC8qWDMqL10gPSB1O1xyXG4gICAgICAgICAgICB1dnNbNS8qWTMqL10gPSB2O1xyXG4gICAgICAgICAgICB1dnNbNi8qWDQqL10gPSB1MjtcclxuICAgICAgICAgICAgdXZzWzcvKlk0Ki9dID0gdjtcclxuICAgICAgICAgICAgdXZzWzAvKlgxKi9dID0gdTI7XHJcbiAgICAgICAgICAgIHV2c1sxLypZMSovXSA9IHYyO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHV2c1swLypYMSovXSA9IHU7XHJcbiAgICAgICAgICAgIHV2c1sxLypZMSovXSA9IHYyO1xyXG4gICAgICAgICAgICB1dnNbMi8qWDIqL10gPSB1O1xyXG4gICAgICAgICAgICB1dnNbMy8qWTIqL10gPSB2O1xyXG4gICAgICAgICAgICB1dnNbNC8qWDMqL10gPSB1MjtcclxuICAgICAgICAgICAgdXZzWzUvKlkzKi9dID0gdjtcclxuICAgICAgICAgICAgdXZzWzYvKlg0Ki9dID0gdTI7XHJcbiAgICAgICAgICAgIHV2c1s3LypZNCovXSA9IHYyO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICB1cGRhdGVPZmZzZXQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHJlZ2lvblNjYWxlWCA9IHRoaXMud2lkdGggLyB0aGlzLnJlZ2lvbk9yaWdpbmFsV2lkdGggKiB0aGlzLnNjYWxlWDtcclxuICAgICAgICB2YXIgcmVnaW9uU2NhbGVZID0gdGhpcy5oZWlnaHQgLyB0aGlzLnJlZ2lvbk9yaWdpbmFsSGVpZ2h0ICogdGhpcy5zY2FsZVk7XHJcbiAgICAgICAgdmFyIGxvY2FsWCA9IC10aGlzLndpZHRoIC8gMiAqIHRoaXMuc2NhbGVYICsgdGhpcy5yZWdpb25PZmZzZXRYICogcmVnaW9uU2NhbGVYO1xyXG4gICAgICAgIHZhciBsb2NhbFkgPSAtdGhpcy5oZWlnaHQgLyAyICogdGhpcy5zY2FsZVkgKyB0aGlzLnJlZ2lvbk9mZnNldFkgKiByZWdpb25TY2FsZVk7XHJcbiAgICAgICAgdmFyIGxvY2FsWDIgPSBsb2NhbFggKyB0aGlzLnJlZ2lvbldpZHRoICogcmVnaW9uU2NhbGVYO1xyXG4gICAgICAgIHZhciBsb2NhbFkyID0gbG9jYWxZICsgdGhpcy5yZWdpb25IZWlnaHQgKiByZWdpb25TY2FsZVk7XHJcbiAgICAgICAgdmFyIHJhZGlhbnMgPSB0aGlzLnJvdGF0aW9uICogc3BpbmUuZGVnUmFkO1xyXG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhyYWRpYW5zKTtcclxuICAgICAgICB2YXIgc2luID0gTWF0aC5zaW4ocmFkaWFucyk7XHJcbiAgICAgICAgdmFyIGxvY2FsWENvcyA9IGxvY2FsWCAqIGNvcyArIHRoaXMueDtcclxuICAgICAgICB2YXIgbG9jYWxYU2luID0gbG9jYWxYICogc2luO1xyXG4gICAgICAgIHZhciBsb2NhbFlDb3MgPSBsb2NhbFkgKiBjb3MgKyB0aGlzLnk7XHJcbiAgICAgICAgdmFyIGxvY2FsWVNpbiA9IGxvY2FsWSAqIHNpbjtcclxuICAgICAgICB2YXIgbG9jYWxYMkNvcyA9IGxvY2FsWDIgKiBjb3MgKyB0aGlzLng7XHJcbiAgICAgICAgdmFyIGxvY2FsWDJTaW4gPSBsb2NhbFgyICogc2luO1xyXG4gICAgICAgIHZhciBsb2NhbFkyQ29zID0gbG9jYWxZMiAqIGNvcyArIHRoaXMueTtcclxuICAgICAgICB2YXIgbG9jYWxZMlNpbiA9IGxvY2FsWTIgKiBzaW47XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMub2Zmc2V0O1xyXG4gICAgICAgIG9mZnNldFswLypYMSovXSA9IGxvY2FsWENvcyAtIGxvY2FsWVNpbjtcclxuICAgICAgICBvZmZzZXRbMS8qWTEqL10gPSBsb2NhbFlDb3MgKyBsb2NhbFhTaW47XHJcbiAgICAgICAgb2Zmc2V0WzIvKlgyKi9dID0gbG9jYWxYQ29zIC0gbG9jYWxZMlNpbjtcclxuICAgICAgICBvZmZzZXRbMy8qWTIqL10gPSBsb2NhbFkyQ29zICsgbG9jYWxYU2luO1xyXG4gICAgICAgIG9mZnNldFs0LypYMyovXSA9IGxvY2FsWDJDb3MgLSBsb2NhbFkyU2luO1xyXG4gICAgICAgIG9mZnNldFs1LypZMyovXSA9IGxvY2FsWTJDb3MgKyBsb2NhbFgyU2luO1xyXG4gICAgICAgIG9mZnNldFs2LypYNCovXSA9IGxvY2FsWDJDb3MgLSBsb2NhbFlTaW47XHJcbiAgICAgICAgb2Zmc2V0WzcvKlk0Ki9dID0gbG9jYWxZQ29zICsgbG9jYWxYMlNpbjtcclxuICAgIH0sXHJcbiAgICBjb21wdXRlVmVydGljZXM6IGZ1bmN0aW9uICh4LCB5LCBib25lLCB2ZXJ0aWNlcylcclxuICAgIHtcclxuICAgICAgICB4ICs9IGJvbmUud29ybGRYO1xyXG4gICAgICAgIHkgKz0gYm9uZS53b3JsZFk7XHJcbiAgICAgICAgdmFyIG0wMCA9IGJvbmUubTAwLCBtMDEgPSBib25lLm0wMSwgbTEwID0gYm9uZS5tMTAsIG0xMSA9IGJvbmUubTExO1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLm9mZnNldDtcclxuICAgICAgICB2ZXJ0aWNlc1swLypYMSovXSA9IG9mZnNldFswLypYMSovXSAqIG0wMCArIG9mZnNldFsxLypZMSovXSAqIG0wMSArIHg7XHJcbiAgICAgICAgdmVydGljZXNbMS8qWTEqL10gPSBvZmZzZXRbMC8qWDEqL10gKiBtMTAgKyBvZmZzZXRbMS8qWTEqL10gKiBtMTEgKyB5O1xyXG4gICAgICAgIHZlcnRpY2VzWzIvKlgyKi9dID0gb2Zmc2V0WzIvKlgyKi9dICogbTAwICsgb2Zmc2V0WzMvKlkyKi9dICogbTAxICsgeDtcclxuICAgICAgICB2ZXJ0aWNlc1szLypZMiovXSA9IG9mZnNldFsyLypYMiovXSAqIG0xMCArIG9mZnNldFszLypZMiovXSAqIG0xMSArIHk7XHJcbiAgICAgICAgdmVydGljZXNbNC8qWDMqL10gPSBvZmZzZXRbNC8qWDMqL10gKiBtMDAgKyBvZmZzZXRbNS8qWDMqL10gKiBtMDEgKyB4O1xyXG4gICAgICAgIHZlcnRpY2VzWzUvKlgzKi9dID0gb2Zmc2V0WzQvKlgzKi9dICogbTEwICsgb2Zmc2V0WzUvKlgzKi9dICogbTExICsgeTtcclxuICAgICAgICB2ZXJ0aWNlc1s2LypYNCovXSA9IG9mZnNldFs2LypYNCovXSAqIG0wMCArIG9mZnNldFs3LypZNCovXSAqIG0wMSArIHg7XHJcbiAgICAgICAgdmVydGljZXNbNy8qWTQqL10gPSBvZmZzZXRbNi8qWDQqL10gKiBtMTAgKyBvZmZzZXRbNy8qWTQqL10gKiBtMTEgKyB5O1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQ7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKSB8fCB7fTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuUm90YXRlVGltZWxpbmUgPSBmdW5jdGlvbiAoZnJhbWVDb3VudClcclxue1xyXG4gICAgdGhpcy5jdXJ2ZXMgPSBuZXcgc3BpbmUuQ3VydmVzKGZyYW1lQ291bnQpO1xyXG4gICAgdGhpcy5mcmFtZXMgPSBbXTsgLy8gdGltZSwgYW5nbGUsIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDI7XHJcbn07XHJcbnNwaW5lLlJvdGF0ZVRpbWVsaW5lLnByb3RvdHlwZSA9IHtcclxuICAgIGJvbmVJbmRleDogMCxcclxuICAgIGdldEZyYW1lQ291bnQ6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aCAvIDI7XHJcbiAgICB9LFxyXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uIChmcmFtZUluZGV4LCB0aW1lLCBhbmdsZSlcclxuICAgIHtcclxuICAgICAgICBmcmFtZUluZGV4ICo9IDI7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IGFuZ2xlO1xyXG4gICAgfSxcclxuICAgIGFwcGx5OiBmdW5jdGlvbiAoc2tlbGV0b24sIGxhc3RUaW1lLCB0aW1lLCBmaXJlZEV2ZW50cywgYWxwaGEpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGZyYW1lcyA9IHRoaXMuZnJhbWVzO1xyXG4gICAgICAgIGlmICh0aW1lIDwgZnJhbWVzWzBdKSByZXR1cm47IC8vIFRpbWUgaXMgYmVmb3JlIGZpcnN0IGZyYW1lLlxyXG5cclxuICAgICAgICB2YXIgYm9uZSA9IHNrZWxldG9uLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtcclxuXHJcbiAgICAgICAgaWYgKHRpbWUgPj0gZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAyXSlcclxuICAgICAgICB7IC8vIFRpbWUgaXMgYWZ0ZXIgbGFzdCBmcmFtZS5cclxuICAgICAgICAgICAgdmFyIGFtb3VudCA9IGJvbmUuZGF0YS5yb3RhdGlvbiArIGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMV0gLSBib25lLnJvdGF0aW9uO1xyXG4gICAgICAgICAgICB3aGlsZSAoYW1vdW50ID4gMTgwKVxyXG4gICAgICAgICAgICAgICAgYW1vdW50IC09IDM2MDtcclxuICAgICAgICAgICAgd2hpbGUgKGFtb3VudCA8IC0xODApXHJcbiAgICAgICAgICAgICAgICBhbW91bnQgKz0gMzYwO1xyXG4gICAgICAgICAgICBib25lLnJvdGF0aW9uICs9IGFtb3VudCAqIGFscGhhO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSBhbmQgdGhlIGN1cnJlbnQgZnJhbWUuXHJcbiAgICAgICAgdmFyIGZyYW1lSW5kZXggPSBzcGluZS5BbmltYXRpb24uYmluYXJ5U2VhcmNoKGZyYW1lcywgdGltZSwgMik7XHJcbiAgICAgICAgdmFyIHByZXZGcmFtZVZhbHVlID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAxXTtcclxuICAgICAgICB2YXIgZnJhbWVUaW1lID0gZnJhbWVzW2ZyYW1lSW5kZXhdO1xyXG4gICAgICAgIHZhciBwZXJjZW50ID0gMSAtICh0aW1lIC0gZnJhbWVUaW1lKSAvIChmcmFtZXNbZnJhbWVJbmRleCAtIDIvKlBSRVZfRlJBTUVfVElNRSovXSAtIGZyYW1lVGltZSk7XHJcbiAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC8gMiAtIDEsIHBlcmNlbnQpO1xyXG5cclxuICAgICAgICB2YXIgYW1vdW50ID0gZnJhbWVzW2ZyYW1lSW5kZXggKyAxLypGUkFNRV9WQUxVRSovXSAtIHByZXZGcmFtZVZhbHVlO1xyXG4gICAgICAgIHdoaWxlIChhbW91bnQgPiAxODApXHJcbiAgICAgICAgICAgIGFtb3VudCAtPSAzNjA7XHJcbiAgICAgICAgd2hpbGUgKGFtb3VudCA8IC0xODApXHJcbiAgICAgICAgICAgIGFtb3VudCArPSAzNjA7XHJcbiAgICAgICAgYW1vdW50ID0gYm9uZS5kYXRhLnJvdGF0aW9uICsgKHByZXZGcmFtZVZhbHVlICsgYW1vdW50ICogcGVyY2VudCkgLSBib25lLnJvdGF0aW9uO1xyXG4gICAgICAgIHdoaWxlIChhbW91bnQgPiAxODApXHJcbiAgICAgICAgICAgIGFtb3VudCAtPSAzNjA7XHJcbiAgICAgICAgd2hpbGUgKGFtb3VudCA8IC0xODApXHJcbiAgICAgICAgICAgIGFtb3VudCArPSAzNjA7XHJcbiAgICAgICAgYm9uZS5yb3RhdGlvbiArPSBhbW91bnQgKiBhbHBoYTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Sb3RhdGVUaW1lbGluZTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xyXG5zcGluZS5TY2FsZVRpbWVsaW5lID0gZnVuY3Rpb24gKGZyYW1lQ291bnQpXHJcbntcclxuICAgIHRoaXMuY3VydmVzID0gbmV3IHNwaW5lLkN1cnZlcyhmcmFtZUNvdW50KTtcclxuICAgIHRoaXMuZnJhbWVzID0gW107IC8vIHRpbWUsIHgsIHksIC4uLlxyXG4gICAgdGhpcy5mcmFtZXMubGVuZ3RoID0gZnJhbWVDb3VudCAqIDM7XHJcbn07XHJcbnNwaW5lLlNjYWxlVGltZWxpbmUucHJvdG90eXBlID0ge1xyXG4gICAgYm9uZUluZGV4OiAwLFxyXG4gICAgZ2V0RnJhbWVDb3VudDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoIC8gMztcclxuICAgIH0sXHJcbiAgICBzZXRGcmFtZTogZnVuY3Rpb24gKGZyYW1lSW5kZXgsIHRpbWUsIHgsIHkpXHJcbiAgICB7XHJcbiAgICAgICAgZnJhbWVJbmRleCAqPSAzO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXhdID0gdGltZTtcclxuICAgICAgICB0aGlzLmZyYW1lc1tmcmFtZUluZGV4ICsgMV0gPSB4O1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAyXSA9IHk7XHJcbiAgICB9LFxyXG4gICAgYXBwbHk6IGZ1bmN0aW9uIChza2VsZXRvbiwgbGFzdFRpbWUsIHRpbWUsIGZpcmVkRXZlbnRzLCBhbHBoYSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZnJhbWVzID0gdGhpcy5mcmFtZXM7XHJcbiAgICAgICAgaWYgKHRpbWUgPCBmcmFtZXNbMF0pIHJldHVybjsgLy8gVGltZSBpcyBiZWZvcmUgZmlyc3QgZnJhbWUuXHJcblxyXG4gICAgICAgIHZhciBib25lID0gc2tlbGV0b24uYm9uZXNbdGhpcy5ib25lSW5kZXhdO1xyXG5cclxuICAgICAgICBpZiAodGltZSA+PSBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDNdKVxyXG4gICAgICAgIHsgLy8gVGltZSBpcyBhZnRlciBsYXN0IGZyYW1lLlxyXG4gICAgICAgICAgICBib25lLnNjYWxlWCArPSAoYm9uZS5kYXRhLnNjYWxlWCAqIGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gMl0gLSBib25lLnNjYWxlWCkgKiBhbHBoYTtcclxuICAgICAgICAgICAgYm9uZS5zY2FsZVkgKz0gKGJvbmUuZGF0YS5zY2FsZVkgKiBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDFdIC0gYm9uZS5zY2FsZVkpICogYWxwaGE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEludGVycG9sYXRlIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIGFuZCB0aGUgY3VycmVudCBmcmFtZS5cclxuICAgICAgICB2YXIgZnJhbWVJbmRleCA9IHNwaW5lLkFuaW1hdGlvbi5iaW5hcnlTZWFyY2goZnJhbWVzLCB0aW1lLCAzKTtcclxuICAgICAgICB2YXIgcHJldkZyYW1lWCA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMl07XHJcbiAgICAgICAgdmFyIHByZXZGcmFtZVkgPSBmcmFtZXNbZnJhbWVJbmRleCAtIDFdO1xyXG4gICAgICAgIHZhciBmcmFtZVRpbWUgPSBmcmFtZXNbZnJhbWVJbmRleF07XHJcbiAgICAgICAgdmFyIHBlcmNlbnQgPSAxIC0gKHRpbWUgLSBmcmFtZVRpbWUpIC8gKGZyYW1lc1tmcmFtZUluZGV4ICsgLTMvKlBSRVZfRlJBTUVfVElNRSovXSAtIGZyYW1lVGltZSk7XHJcbiAgICAgICAgcGVyY2VudCA9IHRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChmcmFtZUluZGV4IC8gMyAtIDEsIHBlcmNlbnQpO1xyXG5cclxuICAgICAgICBib25lLnNjYWxlWCArPSAoYm9uZS5kYXRhLnNjYWxlWCAqIChwcmV2RnJhbWVYICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMS8qRlJBTUVfWCovXSAtIHByZXZGcmFtZVgpICogcGVyY2VudCkgLSBib25lLnNjYWxlWCkgKiBhbHBoYTtcclxuICAgICAgICBib25lLnNjYWxlWSArPSAoYm9uZS5kYXRhLnNjYWxlWSAqIChwcmV2RnJhbWVZICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMi8qRlJBTUVfWSovXSAtIHByZXZGcmFtZVkpICogcGVyY2VudCkgLSBib25lLnNjYWxlWSkgKiBhbHBoYTtcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5TY2FsZVRpbWVsaW5lO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLkJvbmUgPSByZXF1aXJlKCcuL0JvbmUnKTtcclxuc3BpbmUuU2xvdCA9IHJlcXVpcmUoJy4vU2xvdCcpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnQgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludCcpO1xyXG5zcGluZS5Ta2VsZXRvbiA9IGZ1bmN0aW9uIChza2VsZXRvbkRhdGEpXHJcbntcclxuICAgIHRoaXMuZGF0YSA9IHNrZWxldG9uRGF0YTtcclxuXHJcbiAgICB0aGlzLmJvbmVzID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNrZWxldG9uRGF0YS5ib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVEYXRhID0gc2tlbGV0b25EYXRhLmJvbmVzW2ldO1xyXG4gICAgICAgIHZhciBwYXJlbnQgPSAhYm9uZURhdGEucGFyZW50ID8gbnVsbCA6IHRoaXMuYm9uZXNbc2tlbGV0b25EYXRhLmJvbmVzLmluZGV4T2YoYm9uZURhdGEucGFyZW50KV07XHJcbiAgICAgICAgdGhpcy5ib25lcy5wdXNoKG5ldyBzcGluZS5Cb25lKGJvbmVEYXRhLCB0aGlzLCBwYXJlbnQpKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNsb3RzID0gW107XHJcbiAgICB0aGlzLmRyYXdPcmRlciA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBza2VsZXRvbkRhdGEuc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90RGF0YSA9IHNrZWxldG9uRGF0YS5zbG90c1tpXTtcclxuICAgICAgICB2YXIgYm9uZSA9IHRoaXMuYm9uZXNbc2tlbGV0b25EYXRhLmJvbmVzLmluZGV4T2Yoc2xvdERhdGEuYm9uZURhdGEpXTtcclxuICAgICAgICB2YXIgc2xvdCA9IG5ldyBzcGluZS5TbG90KHNsb3REYXRhLCBib25lKTtcclxuICAgICAgICB0aGlzLnNsb3RzLnB1c2goc2xvdCk7XHJcbiAgICAgICAgdGhpcy5kcmF3T3JkZXIucHVzaChpKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmlrQ29uc3RyYWludHMgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2tlbGV0b25EYXRhLmlrQ29uc3RyYWludHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHRoaXMuaWtDb25zdHJhaW50cy5wdXNoKG5ldyBzcGluZS5Ja0NvbnN0cmFpbnQoc2tlbGV0b25EYXRhLmlrQ29uc3RyYWludHNbaV0sIHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLmJvbmVDYWNoZSA9IFtdO1xyXG4gICAgdGhpcy51cGRhdGVDYWNoZSgpO1xyXG59O1xyXG5zcGluZS5Ta2VsZXRvbi5wcm90b3R5cGUgPSB7XHJcbiAgICB4OiAwLCB5OiAwLFxyXG4gICAgc2tpbjogbnVsbCxcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICB0aW1lOiAwLFxyXG4gICAgZmxpcFg6IGZhbHNlLCBmbGlwWTogZmFsc2UsXHJcbiAgICAvKiogQ2FjaGVzIGluZm9ybWF0aW9uIGFib3V0IGJvbmVzIGFuZCBJSyBjb25zdHJhaW50cy4gTXVzdCBiZSBjYWxsZWQgaWYgYm9uZXMgb3IgSUsgY29uc3RyYWludHMgYXJlIGFkZGVkIG9yIHJlbW92ZWQuICovXHJcbiAgICB1cGRhdGVDYWNoZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB2YXIgaWtDb25zdHJhaW50cyA9IHRoaXMuaWtDb25zdHJhaW50cztcclxuICAgICAgICB2YXIgaWtDb25zdHJhaW50c0NvdW50ID0gaWtDb25zdHJhaW50cy5sZW5ndGg7XHJcblxyXG4gICAgICAgIHZhciBhcnJheUNvdW50ID0gaWtDb25zdHJhaW50c0NvdW50ICsgMTtcclxuICAgICAgICB2YXIgYm9uZUNhY2hlID0gdGhpcy5ib25lQ2FjaGU7XHJcbiAgICAgICAgaWYgKGJvbmVDYWNoZS5sZW5ndGggPiBhcnJheUNvdW50KSBib25lQ2FjaGUubGVuZ3RoID0gYXJyYXlDb3VudDtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVDYWNoZS5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGJvbmVDYWNoZVtpXS5sZW5ndGggPSAwO1xyXG4gICAgICAgIHdoaWxlIChib25lQ2FjaGUubGVuZ3RoIDwgYXJyYXlDb3VudClcclxuICAgICAgICAgICAgYm9uZUNhY2hlW2JvbmVDYWNoZS5sZW5ndGhdID0gW107XHJcblxyXG4gICAgICAgIHZhciBub25Ja0JvbmVzID0gYm9uZUNhY2hlWzBdO1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcblxyXG4gICAgICAgIG91dGVyOlxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGJvbmUgPSBib25lc1tpXTtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBib25lO1xyXG4gICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaWtDb25zdHJhaW50c0NvdW50OyBpaSsrKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBpa0NvbnN0cmFpbnRzW2lpXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gaWtDb25zdHJhaW50LmJvbmVzWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZD0gaWtDb25zdHJhaW50LmJvbmVzW2lrQ29uc3RyYWludC5ib25lcy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodHJ1ZSlcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50ID09IGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib25lQ2FjaGVbaWldLnB1c2goYm9uZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib25lQ2FjaGVbaWkgKyAxXS5wdXNoKGJvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkID09IHBhcmVudCkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkID0gY2hpbGQucGFyZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudDtcclxuICAgICAgICAgICAgfSB3aGlsZSAoY3VycmVudCk7XHJcbiAgICAgICAgICAgIG5vbklrQm9uZXNbbm9uSWtCb25lcy5sZW5ndGhdID0gYm9uZTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgLyoqIFVwZGF0ZXMgdGhlIHdvcmxkIHRyYW5zZm9ybSBmb3IgZWFjaCBib25lLiAqL1xyXG4gICAgdXBkYXRlV29ybGRUcmFuc2Zvcm06IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBib25lID0gYm9uZXNbaV07XHJcbiAgICAgICAgICAgIGJvbmUucm90YXRpb25JSyA9IGJvbmUucm90YXRpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpID0gMCwgbGFzdCA9IHRoaXMuYm9uZUNhY2hlLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgY2FjaGVCb25lcyA9IHRoaXMuYm9uZUNhY2hlW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IDAsIG5uID0gY2FjaGVCb25lcy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXHJcbiAgICAgICAgICAgICAgICBjYWNoZUJvbmVzW2lpXS51cGRhdGVXb3JsZFRyYW5zZm9ybSgpO1xyXG4gICAgICAgICAgICBpZiAoaSA9PSBsYXN0KSBicmVhaztcclxuICAgICAgICAgICAgdGhpcy5pa0NvbnN0cmFpbnRzW2ldLmFwcGx5KCk7XHJcbiAgICAgICAgICAgIGkrKztcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgLyoqIFNldHMgdGhlIGJvbmVzIGFuZCBzbG90cyB0byB0aGVpciBzZXR1cCBwb3NlIHZhbHVlcy4gKi9cclxuICAgIHNldFRvU2V0dXBQb3NlOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuc2V0Qm9uZXNUb1NldHVwUG9zZSgpO1xyXG4gICAgICAgIHRoaXMuc2V0U2xvdHNUb1NldHVwUG9zZSgpO1xyXG4gICAgfSxcclxuICAgIHNldEJvbmVzVG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgYm9uZXNbaV0uc2V0VG9TZXR1cFBvc2UoKTtcclxuXHJcbiAgICAgICAgdmFyIGlrQ29uc3RyYWludHMgPSB0aGlzLmlrQ29uc3RyYWludHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBpa0NvbnN0cmFpbnRzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBpa0NvbnN0cmFpbnQgPSBpa0NvbnN0cmFpbnRzW2ldO1xyXG4gICAgICAgICAgICBpa0NvbnN0cmFpbnQuYmVuZERpcmVjdGlvbiA9IGlrQ29uc3RyYWludC5kYXRhLmJlbmREaXJlY3Rpb247XHJcbiAgICAgICAgICAgIGlrQ29uc3RyYWludC5taXggPSBpa0NvbnN0cmFpbnQuZGF0YS5taXg7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIHNldFNsb3RzVG9TZXR1cFBvc2U6IGZ1bmN0aW9uICgpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHNsb3RzW2ldLnNldFRvU2V0dXBQb3NlKGkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZXNldERyYXdPcmRlcigpO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSByZXR1cm4gbnVsbC4gKi9cclxuICAgIGdldFJvb3RCb25lOiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvbmVzLmxlbmd0aCA/IHRoaXMuYm9uZXNbMF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZmluZEJvbmU6IGZ1bmN0aW9uIChib25lTmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0uZGF0YS5uYW1lID09IGJvbmVOYW1lKSByZXR1cm4gYm9uZXNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gLTEgaWYgdGhlIGJvbmUgd2FzIG5vdCBmb3VuZC4gKi9cclxuICAgIGZpbmRCb25lSW5kZXg6IGZ1bmN0aW9uIChib25lTmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gYm9uZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoYm9uZXNbaV0uZGF0YS5uYW1lID09IGJvbmVOYW1lKSByZXR1cm4gaTtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kU2xvdDogZnVuY3Rpb24gKHNsb3ROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChzbG90c1tpXS5kYXRhLm5hbWUgPT0gc2xvdE5hbWUpIHJldHVybiBzbG90c1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiAtMSBpZiB0aGUgYm9uZSB3YXMgbm90IGZvdW5kLiAqL1xyXG4gICAgZmluZFNsb3RJbmRleDogZnVuY3Rpb24gKHNsb3ROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChzbG90c1tpXS5kYXRhLm5hbWUgPT0gc2xvdE5hbWUpIHJldHVybiBpO1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH0sXHJcbiAgICBzZXRTa2luQnlOYW1lOiBmdW5jdGlvbiAoc2tpbk5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNraW4gPSB0aGlzLmRhdGEuZmluZFNraW4oc2tpbk5hbWUpO1xyXG4gICAgICAgIGlmICghc2tpbikgdGhyb3cgXCJTa2luIG5vdCBmb3VuZDogXCIgKyBza2luTmFtZTtcclxuICAgICAgICB0aGlzLnNldFNraW4oc2tpbik7XHJcbiAgICB9LFxyXG4gICAgLyoqIFNldHMgdGhlIHNraW4gdXNlZCB0byBsb29rIHVwIGF0dGFjaG1lbnRzIGJlZm9yZSBsb29raW5nIGluIHRoZSB7QGxpbmsgU2tlbGV0b25EYXRhI2dldERlZmF1bHRTa2luKCkgZGVmYXVsdCBza2lufS5cclxuICAgICAqIEF0dGFjaG1lbnRzIGZyb20gdGhlIG5ldyBza2luIGFyZSBhdHRhY2hlZCBpZiB0aGUgY29ycmVzcG9uZGluZyBhdHRhY2htZW50IGZyb20gdGhlIG9sZCBza2luIHdhcyBhdHRhY2hlZC4gSWYgdGhlcmUgd2FzXHJcbiAgICAgKiBubyBvbGQgc2tpbiwgZWFjaCBzbG90J3Mgc2V0dXAgbW9kZSBhdHRhY2htZW50IGlzIGF0dGFjaGVkIGZyb20gdGhlIG5ldyBza2luLlxyXG4gICAgICogQHBhcmFtIG5ld1NraW4gTWF5IGJlIG51bGwuICovXHJcbiAgICBzZXRTa2luOiBmdW5jdGlvbiAobmV3U2tpbilcclxuICAgIHtcclxuICAgICAgICBpZiAobmV3U2tpbilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNraW4pXHJcbiAgICAgICAgICAgICAgICBuZXdTa2luLl9hdHRhY2hBbGwodGhpcywgdGhpcy5za2luKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2xvdHMgPSB0aGlzLnNsb3RzO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNsb3QgPSBzbG90c1tpXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IHNsb3QuZGF0YS5hdHRhY2htZW50TmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSlcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gbmV3U2tpbi5nZXRBdHRhY2htZW50KGksIG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0YWNobWVudCkgc2xvdC5zZXRBdHRhY2htZW50KGF0dGFjaG1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNraW4gPSBuZXdTa2luO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZ2V0QXR0YWNobWVudEJ5U2xvdE5hbWU6IGZ1bmN0aW9uIChzbG90TmFtZSwgYXR0YWNobWVudE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KHRoaXMuZGF0YS5maW5kU2xvdEluZGV4KHNsb3ROYW1lKSwgYXR0YWNobWVudE5hbWUpO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4OiBmdW5jdGlvbiAoc2xvdEluZGV4LCBhdHRhY2htZW50TmFtZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5za2luKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSB0aGlzLnNraW4uZ2V0QXR0YWNobWVudChzbG90SW5kZXgsIGF0dGFjaG1lbnROYW1lKTtcclxuICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnQpIHJldHVybiBhdHRhY2htZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5kYXRhLmRlZmF1bHRTa2luKSByZXR1cm4gdGhpcy5kYXRhLmRlZmF1bHRTa2luLmdldEF0dGFjaG1lbnQoc2xvdEluZGV4LCBhdHRhY2htZW50TmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgLyoqIEBwYXJhbSBhdHRhY2htZW50TmFtZSBNYXkgYmUgbnVsbC4gKi9cclxuICAgIHNldEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChzbG90TmFtZSwgYXR0YWNobWVudE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBzbG90ID0gc2xvdHNbaV07XHJcbiAgICAgICAgICAgIGlmIChzbG90LmRhdGEubmFtZSA9PSBzbG90TmFtZSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKGF0dGFjaG1lbnROYW1lKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dGFjaG1lbnQgPSB0aGlzLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleChpLCBhdHRhY2htZW50TmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRhY2htZW50KSB0aHJvdyBcIkF0dGFjaG1lbnQgbm90IGZvdW5kOiBcIiArIGF0dGFjaG1lbnROYW1lICsgXCIsIGZvciBzbG90OiBcIiArIHNsb3ROYW1lO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2xvdC5zZXRBdHRhY2htZW50KGF0dGFjaG1lbnQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IFwiU2xvdCBub3QgZm91bmQ6IFwiICsgc2xvdE5hbWU7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kSWtDb25zdHJhaW50OiBmdW5jdGlvbiAoaWtDb25zdHJhaW50TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgaWtDb25zdHJhaW50cyA9IHRoaXMuaWtDb25zdHJhaW50cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGlrQ29uc3RyYWludHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoaWtDb25zdHJhaW50c1tpXS5kYXRhLm5hbWUgPT0gaWtDb25zdHJhaW50TmFtZSkgcmV0dXJuIGlrQ29uc3RyYWludHNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZGVsdGEpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy50aW1lICs9IGRlbHRhO1xyXG4gICAgfSxcclxuICAgIHJlc2V0RHJhd09yZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLmRyYXdPcmRlci5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmRyYXdPcmRlcltpXSA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNrZWxldG9uO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVSdW50aW1lJykgfHwge307XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5Ta2VsZXRvbkJvdW5kcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICAgIHRoaXMucG9seWdvblBvb2wgPSBbXTtcclxuICAgIHRoaXMucG9seWdvbnMgPSBbXTtcclxuICAgIHRoaXMuYm91bmRpbmdCb3hlcyA9IFtdO1xyXG59O1xyXG5zcGluZS5Ta2VsZXRvbkJvdW5kcy5wcm90b3R5cGUgPSB7XHJcbiAgICBtaW5YOiAwLCBtaW5ZOiAwLCBtYXhYOiAwLCBtYXhZOiAwLFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoc2tlbGV0b24sIHVwZGF0ZUFhYmIpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3RzID0gc2tlbGV0b24uc2xvdHM7XHJcbiAgICAgICAgdmFyIHNsb3RDb3VudCA9IHNsb3RzLmxlbmd0aDtcclxuICAgICAgICB2YXIgeCA9IHNrZWxldG9uLngsIHkgPSBza2VsZXRvbi55O1xyXG4gICAgICAgIHZhciBib3VuZGluZ0JveGVzID0gdGhpcy5ib3VuZGluZ0JveGVzO1xyXG4gICAgICAgIHZhciBwb2x5Z29uUG9vbCA9IHRoaXMucG9seWdvblBvb2w7XHJcbiAgICAgICAgdmFyIHBvbHlnb25zID0gdGhpcy5wb2x5Z29ucztcclxuXHJcbiAgICAgICAgYm91bmRpbmdCb3hlcy5sZW5ndGggPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gcG9seWdvbnMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBwb2x5Z29uUG9vbC5wdXNoKHBvbHlnb25zW2ldKTtcclxuICAgICAgICBwb2x5Z29ucy5sZW5ndGggPSAwO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsb3RDb3VudDsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHNsb3QgPSBzbG90c1tpXTtcclxuICAgICAgICAgICAgdmFyIGJvdW5kaW5nQm94ID0gc2xvdC5hdHRhY2htZW50O1xyXG4gICAgICAgICAgICBpZiAoYm91bmRpbmdCb3gudHlwZSAhPSBzcGluZS5BdHRhY2htZW50VHlwZS5ib3VuZGluZ2JveCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGJvdW5kaW5nQm94ZXMucHVzaChib3VuZGluZ0JveCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9vbENvdW50ID0gcG9seWdvblBvb2wubGVuZ3RoLCBwb2x5Z29uO1xyXG4gICAgICAgICAgICBpZiAocG9vbENvdW50ID4gMClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcG9seWdvbiA9IHBvbHlnb25Qb29sW3Bvb2xDb3VudCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgcG9seWdvblBvb2wuc3BsaWNlKHBvb2xDb3VudCAtIDEsIDEpO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHBvbHlnb24gPSBbXTtcclxuICAgICAgICAgICAgcG9seWdvbnMucHVzaChwb2x5Z29uKTtcclxuXHJcbiAgICAgICAgICAgIHBvbHlnb24ubGVuZ3RoID0gYm91bmRpbmdCb3gudmVydGljZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICBib3VuZGluZ0JveC5jb21wdXRlV29ybGRWZXJ0aWNlcyh4LCB5LCBzbG90LmJvbmUsIHBvbHlnb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHVwZGF0ZUFhYmIpIHRoaXMuYWFiYkNvbXB1dGUoKTtcclxuICAgIH0sXHJcbiAgICBhYWJiQ29tcHV0ZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB2YXIgcG9seWdvbnMgPSB0aGlzLnBvbHlnb25zO1xyXG4gICAgICAgIHZhciBtaW5YID0gTnVtYmVyLk1BWF9WQUxVRSwgbWluWSA9IE51bWJlci5NQVhfVkFMVUUsIG1heFggPSBOdW1iZXIuTUlOX1ZBTFVFLCBtYXhZID0gTnVtYmVyLk1JTl9WQUxVRTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNlcyA9IHBvbHlnb25zW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IDAsIG5uID0gdmVydGljZXMubGVuZ3RoOyBpaSA8IG5uOyBpaSArPSAyKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHZlcnRpY2VzW2lpXTtcclxuICAgICAgICAgICAgICAgIHZhciB5ID0gdmVydGljZXNbaWkgKyAxXTtcclxuICAgICAgICAgICAgICAgIG1pblggPSBNYXRoLm1pbihtaW5YLCB4KTtcclxuICAgICAgICAgICAgICAgIG1pblkgPSBNYXRoLm1pbihtaW5ZLCB5KTtcclxuICAgICAgICAgICAgICAgIG1heFggPSBNYXRoLm1heChtYXhYLCB4KTtcclxuICAgICAgICAgICAgICAgIG1heFkgPSBNYXRoLm1heChtYXhZLCB5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm1pblggPSBtaW5YO1xyXG4gICAgICAgIHRoaXMubWluWSA9IG1pblk7XHJcbiAgICAgICAgdGhpcy5tYXhYID0gbWF4WDtcclxuICAgICAgICB0aGlzLm1heFkgPSBtYXhZO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIGF4aXMgYWxpZ25lZCBib3VuZGluZyBib3ggY29udGFpbnMgdGhlIHBvaW50LiAqL1xyXG4gICAgYWFiYkNvbnRhaW5zUG9pbnQ6IGZ1bmN0aW9uICh4LCB5KVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB4ID49IHRoaXMubWluWCAmJiB4IDw9IHRoaXMubWF4WCAmJiB5ID49IHRoaXMubWluWSAmJiB5IDw9IHRoaXMubWF4WTtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBheGlzIGFsaWduZWQgYm91bmRpbmcgYm94IGludGVyc2VjdHMgdGhlIGxpbmUgc2VnbWVudC4gKi9cclxuICAgIGFhYmJJbnRlcnNlY3RzU2VnbWVudDogZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBtaW5YID0gdGhpcy5taW5YLCBtaW5ZID0gdGhpcy5taW5ZLCBtYXhYID0gdGhpcy5tYXhYLCBtYXhZID0gdGhpcy5tYXhZO1xyXG4gICAgICAgIGlmICgoeDEgPD0gbWluWCAmJiB4MiA8PSBtaW5YKSB8fCAoeTEgPD0gbWluWSAmJiB5MiA8PSBtaW5ZKSB8fCAoeDEgPj0gbWF4WCAmJiB4MiA+PSBtYXhYKSB8fCAoeTEgPj0gbWF4WSAmJiB5MiA+PSBtYXhZKSlcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHZhciBtID0gKHkyIC0geTEpIC8gKHgyIC0geDEpO1xyXG4gICAgICAgIHZhciB5ID0gbSAqIChtaW5YIC0geDEpICsgeTE7XHJcbiAgICAgICAgaWYgKHkgPiBtaW5ZICYmIHkgPCBtYXhZKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB5ID0gbSAqIChtYXhYIC0geDEpICsgeTE7XHJcbiAgICAgICAgaWYgKHkgPiBtaW5ZICYmIHkgPCBtYXhZKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB2YXIgeCA9IChtaW5ZIC0geTEpIC8gbSArIHgxO1xyXG4gICAgICAgIGlmICh4ID4gbWluWCAmJiB4IDwgbWF4WCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgeCA9IChtYXhZIC0geTEpIC8gbSArIHgxO1xyXG4gICAgICAgIGlmICh4ID4gbWluWCAmJiB4IDwgbWF4WCkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIGF4aXMgYWxpZ25lZCBib3VuZGluZyBib3ggaW50ZXJzZWN0cyB0aGUgYXhpcyBhbGlnbmVkIGJvdW5kaW5nIGJveCBvZiB0aGUgc3BlY2lmaWVkIGJvdW5kcy4gKi9cclxuICAgIGFhYmJJbnRlcnNlY3RzU2tlbGV0b246IGZ1bmN0aW9uIChib3VuZHMpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWluWCA8IGJvdW5kcy5tYXhYICYmIHRoaXMubWF4WCA+IGJvdW5kcy5taW5YICYmIHRoaXMubWluWSA8IGJvdW5kcy5tYXhZICYmIHRoaXMubWF4WSA+IGJvdW5kcy5taW5ZO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRoZSBmaXJzdCBib3VuZGluZyBib3ggYXR0YWNobWVudCB0aGF0IGNvbnRhaW5zIHRoZSBwb2ludCwgb3IgbnVsbC4gV2hlbiBkb2luZyBtYW55IGNoZWNrcywgaXQgaXMgdXN1YWxseSBtb3JlXHJcbiAgICAgKiBlZmZpY2llbnQgdG8gb25seSBjYWxsIHRoaXMgbWV0aG9kIGlmIHtAbGluayAjYWFiYkNvbnRhaW5zUG9pbnQoZmxvYXQsIGZsb2F0KX0gcmV0dXJucyB0cnVlLiAqL1xyXG4gICAgY29udGFpbnNQb2ludDogZnVuY3Rpb24gKHgsIHkpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHBvbHlnb25zID0gdGhpcy5wb2x5Z29ucztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKHRoaXMucG9seWdvbkNvbnRhaW5zUG9pbnQocG9seWdvbnNbaV0sIHgsIHkpKSByZXR1cm4gdGhpcy5ib3VuZGluZ0JveGVzW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBSZXR1cm5zIHRoZSBmaXJzdCBib3VuZGluZyBib3ggYXR0YWNobWVudCB0aGF0IGNvbnRhaW5zIHRoZSBsaW5lIHNlZ21lbnQsIG9yIG51bGwuIFdoZW4gZG9pbmcgbWFueSBjaGVja3MsIGl0IGlzIHVzdWFsbHlcclxuICAgICAqIG1vcmUgZWZmaWNpZW50IHRvIG9ubHkgY2FsbCB0aGlzIG1ldGhvZCBpZiB7QGxpbmsgI2FhYmJJbnRlcnNlY3RzU2VnbWVudChmbG9hdCwgZmxvYXQsIGZsb2F0LCBmbG9hdCl9IHJldHVybnMgdHJ1ZS4gKi9cclxuICAgIGludGVyc2VjdHNTZWdtZW50OiBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHBvbHlnb25zID0gdGhpcy5wb2x5Z29ucztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKHBvbHlnb25zW2ldLmludGVyc2VjdHNTZWdtZW50KHgxLCB5MSwgeDIsIHkyKSkgcmV0dXJuIHRoaXMuYm91bmRpbmdCb3hlc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogUmV0dXJucyB0cnVlIGlmIHRoZSBwb2x5Z29uIGNvbnRhaW5zIHRoZSBwb2ludC4gKi9cclxuICAgIHBvbHlnb25Db250YWluc1BvaW50OiBmdW5jdGlvbiAocG9seWdvbiwgeCwgeSlcclxuICAgIHtcclxuICAgICAgICB2YXIgbm4gPSBwb2x5Z29uLmxlbmd0aDtcclxuICAgICAgICB2YXIgcHJldkluZGV4ID0gbm4gLSAyO1xyXG4gICAgICAgIHZhciBpbnNpZGUgPSBmYWxzZTtcclxuICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbm47IGlpICs9IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdmVydGV4WSA9IHBvbHlnb25baWkgKyAxXTtcclxuICAgICAgICAgICAgdmFyIHByZXZZID0gcG9seWdvbltwcmV2SW5kZXggKyAxXTtcclxuICAgICAgICAgICAgaWYgKCh2ZXJ0ZXhZIDwgeSAmJiBwcmV2WSA+PSB5KSB8fCAocHJldlkgPCB5ICYmIHZlcnRleFkgPj0geSkpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciB2ZXJ0ZXhYID0gcG9seWdvbltpaV07XHJcbiAgICAgICAgICAgICAgICBpZiAodmVydGV4WCArICh5IC0gdmVydGV4WSkgLyAocHJldlkgLSB2ZXJ0ZXhZKSAqIChwb2x5Z29uW3ByZXZJbmRleF0gLSB2ZXJ0ZXhYKSA8IHgpIGluc2lkZSA9ICFpbnNpZGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJldkluZGV4ID0gaWk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnNpZGU7XHJcbiAgICB9LFxyXG4gICAgLyoqIFJldHVybnMgdHJ1ZSBpZiB0aGUgcG9seWdvbiBjb250YWlucyB0aGUgbGluZSBzZWdtZW50LiAqL1xyXG4gICAgcG9seWdvbkludGVyc2VjdHNTZWdtZW50OiBmdW5jdGlvbiAocG9seWdvbiwgeDEsIHkxLCB4MiwgeTIpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIG5uID0gcG9seWdvbi5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHdpZHRoMTIgPSB4MSAtIHgyLCBoZWlnaHQxMiA9IHkxIC0geTI7XHJcbiAgICAgICAgdmFyIGRldDEgPSB4MSAqIHkyIC0geTEgKiB4MjtcclxuICAgICAgICB2YXIgeDMgPSBwb2x5Z29uW25uIC0gMl0sIHkzID0gcG9seWdvbltubiAtIDFdO1xyXG4gICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBubjsgaWkgKz0gMilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB4NCA9IHBvbHlnb25baWldLCB5NCA9IHBvbHlnb25baWkgKyAxXTtcclxuICAgICAgICAgICAgdmFyIGRldDIgPSB4MyAqIHk0IC0geTMgKiB4NDtcclxuICAgICAgICAgICAgdmFyIHdpZHRoMzQgPSB4MyAtIHg0LCBoZWlnaHQzNCA9IHkzIC0geTQ7XHJcbiAgICAgICAgICAgIHZhciBkZXQzID0gd2lkdGgxMiAqIGhlaWdodDM0IC0gaGVpZ2h0MTIgKiB3aWR0aDM0O1xyXG4gICAgICAgICAgICB2YXIgeCA9IChkZXQxICogd2lkdGgzNCAtIHdpZHRoMTIgKiBkZXQyKSAvIGRldDM7XHJcbiAgICAgICAgICAgIGlmICgoKHggPj0geDMgJiYgeCA8PSB4NCkgfHwgKHggPj0geDQgJiYgeCA8PSB4MykpICYmICgoeCA+PSB4MSAmJiB4IDw9IHgyKSB8fCAoeCA+PSB4MiAmJiB4IDw9IHgxKSkpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciB5ID0gKGRldDEgKiBoZWlnaHQzNCAtIGhlaWdodDEyICogZGV0MikgLyBkZXQzO1xyXG4gICAgICAgICAgICAgICAgaWYgKCgoeSA+PSB5MyAmJiB5IDw9IHk0KSB8fCAoeSA+PSB5NCAmJiB5IDw9IHkzKSkgJiYgKCh5ID49IHkxICYmIHkgPD0geTIpIHx8ICh5ID49IHkyICYmIHkgPD0geTEpKSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeDMgPSB4NDtcclxuICAgICAgICAgICAgeTMgPSB5NDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSxcclxuICAgIGdldFBvbHlnb246IGZ1bmN0aW9uIChhdHRhY2htZW50KVxyXG4gICAge1xyXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuYm91bmRpbmdCb3hlcy5pbmRleE9mKGF0dGFjaG1lbnQpO1xyXG4gICAgICAgIHJldHVybiBpbmRleCA9PSAtMSA/IG51bGwgOiB0aGlzLnBvbHlnb25zW2luZGV4XTtcclxuICAgIH0sXHJcbiAgICBnZXRXaWR0aDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXhYIC0gdGhpcy5taW5YO1xyXG4gICAgfSxcclxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXhZIC0gdGhpcy5taW5ZO1xyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNrZWxldG9uQm91bmRzO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlNrZWxldG9uRGF0YSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICAgIHRoaXMuYm9uZXMgPSBbXTtcclxuICAgIHRoaXMuc2xvdHMgPSBbXTtcclxuICAgIHRoaXMuc2tpbnMgPSBbXTtcclxuICAgIHRoaXMuZXZlbnRzID0gW107XHJcbiAgICB0aGlzLmFuaW1hdGlvbnMgPSBbXTtcclxuICAgIHRoaXMuaWtDb25zdHJhaW50cyA9IFtdO1xyXG59O1xyXG5zcGluZS5Ta2VsZXRvbkRhdGEucHJvdG90eXBlID0ge1xyXG4gICAgbmFtZTogbnVsbCxcclxuICAgIGRlZmF1bHRTa2luOiBudWxsLFxyXG4gICAgd2lkdGg6IDAsIGhlaWdodDogMCxcclxuICAgIHZlcnNpb246IG51bGwsIGhhc2g6IG51bGwsXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRCb25lOiBmdW5jdGlvbiAoYm9uZU5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGJvbmVzID0gdGhpcy5ib25lcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGJvbmVzW2ldLm5hbWUgPT0gYm9uZU5hbWUpIHJldHVybiBib25lc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiAtMSBpZiB0aGUgYm9uZSB3YXMgbm90IGZvdW5kLiAqL1xyXG4gICAgZmluZEJvbmVJbmRleDogZnVuY3Rpb24gKGJvbmVOYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBib25lcyA9IHRoaXMuYm9uZXM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBib25lcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChib25lc1tpXS5uYW1lID09IGJvbmVOYW1lKSByZXR1cm4gaTtcclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9LFxyXG4gICAgLyoqIEByZXR1cm4gTWF5IGJlIG51bGwuICovXHJcbiAgICBmaW5kU2xvdDogZnVuY3Rpb24gKHNsb3ROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzbG90cyA9IHRoaXMuc2xvdHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoc2xvdHNbaV0ubmFtZSA9PSBzbG90TmFtZSkgcmV0dXJuIHNsb3RbaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIC0xIGlmIHRoZSBib25lIHdhcyBub3QgZm91bmQuICovXHJcbiAgICBmaW5kU2xvdEluZGV4OiBmdW5jdGlvbiAoc2xvdE5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3RzID0gdGhpcy5zbG90cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKHNsb3RzW2ldLm5hbWUgPT0gc2xvdE5hbWUpIHJldHVybiBpO1xyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRTa2luOiBmdW5jdGlvbiAoc2tpbk5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNraW5zID0gdGhpcy5za2lucztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNraW5zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKHNraW5zW2ldLm5hbWUgPT0gc2tpbk5hbWUpIHJldHVybiBza2luc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBldmVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICBpZiAoZXZlbnRzW2ldLm5hbWUgPT0gZXZlbnROYW1lKSByZXR1cm4gZXZlbnRzW2ldO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICAgIC8qKiBAcmV0dXJuIE1heSBiZSBudWxsLiAqL1xyXG4gICAgZmluZEFuaW1hdGlvbjogZnVuY3Rpb24gKGFuaW1hdGlvbk5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSB0aGlzLmFuaW1hdGlvbnM7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhbmltYXRpb25zLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbnNbaV0ubmFtZSA9PSBhbmltYXRpb25OYW1lKSByZXR1cm4gYW5pbWF0aW9uc1tpXTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0sXHJcbiAgICAvKiogQHJldHVybiBNYXkgYmUgbnVsbC4gKi9cclxuICAgIGZpbmRJa0NvbnN0cmFpbnQ6IGZ1bmN0aW9uIChpa0NvbnN0cmFpbnROYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBpa0NvbnN0cmFpbnRzID0gdGhpcy5pa0NvbnN0cmFpbnRzO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gaWtDb25zdHJhaW50cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgIGlmIChpa0NvbnN0cmFpbnRzW2ldLm5hbWUgPT0gaWtDb25zdHJhaW50TmFtZSkgcmV0dXJuIGlrQ29uc3RyYWludHNbaV07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2tlbGV0b25EYXRhO1xyXG5cclxuIiwidmFyIHNwaW5lID0gcmVxdWlyZSgnLi4vU3BpbmVVdGlsJyk7XHJcbnNwaW5lLlNrZWxldG9uRGF0YSA9IHJlcXVpcmUoJy4vU2tlbGV0b25EYXRhJyk7XHJcbnNwaW5lLkJvbmVEYXRhID0gcmVxdWlyZSgnLi9Cb25lRGF0YScpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnREYXRhID0gcmVxdWlyZSgnLi9Ja0NvbnN0cmFpbnREYXRhJyk7XHJcbnNwaW5lLlNsb3REYXRhID0gcmVxdWlyZSgnLi9TbG90RGF0YScpO1xyXG5zcGluZS5Ta2luID0gcmVxdWlyZSgnLi9Ta2luJyk7XHJcbnNwaW5lLkV2ZW50RGF0YSA9IHJlcXVpcmUoJy4vRXZlbnREYXRhJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUeXBlID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VHlwZScpO1xyXG5zcGluZS5Db2xvclRpbWVsaW5lID0gcmVxdWlyZSgnLi9Db2xvclRpbWVsaW5lJyk7XHJcbnNwaW5lLkF0dGFjaG1lbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vQXR0YWNobWVudFRpbWVsaW5lJyk7XHJcbnNwaW5lLlJvdGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9Sb3RhdGVUaW1lbGluZScpO1xyXG5zcGluZS5TY2FsZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9TY2FsZVRpbWVsaW5lJyk7XHJcbnNwaW5lLlRyYW5zbGF0ZVRpbWVsaW5lID0gcmVxdWlyZSgnLi9UcmFuc2xhdGVUaW1lbGluZScpO1xyXG5zcGluZS5GbGlwWFRpbWVsaW5lID0gcmVxdWlyZSgnLi9GbGlwWFRpbWVsaW5lJyk7XHJcbnNwaW5lLkZsaXBZVGltZWxpbmUgPSByZXF1aXJlKCcuL0ZsaXBZVGltZWxpbmUnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50VGltZWxpbmUgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludFRpbWVsaW5lJyk7XHJcbnNwaW5lLkZmZFRpbWVsaW5lID0gcmVxdWlyZSgnLi9GZmRUaW1lbGluZScpO1xyXG5zcGluZS5EcmF3T3JkZXJUaW1lbGluZSA9IHJlcXVpcmUoJy4vRHJhd09yZGVyVGltZWxpbmUnKTtcclxuc3BpbmUuRXZlbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vRXZlbnRUaW1lbGluZScpO1xyXG5zcGluZS5FdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcclxuc3BpbmUuQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9BbmltYXRpb24nKTtcclxuc3BpbmUuU2tlbGV0b25Kc29uUGFyc2VyID0gZnVuY3Rpb24gKGF0dGFjaG1lbnRMb2FkZXIpXHJcbntcclxuICAgIHRoaXMuYXR0YWNobWVudExvYWRlciA9IGF0dGFjaG1lbnRMb2FkZXI7XHJcbn07XHJcbnNwaW5lLlNrZWxldG9uSnNvblBhcnNlci5wcm90b3R5cGUgPSB7XHJcbiAgICBzY2FsZTogMSxcclxuICAgIHJlYWRTa2VsZXRvbkRhdGE6IGZ1bmN0aW9uIChyb290LCBuYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBza2VsZXRvbkRhdGEgPSBuZXcgc3BpbmUuU2tlbGV0b25EYXRhKCk7XHJcbiAgICAgICAgc2tlbGV0b25EYXRhLm5hbWUgPSBuYW1lO1xyXG5cclxuICAgICAgICAvLyBTa2VsZXRvbi5cclxuICAgICAgICB2YXIgc2tlbGV0b25NYXAgPSByb290W1wic2tlbGV0b25cIl07XHJcbiAgICAgICAgaWYgKHNrZWxldG9uTWFwKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc2tlbGV0b25EYXRhLmhhc2ggPSBza2VsZXRvbk1hcFtcImhhc2hcIl07XHJcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS52ZXJzaW9uID0gc2tlbGV0b25NYXBbXCJzcGluZVwiXTtcclxuICAgICAgICAgICAgc2tlbGV0b25EYXRhLndpZHRoID0gc2tlbGV0b25NYXBbXCJ3aWR0aFwiXSB8fCAwO1xyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuaGVpZ2h0ID0gc2tlbGV0b25NYXBbXCJoZWlnaHRcIl0gfHwgMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEJvbmVzLlxyXG4gICAgICAgIHZhciBib25lcyA9IHJvb3RbXCJib25lc1wiXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGJvbmVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBib25lTWFwID0gYm9uZXNbaV07XHJcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBudWxsO1xyXG4gICAgICAgICAgICBpZiAoYm9uZU1hcFtcInBhcmVudFwiXSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gc2tlbGV0b25EYXRhLmZpbmRCb25lKGJvbmVNYXBbXCJwYXJlbnRcIl0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwYXJlbnQpIHRocm93IFwiUGFyZW50IGJvbmUgbm90IGZvdW5kOiBcIiArIGJvbmVNYXBbXCJwYXJlbnRcIl07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGJvbmVEYXRhID0gbmV3IHNwaW5lLkJvbmVEYXRhKGJvbmVNYXBbXCJuYW1lXCJdLCBwYXJlbnQpO1xyXG4gICAgICAgICAgICBib25lRGF0YS5sZW5ndGggPSAoYm9uZU1hcFtcImxlbmd0aFwiXSB8fCAwKSAqIHRoaXMuc2NhbGU7XHJcbiAgICAgICAgICAgIGJvbmVEYXRhLnggPSAoYm9uZU1hcFtcInhcIl0gfHwgMCkgKiB0aGlzLnNjYWxlO1xyXG4gICAgICAgICAgICBib25lRGF0YS55ID0gKGJvbmVNYXBbXCJ5XCJdIHx8IDApICogdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgYm9uZURhdGEucm90YXRpb24gPSAoYm9uZU1hcFtcInJvdGF0aW9uXCJdIHx8IDApO1xyXG4gICAgICAgICAgICBib25lRGF0YS5zY2FsZVggPSBib25lTWFwLmhhc093blByb3BlcnR5KFwic2NhbGVYXCIpID8gYm9uZU1hcFtcInNjYWxlWFwiXSA6IDE7XHJcbiAgICAgICAgICAgIGJvbmVEYXRhLnNjYWxlWSA9IGJvbmVNYXAuaGFzT3duUHJvcGVydHkoXCJzY2FsZVlcIikgPyBib25lTWFwW1wic2NhbGVZXCJdIDogMTtcclxuICAgICAgICAgICAgYm9uZURhdGEuaW5oZXJpdFNjYWxlID0gYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eShcImluaGVyaXRTY2FsZVwiKSA/IGJvbmVNYXBbXCJpbmhlcml0U2NhbGVcIl0gOiB0cnVlO1xyXG4gICAgICAgICAgICBib25lRGF0YS5pbmhlcml0Um90YXRpb24gPSBib25lTWFwLmhhc093blByb3BlcnR5KFwiaW5oZXJpdFJvdGF0aW9uXCIpID8gYm9uZU1hcFtcImluaGVyaXRSb3RhdGlvblwiXSA6IHRydWU7XHJcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5ib25lcy5wdXNoKGJvbmVEYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElLIGNvbnN0cmFpbnRzLlxyXG4gICAgICAgIHZhciBpayA9IHJvb3RbXCJpa1wiXTtcclxuICAgICAgICBpZiAoaWspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGlrLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGlrTWFwID0gaWtbaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgaWtDb25zdHJhaW50RGF0YSA9IG5ldyBzcGluZS5Ja0NvbnN0cmFpbnREYXRhKGlrTWFwW1wibmFtZVwiXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJvbmVzID0gaWtNYXBbXCJib25lc1wiXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSBib25lcy5sZW5ndGg7IGlpIDwgbm47IGlpKyspXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvbmUgPSBza2VsZXRvbkRhdGEuZmluZEJvbmUoYm9uZXNbaWldKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWJvbmUpIHRocm93IFwiSUsgYm9uZSBub3QgZm91bmQ6IFwiICsgYm9uZXNbaWldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlrQ29uc3RyYWludERhdGEuYm9uZXMucHVzaChib25lKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpa0NvbnN0cmFpbnREYXRhLnRhcmdldCA9IHNrZWxldG9uRGF0YS5maW5kQm9uZShpa01hcFtcInRhcmdldFwiXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlrQ29uc3RyYWludERhdGEudGFyZ2V0KSB0aHJvdyBcIlRhcmdldCBib25lIG5vdCBmb3VuZDogXCIgKyBpa01hcFtcInRhcmdldFwiXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpa0NvbnN0cmFpbnREYXRhLmJlbmREaXJlY3Rpb24gPSAoIWlrTWFwLmhhc093blByb3BlcnR5KFwiYmVuZFBvc2l0aXZlXCIpIHx8IGlrTWFwW1wiYmVuZFBvc2l0aXZlXCJdKSA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgIGlrQ29uc3RyYWludERhdGEubWl4ID0gaWtNYXAuaGFzT3duUHJvcGVydHkoXCJtaXhcIikgPyBpa01hcFtcIm1peFwiXSA6IDE7XHJcblxyXG4gICAgICAgICAgICAgICAgc2tlbGV0b25EYXRhLmlrQ29uc3RyYWludHMucHVzaChpa0NvbnN0cmFpbnREYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2xvdHMuXHJcbiAgICAgICAgdmFyIHNsb3RzID0gcm9vdFtcInNsb3RzXCJdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gc2xvdHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHNsb3RNYXAgPSBzbG90c1tpXTtcclxuICAgICAgICAgICAgdmFyIGJvbmVEYXRhID0gc2tlbGV0b25EYXRhLmZpbmRCb25lKHNsb3RNYXBbXCJib25lXCJdKTtcclxuICAgICAgICAgICAgaWYgKCFib25lRGF0YSkgdGhyb3cgXCJTbG90IGJvbmUgbm90IGZvdW5kOiBcIiArIHNsb3RNYXBbXCJib25lXCJdO1xyXG4gICAgICAgICAgICB2YXIgc2xvdERhdGEgPSBuZXcgc3BpbmUuU2xvdERhdGEoc2xvdE1hcFtcIm5hbWVcIl0sIGJvbmVEYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjb2xvciA9IHNsb3RNYXBbXCJjb2xvclwiXTtcclxuICAgICAgICAgICAgaWYgKGNvbG9yKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBzbG90RGF0YS5yID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcclxuICAgICAgICAgICAgICAgIHNsb3REYXRhLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xyXG4gICAgICAgICAgICAgICAgc2xvdERhdGEuYiA9IHRoaXMudG9Db2xvcihjb2xvciwgMik7XHJcbiAgICAgICAgICAgICAgICBzbG90RGF0YS5hID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc2xvdERhdGEuYXR0YWNobWVudE5hbWUgPSBzbG90TWFwW1wiYXR0YWNobWVudFwiXTtcclxuICAgICAgICAgICAgc2xvdERhdGEuYWRkaXRpdmVCbGVuZGluZyA9IHNsb3RNYXBbXCJhZGRpdGl2ZVwiXSAmJiBzbG90TWFwW1wiYWRkaXRpdmVcIl0gPT0gXCJ0cnVlXCI7XHJcblxyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuc2xvdHMucHVzaChzbG90RGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTa2lucy5cclxuICAgICAgICB2YXIgc2tpbnMgPSByb290W1wic2tpbnNcIl07XHJcbiAgICAgICAgZm9yICh2YXIgc2tpbk5hbWUgaW4gc2tpbnMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIXNraW5zLmhhc093blByb3BlcnR5KHNraW5OYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHZhciBza2luTWFwID0gc2tpbnNbc2tpbk5hbWVdO1xyXG4gICAgICAgICAgICB2YXIgc2tpbiA9IG5ldyBzcGluZS5Ta2luKHNraW5OYW1lKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgc2xvdE5hbWUgaW4gc2tpbk1hcClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFza2luTWFwLmhhc093blByb3BlcnR5KHNsb3ROYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2xvdEluZGV4ID0gc2tlbGV0b25EYXRhLmZpbmRTbG90SW5kZXgoc2xvdE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHNsb3RFbnRyeSA9IHNraW5NYXBbc2xvdE5hbWVdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0YWNobWVudE5hbWUgaW4gc2xvdEVudHJ5KVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc2xvdEVudHJ5Lmhhc093blByb3BlcnR5KGF0dGFjaG1lbnROYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSB0aGlzLnJlYWRBdHRhY2htZW50KHNraW4sIGF0dGFjaG1lbnROYW1lLCBzbG90RW50cnlbYXR0YWNobWVudE5hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0YWNobWVudCkgc2tpbi5hZGRBdHRhY2htZW50KHNsb3RJbmRleCwgYXR0YWNobWVudE5hbWUsIGF0dGFjaG1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNrZWxldG9uRGF0YS5za2lucy5wdXNoKHNraW4pO1xyXG4gICAgICAgICAgICBpZiAoc2tpbi5uYW1lID09IFwiZGVmYXVsdFwiKSBza2VsZXRvbkRhdGEuZGVmYXVsdFNraW4gPSBza2luO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXZlbnRzLlxyXG4gICAgICAgIHZhciBldmVudHMgPSByb290W1wiZXZlbnRzXCJdO1xyXG4gICAgICAgIGZvciAodmFyIGV2ZW50TmFtZSBpbiBldmVudHMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWV2ZW50cy5oYXNPd25Qcm9wZXJ0eShldmVudE5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgdmFyIGV2ZW50TWFwID0gZXZlbnRzW2V2ZW50TmFtZV07XHJcbiAgICAgICAgICAgIHZhciBldmVudERhdGEgPSBuZXcgc3BpbmUuRXZlbnREYXRhKGV2ZW50TmFtZSk7XHJcbiAgICAgICAgICAgIGV2ZW50RGF0YS5pbnRWYWx1ZSA9IGV2ZW50TWFwW1wiaW50XCJdIHx8IDA7XHJcbiAgICAgICAgICAgIGV2ZW50RGF0YS5mbG9hdFZhbHVlID0gZXZlbnRNYXBbXCJmbG9hdFwiXSB8fCAwO1xyXG4gICAgICAgICAgICBldmVudERhdGEuc3RyaW5nVmFsdWUgPSBldmVudE1hcFtcInN0cmluZ1wiXSB8fCBudWxsO1xyXG4gICAgICAgICAgICBza2VsZXRvbkRhdGEuZXZlbnRzLnB1c2goZXZlbnREYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFuaW1hdGlvbnMuXHJcbiAgICAgICAgdmFyIGFuaW1hdGlvbnMgPSByb290W1wiYW5pbWF0aW9uc1wiXTtcclxuICAgICAgICBmb3IgKHZhciBhbmltYXRpb25OYW1lIGluIGFuaW1hdGlvbnMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWFuaW1hdGlvbnMuaGFzT3duUHJvcGVydHkoYW5pbWF0aW9uTmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB0aGlzLnJlYWRBbmltYXRpb24oYW5pbWF0aW9uTmFtZSwgYW5pbWF0aW9uc1thbmltYXRpb25OYW1lXSwgc2tlbGV0b25EYXRhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBza2VsZXRvbkRhdGE7XHJcbiAgICB9LFxyXG4gICAgcmVhZEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChza2luLCBuYW1lLCBtYXApXHJcbiAgICB7XHJcbiAgICAgICAgbmFtZSA9IG1hcFtcIm5hbWVcIl0gfHwgbmFtZTtcclxuXHJcbiAgICAgICAgdmFyIHR5cGUgPSBzcGluZS5BdHRhY2htZW50VHlwZVttYXBbXCJ0eXBlXCJdIHx8IFwicmVnaW9uXCJdO1xyXG4gICAgICAgIHZhciBwYXRoID0gbWFwW1wicGF0aFwiXSB8fCBuYW1lO1xyXG5cclxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnNjYWxlO1xyXG4gICAgICAgIGlmICh0eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnJlZ2lvbilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciByZWdpb24gPSB0aGlzLmF0dGFjaG1lbnRMb2FkZXIubmV3UmVnaW9uQXR0YWNobWVudChza2luLCBuYW1lLCBwYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFyZWdpb24pIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICByZWdpb24ucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgIHJlZ2lvbi54ID0gKG1hcFtcInhcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgcmVnaW9uLnkgPSAobWFwW1wieVwiXSB8fCAwKSAqIHNjYWxlO1xyXG4gICAgICAgICAgICByZWdpb24uc2NhbGVYID0gbWFwLmhhc093blByb3BlcnR5KFwic2NhbGVYXCIpID8gbWFwW1wic2NhbGVYXCJdIDogMTtcclxuICAgICAgICAgICAgcmVnaW9uLnNjYWxlWSA9IG1hcC5oYXNPd25Qcm9wZXJ0eShcInNjYWxlWVwiKSA/IG1hcFtcInNjYWxlWVwiXSA6IDE7XHJcbiAgICAgICAgICAgIHJlZ2lvbi5yb3RhdGlvbiA9IG1hcFtcInJvdGF0aW9uXCJdIHx8IDA7XHJcbiAgICAgICAgICAgIHJlZ2lvbi53aWR0aCA9IChtYXBbXCJ3aWR0aFwiXSB8fCAwKSAqIHNjYWxlO1xyXG4gICAgICAgICAgICByZWdpb24uaGVpZ2h0ID0gKG1hcFtcImhlaWdodFwiXSB8fCAwKSAqIHNjYWxlO1xyXG5cclxuICAgICAgICAgICAgdmFyIGNvbG9yID0gbWFwW1wiY29sb3JcIl07XHJcbiAgICAgICAgICAgIGlmIChjb2xvcilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLnIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDApO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLmcgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDEpO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xyXG4gICAgICAgICAgICAgICAgcmVnaW9uLmEgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZWdpb24udXBkYXRlT2Zmc2V0KCk7XHJcbiAgICAgICAgICAgIHJldHVybiByZWdpb247XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLm1lc2gpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgbWVzaCA9IHRoaXMuYXR0YWNobWVudExvYWRlci5uZXdNZXNoQXR0YWNobWVudChza2luLCBuYW1lLCBwYXRoKTtcclxuICAgICAgICAgICAgaWYgKCFtZXNoKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgbWVzaC5wYXRoID0gcGF0aDtcclxuICAgICAgICAgICAgbWVzaC52ZXJ0aWNlcyA9IHRoaXMuZ2V0RmxvYXRBcnJheShtYXAsIFwidmVydGljZXNcIiwgc2NhbGUpO1xyXG4gICAgICAgICAgICBtZXNoLnRyaWFuZ2xlcyA9IHRoaXMuZ2V0SW50QXJyYXkobWFwLCBcInRyaWFuZ2xlc1wiKTtcclxuICAgICAgICAgICAgbWVzaC5yZWdpb25VVnMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInV2c1wiLCAxKTtcclxuICAgICAgICAgICAgbWVzaC51cGRhdGVVVnMoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbG9yID0gbWFwW1wiY29sb3JcIl07XHJcbiAgICAgICAgICAgIGlmIChjb2xvcilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbWVzaC5yID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcclxuICAgICAgICAgICAgICAgIG1lc2guZyA9IHRoaXMudG9Db2xvcihjb2xvciwgMSk7XHJcbiAgICAgICAgICAgICAgICBtZXNoLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xyXG4gICAgICAgICAgICAgICAgbWVzaC5hID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbWVzaC5odWxsTGVuZ3RoID0gKG1hcFtcImh1bGxcIl0gfHwgMCkgKiAyO1xyXG4gICAgICAgICAgICBpZiAobWFwW1wiZWRnZXNcIl0pIG1lc2guZWRnZXMgPSB0aGlzLmdldEludEFycmF5KG1hcCwgXCJlZGdlc1wiKTtcclxuICAgICAgICAgICAgbWVzaC53aWR0aCA9IChtYXBbXCJ3aWR0aFwiXSB8fCAwKSAqIHNjYWxlO1xyXG4gICAgICAgICAgICBtZXNoLmhlaWdodCA9IChtYXBbXCJoZWlnaHRcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgcmV0dXJuIG1lc2g7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnNraW5uZWRtZXNoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIG1lc2ggPSB0aGlzLmF0dGFjaG1lbnRMb2FkZXIubmV3U2tpbm5lZE1lc2hBdHRhY2htZW50KHNraW4sIG5hbWUsIHBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoIW1lc2gpIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBtZXNoLnBhdGggPSBwYXRoO1xyXG5cclxuICAgICAgICAgICAgdmFyIHV2cyA9IHRoaXMuZ2V0RmxvYXRBcnJheShtYXAsIFwidXZzXCIsIDEpO1xyXG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSB0aGlzLmdldEZsb2F0QXJyYXkobWFwLCBcInZlcnRpY2VzXCIsIDEpO1xyXG4gICAgICAgICAgICB2YXIgd2VpZ2h0cyA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgYm9uZXMgPSBbXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGkgPCBuOyApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBib25lQ291bnQgPSB2ZXJ0aWNlc1tpKytdIHwgMDtcclxuICAgICAgICAgICAgICAgIGJvbmVzW2JvbmVzLmxlbmd0aF0gPSBib25lQ291bnQ7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBubiA9IGkgKyBib25lQ291bnQgKiA0OyBpIDwgbm47IClcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBib25lc1tib25lcy5sZW5ndGhdID0gdmVydGljZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgd2VpZ2h0c1t3ZWlnaHRzLmxlbmd0aF0gPSB2ZXJ0aWNlc1tpICsgMV0gKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICB3ZWlnaHRzW3dlaWdodHMubGVuZ3RoXSA9IHZlcnRpY2VzW2kgKyAyXSAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgIHdlaWdodHNbd2VpZ2h0cy5sZW5ndGhdID0gdmVydGljZXNbaSArIDNdO1xyXG4gICAgICAgICAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtZXNoLmJvbmVzID0gYm9uZXM7XHJcbiAgICAgICAgICAgIG1lc2gud2VpZ2h0cyA9IHdlaWdodHM7XHJcbiAgICAgICAgICAgIG1lc2gudHJpYW5nbGVzID0gdGhpcy5nZXRJbnRBcnJheShtYXAsIFwidHJpYW5nbGVzXCIpO1xyXG4gICAgICAgICAgICBtZXNoLnJlZ2lvblVWcyA9IHV2cztcclxuICAgICAgICAgICAgbWVzaC51cGRhdGVVVnMoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbG9yID0gbWFwW1wiY29sb3JcIl07XHJcbiAgICAgICAgICAgIGlmIChjb2xvcilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbWVzaC5yID0gdGhpcy50b0NvbG9yKGNvbG9yLCAwKTtcclxuICAgICAgICAgICAgICAgIG1lc2guZyA9IHRoaXMudG9Db2xvcihjb2xvciwgMSk7XHJcbiAgICAgICAgICAgICAgICBtZXNoLmIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDIpO1xyXG4gICAgICAgICAgICAgICAgbWVzaC5hID0gdGhpcy50b0NvbG9yKGNvbG9yLCAzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbWVzaC5odWxsTGVuZ3RoID0gKG1hcFtcImh1bGxcIl0gfHwgMCkgKiAyO1xyXG4gICAgICAgICAgICBpZiAobWFwW1wiZWRnZXNcIl0pIG1lc2guZWRnZXMgPSB0aGlzLmdldEludEFycmF5KG1hcCwgXCJlZGdlc1wiKTtcclxuICAgICAgICAgICAgbWVzaC53aWR0aCA9IChtYXBbXCJ3aWR0aFwiXSB8fCAwKSAqIHNjYWxlO1xyXG4gICAgICAgICAgICBtZXNoLmhlaWdodCA9IChtYXBbXCJoZWlnaHRcIl0gfHwgMCkgKiBzY2FsZTtcclxuICAgICAgICAgICAgcmV0dXJuIG1lc2g7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLmJvdW5kaW5nYm94KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSB0aGlzLmF0dGFjaG1lbnRMb2FkZXIubmV3Qm91bmRpbmdCb3hBdHRhY2htZW50KHNraW4sIG5hbWUpO1xyXG4gICAgICAgICAgICB2YXIgdmVydGljZXMgPSBtYXBbXCJ2ZXJ0aWNlc1wiXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2ZXJ0aWNlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICBhdHRhY2htZW50LnZlcnRpY2VzLnB1c2godmVydGljZXNbaV0gKiBzY2FsZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBhdHRhY2htZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBcIlVua25vd24gYXR0YWNobWVudCB0eXBlOiBcIiArIHR5cGU7XHJcbiAgICB9LFxyXG4gICAgcmVhZEFuaW1hdGlvbjogZnVuY3Rpb24gKG5hbWUsIG1hcCwgc2tlbGV0b25EYXRhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciB0aW1lbGluZXMgPSBbXTtcclxuICAgICAgICB2YXIgZHVyYXRpb24gPSAwO1xyXG5cclxuICAgICAgICB2YXIgc2xvdHMgPSBtYXBbXCJzbG90c1wiXTtcclxuICAgICAgICBmb3IgKHZhciBzbG90TmFtZSBpbiBzbG90cylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICghc2xvdHMuaGFzT3duUHJvcGVydHkoc2xvdE5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgdmFyIHNsb3RNYXAgPSBzbG90c1tzbG90TmFtZV07XHJcbiAgICAgICAgICAgIHZhciBzbG90SW5kZXggPSBza2VsZXRvbkRhdGEuZmluZFNsb3RJbmRleChzbG90TmFtZSk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciB0aW1lbGluZU5hbWUgaW4gc2xvdE1hcClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFzbG90TWFwLmhhc093blByb3BlcnR5KHRpbWVsaW5lTmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlcyA9IHNsb3RNYXBbdGltZWxpbmVOYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmICh0aW1lbGluZU5hbWUgPT0gXCJjb2xvclwiKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5Db2xvclRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNsb3RJbmRleCA9IHNsb3RJbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gdmFsdWVNYXBbXCJjb2xvclwiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHIgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IHRoaXMudG9Db2xvcihjb2xvciwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiID0gdGhpcy50b0NvbG9yKGNvbG9yLCAyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSB0aGlzLnRvQ29sb3IoY29sb3IsIDMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4LCB2YWx1ZU1hcFtcInRpbWVcIl0sIHIsIGcsIGIsIGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWRDdXJ2ZSh0aW1lbGluZSwgZnJhbWVJbmRleCwgdmFsdWVNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpICogNSAtIDVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRpbWVsaW5lTmFtZSA9PSBcImF0dGFjaG1lbnRcIilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNsb3RJbmRleCA9IHNsb3RJbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCsrLCB2YWx1ZU1hcFtcInRpbWVcIl0sIHZhbHVlTWFwW1wibmFtZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcclxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpIC0gMV0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCB0aW1lbGluZSB0eXBlIGZvciBhIHNsb3Q6IFwiICsgdGltZWxpbmVOYW1lICsgXCIgKFwiICsgc2xvdE5hbWUgKyBcIilcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGJvbmVzID0gbWFwW1wiYm9uZXNcIl07XHJcbiAgICAgICAgZm9yICh2YXIgYm9uZU5hbWUgaW4gYm9uZXMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWJvbmVzLmhhc093blByb3BlcnR5KGJvbmVOYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHZhciBib25lSW5kZXggPSBza2VsZXRvbkRhdGEuZmluZEJvbmVJbmRleChib25lTmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChib25lSW5kZXggPT0gLTEpIHRocm93IFwiQm9uZSBub3QgZm91bmQ6IFwiICsgYm9uZU5hbWU7XHJcbiAgICAgICAgICAgIHZhciBib25lTWFwID0gYm9uZXNbYm9uZU5hbWVdO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgdGltZWxpbmVOYW1lIGluIGJvbmVNYXApXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmICghYm9uZU1hcC5oYXNPd25Qcm9wZXJ0eSh0aW1lbGluZU5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBib25lTWFwW3RpbWVsaW5lTmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZiAodGltZWxpbmVOYW1lID09IFwicm90YXRlXCIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLlJvdGF0ZVRpbWVsaW5lKHZhbHVlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLmJvbmVJbmRleCA9IGJvbmVJbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyYW1lSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdmFsdWVzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZU1hcCA9IHZhbHVlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCB2YWx1ZU1hcFtcImFuZ2xlXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkQ3VydmUodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAqIDIgLSAyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aW1lbGluZU5hbWUgPT0gXCJ0cmFuc2xhdGVcIiB8fCB0aW1lbGluZU5hbWUgPT0gXCJzY2FsZVwiKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lbGluZTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmVTY2FsZSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVsaW5lTmFtZSA9PSBcInNjYWxlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lID0gbmV3IHNwaW5lLlNjYWxlVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUgPSBuZXcgc3BpbmUuVHJhbnNsYXRlVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lU2NhbGUgPSB0aGlzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5ib25lSW5kZXggPSBib25lSW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4ID0gKHZhbHVlTWFwW1wieFwiXSB8fCAwKSAqIHRpbWVsaW5lU2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB5ID0gKHZhbHVlTWFwW1wieVwiXSB8fCAwKSAqIHRpbWVsaW5lU2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgsIHZhbHVlTWFwW1widGltZVwiXSwgeCwgeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZEN1cnZlKHRpbWVsaW5lLCBmcmFtZUluZGV4LCB2YWx1ZU1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5nZXRGcmFtZUNvdW50KCkgKiAzIC0gM10pO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGltZWxpbmVOYW1lID09IFwiZmxpcFhcIiB8fCB0aW1lbGluZU5hbWUgPT0gXCJmbGlwWVwiKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gdGltZWxpbmVOYW1lID09IFwiZmxpcFhcIjtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSB4ID8gbmV3IHNwaW5lLkZsaXBYVGltZWxpbmUodmFsdWVzLmxlbmd0aCkgOiBuZXcgc3BpbmUuRmxpcFlUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5ib25lSW5kZXggPSBib25lSW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZCA9IHggPyBcInhcIiA6IFwieVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgsIHZhbHVlTWFwW1widGltZVwiXSwgdmFsdWVNYXBbZmllbGRdIHx8IGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWVJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAqIDIgLSAyXSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIkludmFsaWQgdGltZWxpbmUgdHlwZSBmb3IgYSBib25lOiBcIiArIHRpbWVsaW5lTmFtZSArIFwiIChcIiArIGJvbmVOYW1lICsgXCIpXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBpa01hcCA9IG1hcFtcImlrXCJdO1xyXG4gICAgICAgIGZvciAodmFyIGlrQ29uc3RyYWludE5hbWUgaW4gaWtNYXApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWlrTWFwLmhhc093blByb3BlcnR5KGlrQ29uc3RyYWludE5hbWUpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgdmFyIGlrQ29uc3RyYWludCA9IHNrZWxldG9uRGF0YS5maW5kSWtDb25zdHJhaW50KGlrQ29uc3RyYWludE5hbWUpO1xyXG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gaWtNYXBbaWtDb25zdHJhaW50TmFtZV07XHJcbiAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZSh2YWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgdGltZWxpbmUuaWtDb25zdHJhaW50SW5kZXggPSBza2VsZXRvbkRhdGEuaWtDb25zdHJhaW50cy5pbmRleE9mKGlrQ29uc3RyYWludCk7XHJcbiAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVNYXAgPSB2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgbWl4ID0gdmFsdWVNYXAuaGFzT3duUHJvcGVydHkoXCJtaXhcIikgPyB2YWx1ZU1hcFtcIm1peFwiXSA6IDE7XHJcbiAgICAgICAgICAgICAgICB2YXIgYmVuZERpcmVjdGlvbiA9ICghdmFsdWVNYXAuaGFzT3duUHJvcGVydHkoXCJiZW5kUG9zaXRpdmVcIikgfHwgdmFsdWVNYXBbXCJiZW5kUG9zaXRpdmVcIl0pID8gMSA6IC0xO1xyXG4gICAgICAgICAgICAgICAgdGltZWxpbmUuc2V0RnJhbWUoZnJhbWVJbmRleCwgdmFsdWVNYXBbXCJ0aW1lXCJdLCBtaXgsIGJlbmREaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWFkQ3VydmUodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKTtcclxuICAgICAgICAgICAgICAgIGZyYW1lSW5kZXgrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aW1lbGluZXMucHVzaCh0aW1lbGluZSk7XHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5mcmFtZUNvdW50ICogMyAtIDNdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBmZmQgPSBtYXBbXCJmZmRcIl07XHJcbiAgICAgICAgZm9yICh2YXIgc2tpbk5hbWUgaW4gZmZkKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHNraW4gPSBza2VsZXRvbkRhdGEuZmluZFNraW4oc2tpbk5hbWUpO1xyXG4gICAgICAgICAgICB2YXIgc2xvdE1hcCA9IGZmZFtza2luTmFtZV07XHJcbiAgICAgICAgICAgIGZvciAoc2xvdE5hbWUgaW4gc2xvdE1hcClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHNrZWxldG9uRGF0YS5maW5kU2xvdEluZGV4KHNsb3ROYW1lKTtcclxuICAgICAgICAgICAgICAgIHZhciBtZXNoTWFwID0gc2xvdE1hcFtzbG90TmFtZV07XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBtZXNoTmFtZSBpbiBtZXNoTWFwKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBtZXNoTWFwW21lc2hOYW1lXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZWxpbmUgPSBuZXcgc3BpbmUuRmZkVGltZWxpbmUodmFsdWVzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBza2luLmdldEF0dGFjaG1lbnQoc2xvdEluZGV4LCBtZXNoTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRhY2htZW50KSB0aHJvdyBcIkZGRCBhdHRhY2htZW50IG5vdCBmb3VuZDogXCIgKyBtZXNoTmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB0aW1lbGluZS5zbG90SW5kZXggPSBzbG90SW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGltZWxpbmUuYXR0YWNobWVudCA9IGF0dGFjaG1lbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc01lc2ggPSBhdHRhY2htZW50LnR5cGUgPT0gc3BpbmUuQXR0YWNobWVudFR5cGUubWVzaDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmVydGV4Q291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTWVzaClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmVydGV4Q291bnQgPSBhdHRhY2htZW50LnZlcnRpY2VzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleENvdW50ID0gYXR0YWNobWVudC53ZWlnaHRzLmxlbmd0aCAvIDMgKiAyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZnJhbWVJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlTWFwID0gdmFsdWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmVydGljZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWVNYXBbXCJ2ZXJ0aWNlc1wiXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTWVzaClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlcyA9IGF0dGFjaG1lbnQudmVydGljZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlcy5sZW5ndGggPSB2ZXJ0ZXhDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0aWNlc1ZhbHVlID0gdmFsdWVNYXBbXCJ2ZXJ0aWNlc1wiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0aWNlcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXMubGVuZ3RoID0gdmVydGV4Q291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3RhcnQgPSB2YWx1ZU1hcFtcIm9mZnNldFwiXSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5uID0gdmVydGljZXNWYWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zY2FsZSA9PSAxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBubjsgaWkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaWkgKyBzdGFydF0gPSB2ZXJ0aWNlc1ZhbHVlW2lpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5uOyBpaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpaSArIHN0YXJ0XSA9IHZlcnRpY2VzVmFsdWVbaWldICogdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc01lc2gpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc2hWZXJ0aWNlcyA9IGF0dGFjaG1lbnQudmVydGljZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaWkgPSAwLCBubiA9IHZlcnRpY2VzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljZXNbaWldICs9IG1lc2hWZXJ0aWNlc1tpaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lLnNldEZyYW1lKGZyYW1lSW5kZXgsIHZhbHVlTWFwW1widGltZVwiXSwgdmVydGljZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlYWRDdXJ2ZSh0aW1lbGluZSwgZnJhbWVJbmRleCwgdmFsdWVNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFtZUluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVsaW5lc1t0aW1lbGluZXMubGVuZ3RoXSA9IHRpbWVsaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gTWF0aC5tYXgoZHVyYXRpb24sIHRpbWVsaW5lLmZyYW1lc1t0aW1lbGluZS5mcmFtZUNvdW50IC0gMV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZHJhd09yZGVyVmFsdWVzID0gbWFwW1wiZHJhd09yZGVyXCJdO1xyXG4gICAgICAgIGlmICghZHJhd09yZGVyVmFsdWVzKSBkcmF3T3JkZXJWYWx1ZXMgPSBtYXBbXCJkcmF3b3JkZXJcIl07XHJcbiAgICAgICAgaWYgKGRyYXdPcmRlclZhbHVlcylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB0aW1lbGluZSA9IG5ldyBzcGluZS5EcmF3T3JkZXJUaW1lbGluZShkcmF3T3JkZXJWYWx1ZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgdmFyIHNsb3RDb3VudCA9IHNrZWxldG9uRGF0YS5zbG90cy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBkcmF3T3JkZXJWYWx1ZXMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZHJhd09yZGVyTWFwID0gZHJhd09yZGVyVmFsdWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRyYXdPcmRlciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHJhd09yZGVyTWFwW1wib2Zmc2V0c1wiXSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBkcmF3T3JkZXIgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBkcmF3T3JkZXIubGVuZ3RoID0gc2xvdENvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gc2xvdENvdW50IC0gMTsgaWkgPj0gMDsgaWktLSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhd09yZGVyW2lpXSA9IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXRzID0gZHJhd09yZGVyTWFwW1wib2Zmc2V0c1wiXTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdW5jaGFuZ2VkID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgdW5jaGFuZ2VkLmxlbmd0aCA9IHNsb3RDb3VudCAtIG9mZnNldHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcmlnaW5hbEluZGV4ID0gMCwgdW5jaGFuZ2VkSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gMCwgbm4gPSBvZmZzZXRzLmxlbmd0aDsgaWkgPCBubjsgaWkrKylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXRNYXAgPSBvZmZzZXRzW2lpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNsb3RJbmRleCA9IHNrZWxldG9uRGF0YS5maW5kU2xvdEluZGV4KG9mZnNldE1hcFtcInNsb3RcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2xvdEluZGV4ID09IC0xKSB0aHJvdyBcIlNsb3Qgbm90IGZvdW5kOiBcIiArIG9mZnNldE1hcFtcInNsb3RcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbGxlY3QgdW5jaGFuZ2VkIGl0ZW1zLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAob3JpZ2luYWxJbmRleCAhPSBzbG90SW5kZXgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNoYW5nZWRbdW5jaGFuZ2VkSW5kZXgrK10gPSBvcmlnaW5hbEluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBjaGFuZ2VkIGl0ZW1zLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmF3T3JkZXJbb3JpZ2luYWxJbmRleCArIG9mZnNldE1hcFtcIm9mZnNldFwiXV0gPSBvcmlnaW5hbEluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENvbGxlY3QgcmVtYWluaW5nIHVuY2hhbmdlZCBpdGVtcy5cclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAob3JpZ2luYWxJbmRleCA8IHNsb3RDb3VudClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5jaGFuZ2VkW3VuY2hhbmdlZEluZGV4KytdID0gb3JpZ2luYWxJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbGwgaW4gdW5jaGFuZ2VkIGl0ZW1zLlxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlpID0gc2xvdENvdW50IC0gMTsgaWkgPj0gMDsgaWktLSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRyYXdPcmRlcltpaV0gPT0gLTEpIGRyYXdPcmRlcltpaV0gPSB1bmNoYW5nZWRbLS11bmNoYW5nZWRJbmRleF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4KyssIGRyYXdPcmRlck1hcFtcInRpbWVcIl0sIGRyYXdPcmRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGltZWxpbmVzLnB1c2godGltZWxpbmUpO1xyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KGR1cmF0aW9uLCB0aW1lbGluZS5mcmFtZXNbdGltZWxpbmUuZ2V0RnJhbWVDb3VudCgpIC0gMV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGV2ZW50cyA9IG1hcFtcImV2ZW50c1wiXTtcclxuICAgICAgICBpZiAoZXZlbnRzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHRpbWVsaW5lID0gbmV3IHNwaW5lLkV2ZW50VGltZWxpbmUoZXZlbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHZhciBmcmFtZUluZGV4ID0gMDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBldmVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRNYXAgPSBldmVudHNbaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhID0gc2tlbGV0b25EYXRhLmZpbmRFdmVudChldmVudE1hcFtcIm5hbWVcIl0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFldmVudERhdGEpIHRocm93IFwiRXZlbnQgbm90IGZvdW5kOiBcIiArIGV2ZW50TWFwW1wibmFtZVwiXTtcclxuICAgICAgICAgICAgICAgIHZhciBldmVudCA9IG5ldyBzcGluZS5FdmVudChldmVudERhdGEpO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuaW50VmFsdWUgPSBldmVudE1hcC5oYXNPd25Qcm9wZXJ0eShcImludFwiKSA/IGV2ZW50TWFwW1wiaW50XCJdIDogZXZlbnREYXRhLmludFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuZmxvYXRWYWx1ZSA9IGV2ZW50TWFwLmhhc093blByb3BlcnR5KFwiZmxvYXRcIikgPyBldmVudE1hcFtcImZsb2F0XCJdIDogZXZlbnREYXRhLmZsb2F0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICBldmVudC5zdHJpbmdWYWx1ZSA9IGV2ZW50TWFwLmhhc093blByb3BlcnR5KFwic3RyaW5nXCIpID8gZXZlbnRNYXBbXCJzdHJpbmdcIl0gOiBldmVudERhdGEuc3RyaW5nVmFsdWU7XHJcbiAgICAgICAgICAgICAgICB0aW1lbGluZS5zZXRGcmFtZShmcmFtZUluZGV4KyssIGV2ZW50TWFwW1widGltZVwiXSwgZXZlbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRpbWVsaW5lcy5wdXNoKHRpbWVsaW5lKTtcclxuICAgICAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChkdXJhdGlvbiwgdGltZWxpbmUuZnJhbWVzW3RpbWVsaW5lLmdldEZyYW1lQ291bnQoKSAtIDFdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNrZWxldG9uRGF0YS5hbmltYXRpb25zLnB1c2gobmV3IHNwaW5lLkFuaW1hdGlvbihuYW1lLCB0aW1lbGluZXMsIGR1cmF0aW9uKSk7XHJcbiAgICB9LFxyXG4gICAgcmVhZEN1cnZlOiBmdW5jdGlvbiAodGltZWxpbmUsIGZyYW1lSW5kZXgsIHZhbHVlTWFwKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBjdXJ2ZSA9IHZhbHVlTWFwW1wiY3VydmVcIl07XHJcbiAgICAgICAgaWYgKCFjdXJ2ZSlcclxuICAgICAgICAgICAgdGltZWxpbmUuY3VydmVzLnNldExpbmVhcihmcmFtZUluZGV4KTtcclxuICAgICAgICBlbHNlIGlmIChjdXJ2ZSA9PSBcInN0ZXBwZWRcIilcclxuICAgICAgICAgICAgdGltZWxpbmUuY3VydmVzLnNldFN0ZXBwZWQoZnJhbWVJbmRleCk7XHJcbiAgICAgICAgZWxzZSBpZiAoY3VydmUgaW5zdGFuY2VvZiBBcnJheSlcclxuICAgICAgICAgICAgdGltZWxpbmUuY3VydmVzLnNldEN1cnZlKGZyYW1lSW5kZXgsIGN1cnZlWzBdLCBjdXJ2ZVsxXSwgY3VydmVbMl0sIGN1cnZlWzNdKTtcclxuICAgIH0sXHJcbiAgICB0b0NvbG9yOiBmdW5jdGlvbiAoaGV4U3RyaW5nLCBjb2xvckluZGV4KVxyXG4gICAge1xyXG4gICAgICAgIGlmIChoZXhTdHJpbmcubGVuZ3RoICE9IDgpIHRocm93IFwiQ29sb3IgaGV4aWRlY2ltYWwgbGVuZ3RoIG11c3QgYmUgOCwgcmVjaWV2ZWQ6IFwiICsgaGV4U3RyaW5nO1xyXG4gICAgICAgIHJldHVybiBwYXJzZUludChoZXhTdHJpbmcuc3Vic3RyaW5nKGNvbG9ySW5kZXggKiAyLCAoY29sb3JJbmRleCAqIDIpICsgMiksIDE2KSAvIDI1NTtcclxuICAgIH0sXHJcbiAgICBnZXRGbG9hdEFycmF5OiBmdW5jdGlvbiAobWFwLCBuYW1lLCBzY2FsZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgbGlzdCA9IG1hcFtuYW1lXTtcclxuICAgICAgICB2YXIgdmFsdWVzID0gbmV3IHNwaW5lLkZsb2F0MzJBcnJheShsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgdmFyIGkgPSAwLCBuID0gbGlzdC5sZW5ndGg7XHJcbiAgICAgICAgaWYgKHNjYWxlID09IDEpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBmb3IgKDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgICAgIHZhbHVlc1tpXSA9IGxpc3RbaV07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9yICg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0gPSBsaXN0W2ldICogc2NhbGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0SW50QXJyYXk6IGZ1bmN0aW9uIChtYXAsIG5hbWUpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBtYXBbbmFtZV07XHJcbiAgICAgICAgdmFyIHZhbHVlcyA9IG5ldyBzcGluZS5VaW50MTZBcnJheShsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBsaXN0Lmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgICAgICAgICAgdmFsdWVzW2ldID0gbGlzdFtpXSB8IDA7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2VsZXRvbkpzb25QYXJzZXI7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuU2tpbiA9IGZ1bmN0aW9uIChuYW1lKVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgdGhpcy5hdHRhY2htZW50cyA9IHt9O1xyXG59O1xyXG5zcGluZS5Ta2luLnByb3RvdHlwZSA9IHtcclxuICAgIGFkZEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChzbG90SW5kZXgsIG5hbWUsIGF0dGFjaG1lbnQpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5hdHRhY2htZW50c1tzbG90SW5kZXggKyBcIjpcIiArIG5hbWVdID0gYXR0YWNobWVudDtcclxuICAgIH0sXHJcbiAgICBnZXRBdHRhY2htZW50OiBmdW5jdGlvbiAoc2xvdEluZGV4LCBuYW1lKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF0dGFjaG1lbnRzW3Nsb3RJbmRleCArIFwiOlwiICsgbmFtZV07XHJcbiAgICB9LFxyXG4gICAgX2F0dGFjaEFsbDogZnVuY3Rpb24gKHNrZWxldG9uLCBvbGRTa2luKVxyXG4gICAge1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvbGRTa2luLmF0dGFjaG1lbnRzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIGNvbG9uID0ga2V5LmluZGV4T2YoXCI6XCIpO1xyXG4gICAgICAgICAgICB2YXIgc2xvdEluZGV4ID0gcGFyc2VJbnQoa2V5LnN1YnN0cmluZygwLCBjb2xvbikpO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGtleS5zdWJzdHJpbmcoY29sb24gKyAxKTtcclxuICAgICAgICAgICAgdmFyIHNsb3QgPSBza2VsZXRvbi5zbG90c1tzbG90SW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc2xvdC5hdHRhY2htZW50ICYmIHNsb3QuYXR0YWNobWVudC5uYW1lID09IG5hbWUpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gdGhpcy5nZXRBdHRhY2htZW50KHNsb3RJbmRleCwgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXR0YWNobWVudCkgc2xvdC5zZXRBdHRhY2htZW50KGF0dGFjaG1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNraW47XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKSB8fCB7fTtcclxuc3BpbmUuQXR0YWNobWVudFR5cGUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUeXBlJyk7XHJcbnNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudCA9IGZ1bmN0aW9uIChuYW1lKVxyXG57XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG59O1xyXG5zcGluZS5Ta2lubmVkTWVzaEF0dGFjaG1lbnQucHJvdG90eXBlID0ge1xyXG4gICAgdHlwZTogc3BpbmUuQXR0YWNobWVudFR5cGUuc2tpbm5lZG1lc2gsXHJcbiAgICBib25lczogbnVsbCxcclxuICAgIHdlaWdodHM6IG51bGwsXHJcbiAgICB1dnM6IG51bGwsXHJcbiAgICByZWdpb25VVnM6IG51bGwsXHJcbiAgICB0cmlhbmdsZXM6IG51bGwsXHJcbiAgICBodWxsTGVuZ3RoOiAwLFxyXG4gICAgcjogMSwgZzogMSwgYjogMSwgYTogMSxcclxuICAgIHBhdGg6IG51bGwsXHJcbiAgICByZW5kZXJlck9iamVjdDogbnVsbCxcclxuICAgIHJlZ2lvblU6IDAsIHJlZ2lvblY6IDAsIHJlZ2lvblUyOiAwLCByZWdpb25WMjogMCwgcmVnaW9uUm90YXRlOiBmYWxzZSxcclxuICAgIHJlZ2lvbk9mZnNldFg6IDAsIHJlZ2lvbk9mZnNldFk6IDAsXHJcbiAgICByZWdpb25XaWR0aDogMCwgcmVnaW9uSGVpZ2h0OiAwLFxyXG4gICAgcmVnaW9uT3JpZ2luYWxXaWR0aDogMCwgcmVnaW9uT3JpZ2luYWxIZWlnaHQ6IDAsXHJcbiAgICBlZGdlczogbnVsbCxcclxuICAgIHdpZHRoOiAwLCBoZWlnaHQ6IDAsXHJcbiAgICB1cGRhdGVVVnM6IGZ1bmN0aW9uICh1LCB2LCB1MiwgdjIsIHJvdGF0ZSlcclxuICAgIHtcclxuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLnJlZ2lvblUyIC0gdGhpcy5yZWdpb25VLCBoZWlnaHQgPSB0aGlzLnJlZ2lvblYyIC0gdGhpcy5yZWdpb25WO1xyXG4gICAgICAgIHZhciBuID0gdGhpcy5yZWdpb25VVnMubGVuZ3RoO1xyXG4gICAgICAgIGlmICghdGhpcy51dnMgfHwgdGhpcy51dnMubGVuZ3RoICE9IG4pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnV2cyA9IG5ldyBzcGluZS5GbG9hdDMyQXJyYXkobik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnJlZ2lvblJvdGF0ZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArPSAyKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnV2c1tpXSA9IHRoaXMucmVnaW9uVSArIHRoaXMucmVnaW9uVVZzW2kgKyAxXSAqIHdpZHRoO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaSArIDFdID0gdGhpcy5yZWdpb25WICsgaGVpZ2h0IC0gdGhpcy5yZWdpb25VVnNbaV0gKiBoZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKz0gMilcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaV0gPSB0aGlzLnJlZ2lvblUgKyB0aGlzLnJlZ2lvblVWc1tpXSAqIHdpZHRoO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51dnNbaSArIDFdID0gdGhpcy5yZWdpb25WICsgdGhpcy5yZWdpb25VVnNbaSArIDFdICogaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGNvbXB1dGVXb3JsZFZlcnRpY2VzOiBmdW5jdGlvbiAoeCwgeSwgc2xvdCwgd29ybGRWZXJ0aWNlcylcclxuICAgIHtcclxuICAgICAgICB2YXIgc2tlbGV0b25Cb25lcyA9IHNsb3QuYm9uZS5za2VsZXRvbi5ib25lcztcclxuICAgICAgICB2YXIgd2VpZ2h0cyA9IHRoaXMud2VpZ2h0cztcclxuICAgICAgICB2YXIgYm9uZXMgPSB0aGlzLmJvbmVzO1xyXG5cclxuICAgICAgICB2YXIgdyA9IDAsIHYgPSAwLCBiID0gMCwgZiA9IDAsIG4gPSBib25lcy5sZW5ndGgsIG5uO1xyXG4gICAgICAgIHZhciB3eCwgd3ksIGJvbmUsIHZ4LCB2eSwgd2VpZ2h0O1xyXG4gICAgICAgIGlmICghc2xvdC5hdHRhY2htZW50VmVydGljZXMubGVuZ3RoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yICg7IHYgPCBuOyB3ICs9IDIpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHd4ID0gMDtcclxuICAgICAgICAgICAgICAgIHd5ID0gMDtcclxuICAgICAgICAgICAgICAgIG5uID0gYm9uZXNbdisrXSArIHY7XHJcbiAgICAgICAgICAgICAgICBmb3IgKDsgdiA8IG5uOyB2KyssIGIgKz0gMylcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBib25lID0gc2tlbGV0b25Cb25lc1tib25lc1t2XV07XHJcbiAgICAgICAgICAgICAgICAgICAgdnggPSB3ZWlnaHRzW2JdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZ5ID0gd2VpZ2h0c1tiICsgMV07XHJcbiAgICAgICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0c1tiICsgMl07XHJcbiAgICAgICAgICAgICAgICAgICAgd3ggKz0gKHZ4ICogYm9uZS5tMDAgKyB2eSAqIGJvbmUubTAxICsgYm9uZS53b3JsZFgpICogd2VpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIHd5ICs9ICh2eCAqIGJvbmUubTEwICsgdnkgKiBib25lLm0xMSArIGJvbmUud29ybGRZKSAqIHdlaWdodDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHdvcmxkVmVydGljZXNbd10gPSB3eCArIHg7XHJcbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3cgKyAxXSA9IHd5ICsgeTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBmZmQgPSBzbG90LmF0dGFjaG1lbnRWZXJ0aWNlcztcclxuICAgICAgICAgICAgZm9yICg7IHYgPCBuOyB3ICs9IDIpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHd4ID0gMDtcclxuICAgICAgICAgICAgICAgIHd5ID0gMDtcclxuICAgICAgICAgICAgICAgIG5uID0gYm9uZXNbdisrXSArIHY7XHJcbiAgICAgICAgICAgICAgICBmb3IgKDsgdiA8IG5uOyB2KyssIGIgKz0gMywgZiArPSAyKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGJvbmUgPSBza2VsZXRvbkJvbmVzW2JvbmVzW3ZdXTtcclxuICAgICAgICAgICAgICAgICAgICB2eCA9IHdlaWdodHNbYl0gKyBmZmRbZl07XHJcbiAgICAgICAgICAgICAgICAgICAgdnkgPSB3ZWlnaHRzW2IgKyAxXSArIGZmZFtmICsgMV07XHJcbiAgICAgICAgICAgICAgICAgICAgd2VpZ2h0ID0gd2VpZ2h0c1tiICsgMl07XHJcbiAgICAgICAgICAgICAgICAgICAgd3ggKz0gKHZ4ICogYm9uZS5tMDAgKyB2eSAqIGJvbmUubTAxICsgYm9uZS53b3JsZFgpICogd2VpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIHd5ICs9ICh2eCAqIGJvbmUubTEwICsgdnkgKiBib25lLm0xMSArIGJvbmUud29ybGRZKSAqIHdlaWdodDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHdvcmxkVmVydGljZXNbd10gPSB3eCArIHg7XHJcbiAgICAgICAgICAgICAgICB3b3JsZFZlcnRpY2VzW3cgKyAxXSA9IHd5ICsgeTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBzcGluZS5Ta2lubmVkTWVzaEF0dGFjaG1lbnQ7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuU2xvdCA9IGZ1bmN0aW9uIChzbG90RGF0YSwgYm9uZSlcclxue1xyXG4gICAgdGhpcy5kYXRhID0gc2xvdERhdGE7XHJcbiAgICB0aGlzLmJvbmUgPSBib25lO1xyXG4gICAgdGhpcy5zZXRUb1NldHVwUG9zZSgpO1xyXG59O1xyXG5zcGluZS5TbG90LnByb3RvdHlwZSA9IHtcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICBfYXR0YWNobWVudFRpbWU6IDAsXHJcbiAgICBhdHRhY2htZW50OiBudWxsLFxyXG4gICAgYXR0YWNobWVudFZlcnRpY2VzOiBbXSxcclxuICAgIHNldEF0dGFjaG1lbnQ6IGZ1bmN0aW9uIChhdHRhY2htZW50KVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuYXR0YWNobWVudCA9IGF0dGFjaG1lbnQ7XHJcbiAgICAgICAgdGhpcy5fYXR0YWNobWVudFRpbWUgPSB0aGlzLmJvbmUuc2tlbGV0b24udGltZTtcclxuICAgICAgICB0aGlzLmF0dGFjaG1lbnRWZXJ0aWNlcy5sZW5ndGggPSAwO1xyXG4gICAgfSxcclxuICAgIHNldEF0dGFjaG1lbnRUaW1lOiBmdW5jdGlvbiAodGltZSlcclxuICAgIHtcclxuICAgICAgICB0aGlzLl9hdHRhY2htZW50VGltZSA9IHRoaXMuYm9uZS5za2VsZXRvbi50aW1lIC0gdGltZTtcclxuICAgIH0sXHJcbiAgICBnZXRBdHRhY2htZW50VGltZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib25lLnNrZWxldG9uLnRpbWUgLSB0aGlzLl9hdHRhY2htZW50VGltZTtcclxuICAgIH0sXHJcbiAgICBzZXRUb1NldHVwUG9zZTogZnVuY3Rpb24gKClcclxuICAgIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcclxuICAgICAgICB0aGlzLnIgPSBkYXRhLnI7XHJcbiAgICAgICAgdGhpcy5nID0gZGF0YS5nO1xyXG4gICAgICAgIHRoaXMuYiA9IGRhdGEuYjtcclxuICAgICAgICB0aGlzLmEgPSBkYXRhLmE7XHJcblxyXG4gICAgICAgIHZhciBzbG90RGF0YXMgPSB0aGlzLmJvbmUuc2tlbGV0b24uZGF0YS5zbG90cztcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHNsb3REYXRhcy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoc2xvdERhdGFzW2ldID09IGRhdGEpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0YWNobWVudCghZGF0YS5hdHRhY2htZW50TmFtZSA/IG51bGwgOiB0aGlzLmJvbmUuc2tlbGV0b24uZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KGksIGRhdGEuYXR0YWNobWVudE5hbWUpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHNwaW5lLlNsb3Q7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuU2xvdERhdGEgPSBmdW5jdGlvbiAobmFtZSwgYm9uZURhdGEpXHJcbntcclxuICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICB0aGlzLmJvbmVEYXRhID0gYm9uZURhdGE7XHJcbn07XHJcbnNwaW5lLlNsb3REYXRhLnByb3RvdHlwZSA9IHtcclxuICAgIHI6IDEsIGc6IDEsIGI6IDEsIGE6IDEsXHJcbiAgICBhdHRhY2htZW50TmFtZTogbnVsbCxcclxuICAgIGFkZGl0aXZlQmxlbmRpbmc6IGZhbHNlXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuU2xvdERhdGE7XHJcblxyXG4iLCJ2YXIgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVV0aWwnKTtcclxuc3BpbmUuVHJhY2tFbnRyeSA9IGZ1bmN0aW9uICgpXHJcbnt9O1xyXG5zcGluZS5UcmFja0VudHJ5LnByb3RvdHlwZSA9IHtcclxuICAgIG5leHQ6IG51bGwsIHByZXZpb3VzOiBudWxsLFxyXG4gICAgYW5pbWF0aW9uOiBudWxsLFxyXG4gICAgbG9vcDogZmFsc2UsXHJcbiAgICBkZWxheTogMCwgdGltZTogMCwgbGFzdFRpbWU6IC0xLCBlbmRUaW1lOiAwLFxyXG4gICAgdGltZVNjYWxlOiAxLFxyXG4gICAgbWl4VGltZTogMCwgbWl4RHVyYXRpb246IDAsIG1peDogMSxcclxuICAgIG9uU3RhcnQ6IG51bGwsIG9uRW5kOiBudWxsLCBvbkNvbXBsZXRlOiBudWxsLCBvbkV2ZW50OiBudWxsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuVHJhY2tFbnRyeTtcclxuXHJcbiIsInZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5DdXJ2ZXMgPSByZXF1aXJlKCcuL0N1cnZlcycpO1xyXG5zcGluZS5UcmFuc2xhdGVUaW1lbGluZSA9IGZ1bmN0aW9uIChmcmFtZUNvdW50KVxyXG57XHJcbiAgICB0aGlzLmN1cnZlcyA9IG5ldyBzcGluZS5DdXJ2ZXMoZnJhbWVDb3VudCk7XHJcbiAgICB0aGlzLmZyYW1lcyA9IFtdOyAvLyB0aW1lLCB4LCB5LCAuLi5cclxuICAgIHRoaXMuZnJhbWVzLmxlbmd0aCA9IGZyYW1lQ291bnQgKiAzO1xyXG59O1xyXG5zcGluZS5UcmFuc2xhdGVUaW1lbGluZS5wcm90b3R5cGUgPSB7XHJcbiAgICBib25lSW5kZXg6IDAsXHJcbiAgICBnZXRGcmFtZUNvdW50OiBmdW5jdGlvbiAoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZyYW1lcy5sZW5ndGggLyAzO1xyXG4gICAgfSxcclxuICAgIHNldEZyYW1lOiBmdW5jdGlvbiAoZnJhbWVJbmRleCwgdGltZSwgeCwgeSlcclxuICAgIHtcclxuICAgICAgICBmcmFtZUluZGV4ICo9IDM7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleF0gPSB0aW1lO1xyXG4gICAgICAgIHRoaXMuZnJhbWVzW2ZyYW1lSW5kZXggKyAxXSA9IHg7XHJcbiAgICAgICAgdGhpcy5mcmFtZXNbZnJhbWVJbmRleCArIDJdID0geTtcclxuICAgIH0sXHJcbiAgICBhcHBseTogZnVuY3Rpb24gKHNrZWxldG9uLCBsYXN0VGltZSwgdGltZSwgZmlyZWRFdmVudHMsIGFscGhhKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBmcmFtZXMgPSB0aGlzLmZyYW1lcztcclxuICAgICAgICBpZiAodGltZSA8IGZyYW1lc1swXSkgcmV0dXJuOyAvLyBUaW1lIGlzIGJlZm9yZSBmaXJzdCBmcmFtZS5cclxuXHJcbiAgICAgICAgdmFyIGJvbmUgPSBza2VsZXRvbi5ib25lc1t0aGlzLmJvbmVJbmRleF07XHJcblxyXG4gICAgICAgIGlmICh0aW1lID49IGZyYW1lc1tmcmFtZXMubGVuZ3RoIC0gM10pXHJcbiAgICAgICAgeyAvLyBUaW1lIGlzIGFmdGVyIGxhc3QgZnJhbWUuXHJcbiAgICAgICAgICAgIGJvbmUueCArPSAoYm9uZS5kYXRhLnggKyBmcmFtZXNbZnJhbWVzLmxlbmd0aCAtIDJdIC0gYm9uZS54KSAqIGFscGhhO1xyXG4gICAgICAgICAgICBib25lLnkgKz0gKGJvbmUuZGF0YS55ICsgZnJhbWVzW2ZyYW1lcy5sZW5ndGggLSAxXSAtIGJvbmUueSkgKiBhbHBoYTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW50ZXJwb2xhdGUgYmV0d2VlbiB0aGUgcHJldmlvdXMgZnJhbWUgYW5kIHRoZSBjdXJyZW50IGZyYW1lLlxyXG4gICAgICAgIHZhciBmcmFtZUluZGV4ID0gc3BpbmUuQW5pbWF0aW9uLmJpbmFyeVNlYXJjaChmcmFtZXMsIHRpbWUsIDMpO1xyXG4gICAgICAgIHZhciBwcmV2RnJhbWVYID0gZnJhbWVzW2ZyYW1lSW5kZXggLSAyXTtcclxuICAgICAgICB2YXIgcHJldkZyYW1lWSA9IGZyYW1lc1tmcmFtZUluZGV4IC0gMV07XHJcbiAgICAgICAgdmFyIGZyYW1lVGltZSA9IGZyYW1lc1tmcmFtZUluZGV4XTtcclxuICAgICAgICB2YXIgcGVyY2VudCA9IDEgLSAodGltZSAtIGZyYW1lVGltZSkgLyAoZnJhbWVzW2ZyYW1lSW5kZXggKyAtMy8qUFJFVl9GUkFNRV9USU1FKi9dIC0gZnJhbWVUaW1lKTtcclxuICAgICAgICBwZXJjZW50ID0gdGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGZyYW1lSW5kZXggLyAzIC0gMSwgcGVyY2VudCk7XHJcblxyXG4gICAgICAgIGJvbmUueCArPSAoYm9uZS5kYXRhLnggKyBwcmV2RnJhbWVYICsgKGZyYW1lc1tmcmFtZUluZGV4ICsgMS8qRlJBTUVfWCovXSAtIHByZXZGcmFtZVgpICogcGVyY2VudCAtIGJvbmUueCkgKiBhbHBoYTtcclxuICAgICAgICBib25lLnkgKz0gKGJvbmUuZGF0YS55ICsgcHJldkZyYW1lWSArIChmcmFtZXNbZnJhbWVJbmRleCArIDIvKkZSQU1FX1kqL10gLSBwcmV2RnJhbWVZKSAqIHBlcmNlbnQgLSBib25lLnkpICogYWxwaGE7XHJcbiAgICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmUuVHJhbnNsYXRlVGltZWxpbmU7XHJcblxyXG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbiAqIFNwaW5lIFJ1bnRpbWVzIFNvZnR3YXJlIExpY2Vuc2VcclxuICogVmVyc2lvbiAyLjFcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDEzLCBFc290ZXJpYyBTb2Z0d2FyZVxyXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG4gKlxyXG4gKiBZb3UgYXJlIGdyYW50ZWQgYSBwZXJwZXR1YWwsIG5vbi1leGNsdXNpdmUsIG5vbi1zdWJsaWNlbnNhYmxlIGFuZFxyXG4gKiBub24tdHJhbnNmZXJhYmxlIGxpY2Vuc2UgdG8gaW5zdGFsbCwgZXhlY3V0ZSBhbmQgcGVyZm9ybSB0aGUgU3BpbmUgUnVudGltZXNcclxuICogU29mdHdhcmUgKHRoZSBcIlNvZnR3YXJlXCIpIHNvbGVseSBmb3IgaW50ZXJuYWwgdXNlLiBXaXRob3V0IHRoZSB3cml0dGVuXHJcbiAqIHBlcm1pc3Npb24gb2YgRXNvdGVyaWMgU29mdHdhcmUgKHR5cGljYWxseSBncmFudGVkIGJ5IGxpY2Vuc2luZyBTcGluZSksIHlvdVxyXG4gKiBtYXkgbm90IChhKSBtb2RpZnksIHRyYW5zbGF0ZSwgYWRhcHQgb3Igb3RoZXJ3aXNlIGNyZWF0ZSBkZXJpdmF0aXZlIHdvcmtzLFxyXG4gKiBpbXByb3ZlbWVudHMgb2YgdGhlIFNvZnR3YXJlIG9yIGRldmVsb3AgbmV3IGFwcGxpY2F0aW9ucyB1c2luZyB0aGUgU29mdHdhcmVcclxuICogb3IgKGIpIHJlbW92ZSwgZGVsZXRlLCBhbHRlciBvciBvYnNjdXJlIGFueSB0cmFkZW1hcmtzIG9yIGFueSBjb3B5cmlnaHQsXHJcbiAqIHRyYWRlbWFyaywgcGF0ZW50IG9yIG90aGVyIGludGVsbGVjdHVhbCBwcm9wZXJ0eSBvciBwcm9wcmlldGFyeSByaWdodHNcclxuICogbm90aWNlcyBvbiBvciBpbiB0aGUgU29mdHdhcmUsIGluY2x1ZGluZyBhbnkgY29weSB0aGVyZW9mLiBSZWRpc3RyaWJ1dGlvbnNcclxuICogaW4gYmluYXJ5IG9yIHNvdXJjZSBmb3JtIG11c3QgaW5jbHVkZSB0aGlzIGxpY2Vuc2UgYW5kIHRlcm1zLlxyXG4gKlxyXG4gKiBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIEVTT1RFUklDIFNPRlRXQVJFIFwiQVMgSVNcIiBBTkQgQU5ZIEVYUFJFU1MgT1JcclxuICogSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRlxyXG4gKiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRSBESVNDTEFJTUVELiBJTiBOT1xyXG4gKiBFVkVOVCBTSEFMTCBFU09URVJJQyBTT0ZUQVJFIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsXHJcbiAqIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTyxcclxuICogUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7XHJcbiAqIE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLFxyXG4gKiBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUlxyXG4gKiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGXHJcbiAqIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxyXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcbnZhciBzcGluZSA9IHJlcXVpcmUoJy4uL1NwaW5lVXRpbCcpO1xyXG5zcGluZS5BbmltYXRpb24gPSByZXF1aXJlKCcuL0FuaW1hdGlvbicpO1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZURhdGEgPSByZXF1aXJlKCcuL0FuaW1hdGlvblN0YXRlRGF0YScpO1xyXG5zcGluZS5BbmltYXRpb25TdGF0ZSA9IHJlcXVpcmUoJy4vQW5pbWF0aW9uU3RhdGUnKTtcclxuc3BpbmUuQXRsYXNBdHRhY2htZW50UGFyc2VyID0gcmVxdWlyZSgnLi9BdGxhc0F0dGFjaG1lbnRQYXJzZXInKTtcclxuc3BpbmUuQXRsYXMgPSByZXF1aXJlKCcuL0F0bGFzJyk7XHJcbnNwaW5lLkF0bGFzUGFnZSA9IHJlcXVpcmUoJy4vQXRsYXNQYWdlJyk7XHJcbnNwaW5lLkF0bGFzUmVhZGVyID0gcmVxdWlyZSgnLi9BdGxhc1JlYWRlcicpO1xyXG5zcGluZS5BdGxhc1JlZ2lvbiA9IHJlcXVpcmUoJy4vQXRsYXNSZWdpb24nKTtcclxuc3BpbmUuQXR0YWNobWVudFRpbWVsaW5lID0gcmVxdWlyZSgnLi9BdHRhY2htZW50VGltZWxpbmUnKTtcclxuc3BpbmUuQXR0YWNobWVudFR5cGUgPSByZXF1aXJlKCcuL0F0dGFjaG1lbnRUeXBlJyk7XHJcbnNwaW5lLkJvbmVEYXRhID0gcmVxdWlyZSgnLi9Cb25lRGF0YScpO1xyXG5zcGluZS5Cb25lID0gcmVxdWlyZSgnLi9Cb25lJyk7XHJcbnNwaW5lLkJvdW5kaW5nQm94QXR0YWNobWVudCA9IHJlcXVpcmUoJy4vQm91bmRpbmdCb3hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLkNvbG9yVGltZWxpbmUgPSByZXF1aXJlKCcuL0NvbG9yVGltZWxpbmUnKTtcclxuc3BpbmUuQ3VydmVzID0gcmVxdWlyZSgnLi9DdXJ2ZXMnKTtcclxuc3BpbmUuRHJhd09yZGVyVGltZWxpbmUgPSByZXF1aXJlKCcuL0RyYXdPcmRlclRpbWVsaW5lJyk7XHJcbnNwaW5lLkV2ZW50RGF0YSA9IHJlcXVpcmUoJy4vRXZlbnREYXRhJyk7XHJcbnNwaW5lLkV2ZW50ID0gcmVxdWlyZSgnLi9FdmVudCcpO1xyXG5zcGluZS5FdmVudFRpbWVsaW5lID0gcmVxdWlyZSgnLi9FdmVudFRpbWVsaW5lJyk7XHJcbnNwaW5lLkZmZFRpbWVsaW5lID0gcmVxdWlyZSgnLi9GZmRUaW1lbGluZScpO1xyXG5zcGluZS5GbGlwWFRpbWVsaW5lID0gcmVxdWlyZSgnLi9GbGlwWFRpbWVsaW5lJyk7XHJcbnNwaW5lLkZsaXBZVGltZWxpbmUgPSByZXF1aXJlKCcuL0ZsaXBZVGltZWxpbmUnKTtcclxuc3BpbmUuSWtDb25zdHJhaW50RGF0YSA9IHJlcXVpcmUoJy4vSWtDb25zdHJhaW50RGF0YScpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnQgPSByZXF1aXJlKCcuL0lrQ29uc3RyYWludCcpO1xyXG5zcGluZS5Ja0NvbnN0cmFpbnRUaW1lbGluZSA9IHJlcXVpcmUoJy4vSWtDb25zdHJhaW50VGltZWxpbmUnKTtcclxuc3BpbmUuTWVzaEF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL01lc2hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLlJlZ2lvbkF0dGFjaG1lbnQgPSByZXF1aXJlKCcuL1JlZ2lvbkF0dGFjaG1lbnQnKTtcclxuc3BpbmUuUm90YXRlVGltZWxpbmUgPSByZXF1aXJlKCcuL1JvdGF0ZVRpbWVsaW5lJyk7XHJcbnNwaW5lLlNjYWxlVGltZWxpbmUgPSByZXF1aXJlKCcuL1NjYWxlVGltZWxpbmUnKTtcclxuc3BpbmUuU2tlbGV0b25Cb3VuZHMgPSByZXF1aXJlKCcuL1NrZWxldG9uQm91bmRzJyk7XHJcbnNwaW5lLlNrZWxldG9uRGF0YSA9IHJlcXVpcmUoJy4vU2tlbGV0b25EYXRhJyk7XHJcbnNwaW5lLlNrZWxldG9uID0gcmVxdWlyZSgnLi9Ta2VsZXRvbicpO1xyXG5zcGluZS5Ta2VsZXRvbkpzb25QYXJzZXIgPSByZXF1aXJlKCcuL1NrZWxldG9uSnNvblBhcnNlcicpO1xyXG5zcGluZS5Ta2luID0gcmVxdWlyZSgnLi9Ta2luLmpzJyk7XHJcbnNwaW5lLlNraW5uZWRNZXNoQXR0YWNobWVudCA9IHJlcXVpcmUoJy4vU2tpbm5lZE1lc2hBdHRhY2htZW50Jyk7XHJcbnNwaW5lLlNsb3REYXRhID0gcmVxdWlyZSgnLi9TbG90RGF0YScpO1xyXG5zcGluZS5TbG90ID0gcmVxdWlyZSgnLi9TbG90Jyk7XHJcbnNwaW5lLlRyYWNrRW50cnkgPSByZXF1aXJlKCcuL1RyYWNrRW50cnknKTtcclxuc3BpbmUuVHJhbnNsYXRlVGltZWxpbmUgPSByZXF1aXJlKCcuL1RyYW5zbGF0ZVRpbWVsaW5lJyk7XHJcbm1vZHVsZS5leHBvcnRzID0gc3BpbmU7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgcmFkRGVnOiAxODAgLyBNYXRoLlBJLFxyXG4gICAgZGVnUmFkOiBNYXRoLlBJIC8gMTgwLFxyXG4gICAgdGVtcDogW10sXHJcbiAgICBGbG9hdDMyQXJyYXk6ICh0eXBlb2YoRmxvYXQzMkFycmF5KSA9PT0gJ3VuZGVmaW5lZCcpID8gQXJyYXkgOiBGbG9hdDMyQXJyYXksXHJcbiAgICBVaW50MTZBcnJheTogKHR5cGVvZihVaW50MTZBcnJheSkgPT09ICd1bmRlZmluZWQnKSA/IEFycmF5IDogVWludDE2QXJyYXlcclxufTtcclxuXHJcbiIsInZhciBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpLFxyXG4gICAgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVJ1bnRpbWUnKTtcclxuLyogRXNvdGVyaWMgU29mdHdhcmUgU1BJTkUgd3JhcHBlciBmb3IgcGl4aS5qcyAqL1xyXG5zcGluZS5Cb25lLnlEb3duID0gdHJ1ZTtcclxuLyoqXHJcbiAqIEEgY2xhc3MgdGhhdCBlbmFibGVzIHRoZSB5b3UgdG8gaW1wb3J0IGFuZCBydW4geW91ciBzcGluZSBhbmltYXRpb25zIGluIHBpeGkuXHJcbiAqIFRoZSBTcGluZSBhbmltYXRpb24gZGF0YSBuZWVkcyB0byBiZSBsb2FkZWQgdXNpbmcgZWl0aGVyIHRoZSBMb2FkZXIgb3IgYSBTcGluZUxvYWRlciBiZWZvcmUgaXQgY2FuIGJlIHVzZWQgYnkgdGhpcyBjbGFzc1xyXG4gKiBTZWUgZXhhbXBsZSAxMiAoaHR0cDovL3d3dy5nb29kYm95ZGlnaXRhbC5jb20vcGl4aWpzL2V4YW1wbGVzLzEyLykgdG8gc2VlIGEgd29ya2luZyBleGFtcGxlIGFuZCBjaGVjayBvdXQgdGhlIHNvdXJjZVxyXG4gKlxyXG4gKiBgYGBqc1xyXG4gKiB2YXIgc3BpbmVBbmltYXRpb24gPSBuZXcgUElYSS5TcGluZShzcGluZURhdGEpO1xyXG4gKiBgYGBcclxuICpcclxuICogQGNsYXNzXHJcbiAqIEBleHRlbmRzIENvbnRhaW5lclxyXG4gKiBAbWVtYmVyb2YgUElYSS5zcGluZVxyXG4gKiBAcGFyYW0gc3BpbmVEYXRhIHtvYmplY3R9IFRoZSBzcGluZSBkYXRhIGxvYWRlZCBmcm9tIGEgc3BpbmUgYXRsYXMuXHJcbiAqL1xyXG5mdW5jdGlvbiBTcGluZShzcGluZURhdGEpXHJcbntcclxuICAgIFBJWEkuQ29udGFpbmVyLmNhbGwodGhpcyk7XHJcblxyXG4gICAgaWYgKCFzcGluZURhdGEpXHJcbiAgICB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgc3BpbmVEYXRhIHBhcmFtIGlzIHJlcXVpcmVkLicpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHNwaW5lRGF0YSBvYmplY3RcclxuICAgICAqXHJcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuc3BpbmVEYXRhID0gc3BpbmVEYXRhO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQSBzcGluZSBTa2VsZXRvbiBvYmplY3RcclxuICAgICAqXHJcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuc2tlbGV0b24gPSBuZXcgc3BpbmUuU2tlbGV0b24oc3BpbmVEYXRhKTtcclxuICAgIHRoaXMuc2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEEgc3BpbmUgQW5pbWF0aW9uU3RhdGVEYXRhIG9iamVjdCBjcmVhdGVkIGZyb20gdGhlIHNwaW5lIGRhdGEgcGFzc2VkIGluIHRoZSBjb25zdHJ1Y3RvclxyXG4gICAgICpcclxuICAgICAqIEBtZW1iZXIge29iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5zdGF0ZURhdGEgPSBuZXcgc3BpbmUuQW5pbWF0aW9uU3RhdGVEYXRhKHNwaW5lRGF0YSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBIHNwaW5lIEFuaW1hdGlvblN0YXRlIG9iamVjdCBjcmVhdGVkIGZyb20gdGhlIHNwaW5lIEFuaW1hdGlvblN0YXRlRGF0YSBvYmplY3RcclxuICAgICAqXHJcbiAgICAgKiBAbWVtYmVyIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuc3RhdGUgPSBuZXcgc3BpbmUuQW5pbWF0aW9uU3RhdGUodGhpcy5zdGF0ZURhdGEpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQW4gYXJyYXkgb2YgY29udGFpbmVyc1xyXG4gICAgICpcclxuICAgICAqIEBtZW1iZXIge0NvbnRhaW5lcltdfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnNsb3RDb250YWluZXJzID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0aGlzLnNrZWxldG9uLnNsb3RzLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgIHtcclxuICAgICAgICB2YXIgc2xvdCA9IHRoaXMuc2tlbGV0b24uc2xvdHNbaV07XHJcbiAgICAgICAgdmFyIGF0dGFjaG1lbnQgPSBzbG90LmF0dGFjaG1lbnQ7XHJcbiAgICAgICAgdmFyIHNsb3RDb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKTtcclxuICAgICAgICB0aGlzLnNsb3RDb250YWluZXJzLnB1c2goc2xvdENvbnRhaW5lcik7XHJcbiAgICAgICAgdGhpcy5hZGRDaGlsZChzbG90Q29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgaWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBzcGluZS5SZWdpb25BdHRhY2htZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHNwcml0ZU5hbWUgPSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0Lm5hbWU7XHJcbiAgICAgICAgICAgIHZhciBzcHJpdGUgPSB0aGlzLmNyZWF0ZVNwcml0ZShzbG90LCBhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlID0gc3ByaXRlO1xyXG4gICAgICAgICAgICBzbG90LmN1cnJlbnRTcHJpdGVOYW1lID0gc3ByaXRlTmFtZTtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5hZGRDaGlsZChzcHJpdGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChhdHRhY2htZW50IGluc3RhbmNlb2Ygc3BpbmUuTWVzaEF0dGFjaG1lbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgbWVzaCA9IHRoaXMuY3JlYXRlTWVzaChzbG90LCBhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgc2xvdC5jdXJyZW50TWVzaCA9IG1lc2g7XHJcbiAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2hOYW1lID0gYXR0YWNobWVudC5uYW1lO1xyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLmFkZENoaWxkKG1lc2gpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2hvdWxkIHRoZSBTcGluZSBvYmplY3QgdXBkYXRlIGl0cyB0cmFuc2Zvcm1zXHJcbiAgICAgKlxyXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5hdXRvVXBkYXRlID0gdHJ1ZTtcclxufVxyXG5cclxuU3BpbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkNvbnRhaW5lci5wcm90b3R5cGUpO1xyXG5TcGluZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTcGluZTtcclxubW9kdWxlLmV4cG9ydHMgPSBTcGluZTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNwaW5lLnByb3RvdHlwZSwge1xyXG4gICAgLyoqXHJcbiAgICAgKiBJZiB0aGlzIGZsYWcgaXMgc2V0IHRvIHRydWUsIHRoZSBzcGluZSBhbmltYXRpb24gd2lsbCBiZSBhdXRvdXBkYXRlZCBldmVyeSB0aW1lXHJcbiAgICAgKiB0aGUgb2JqZWN0IGlkIGRyYXduLiBUaGUgZG93biBzaWRlIG9mIHRoaXMgYXBwcm9hY2ggaXMgdGhhdCB0aGUgZGVsdGEgdGltZSBpc1xyXG4gICAgICogYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIGFuZCB5b3UgY291bGQgbWlzcyBvdXQgb24gY29vbCBlZmZlY3RzIGxpa2Ugc2xvdyBtb3Rpb24sXHJcbiAgICAgKiBwYXVzZSwgc2tpcCBhaGVhZCBhbmQgdGhlIHNvcnRzLiBNb3N0IG9mIHRoZXNlIGVmZmVjdHMgY2FuIGJlIGFjaGlldmVkIGV2ZW4gd2l0aFxyXG4gICAgICogYXV0b3VwZGF0ZSBlbmFibGVkIGJ1dCBhcmUgaGFyZGVyIHRvIGFjaGlldmUuXHJcbiAgICAgKlxyXG4gICAgICogQG1lbWJlciB7Ym9vbGVhbn1cclxuICAgICAqIEBtZW1iZXJvZiBTcGluZSNcclxuICAgICAqIEBkZWZhdWx0IHRydWVcclxuICAgICAqL1xyXG4gICAgYXV0b1VwZGF0ZToge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy51cGRhdGVUcmFuc2Zvcm0gPT09IFNwaW5lLnByb3RvdHlwZS5hdXRvVXBkYXRlVHJhbnNmb3JtKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVHJhbnNmb3JtID0gdmFsdWUgPyBTcGluZS5wcm90b3R5cGUuYXV0b1VwZGF0ZVRyYW5zZm9ybSA6IFBJWEkuQ29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgdGhlIHNwaW5lIHNrZWxldG9uIGFuZCBpdHMgYW5pbWF0aW9ucyBieSBkZWx0YSB0aW1lIChkdClcclxuICpcclxuICogQHBhcmFtIGR0IHtudW1iZXJ9IERlbHRhIHRpbWUuIFRpbWUgYnkgd2hpY2ggdGhlIGFuaW1hdGlvbiBzaG91bGQgYmUgdXBkYXRlZFxyXG4gKi9cclxuU3BpbmUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChkdClcclxue1xyXG4gICAgdGhpcy5zdGF0ZS51cGRhdGUoZHQpO1xyXG4gICAgdGhpcy5zdGF0ZS5hcHBseSh0aGlzLnNrZWxldG9uKTtcclxuICAgIHRoaXMuc2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oKTtcclxuXHJcbiAgICB2YXIgZHJhd09yZGVyID0gdGhpcy5za2VsZXRvbi5kcmF3T3JkZXI7XHJcbiAgICB2YXIgc2xvdHMgPSB0aGlzLnNrZWxldG9uLnNsb3RzO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwLCBuID0gZHJhd09yZGVyLmxlbmd0aDsgaSA8IG47IGkrKylcclxuICAgIHtcclxuICAgICAgICB0aGlzLmNoaWxkcmVuW2ldID0gdGhpcy5zbG90Q29udGFpbmVyc1tkcmF3T3JkZXJbaV1dO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAoaSA9IDAsIG4gPSBzbG90cy5sZW5ndGg7IGkgPCBuOyBpKyspXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHNsb3QgPSBzbG90c1tpXTtcclxuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHNsb3QuYXR0YWNobWVudDtcclxuICAgICAgICB2YXIgc2xvdENvbnRhaW5lciA9IHRoaXMuc2xvdENvbnRhaW5lcnNbaV07XHJcblxyXG4gICAgICAgIGlmICghYXR0YWNobWVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0eXBlID0gYXR0YWNobWVudC50eXBlO1xyXG4gICAgICAgIGlmICh0eXBlID09PSBzcGluZS5BdHRhY2htZW50VHlwZS5yZWdpb24pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoYXR0YWNobWVudC5yZW5kZXJlck9iamVjdClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFzbG90LmN1cnJlbnRTcHJpdGVOYW1lIHx8IHNsb3QuY3VycmVudFNwcml0ZU5hbWUgIT09IGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QubmFtZSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgc3ByaXRlTmFtZSA9IGF0dGFjaG1lbnQucmVuZGVyZXJPYmplY3QubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2xvdC5jdXJyZW50U3ByaXRlICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzbG90LmN1cnJlbnRTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzbG90LnNwcml0ZXMgPSBzbG90LnNwcml0ZXMgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNsb3Quc3ByaXRlc1tzcHJpdGVOYW1lXSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5zcHJpdGVzW3Nwcml0ZU5hbWVdLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3ByaXRlID0gdGhpcy5jcmVhdGVTcHJpdGUoc2xvdCwgYXR0YWNobWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsb3RDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlID0gc2xvdC5zcHJpdGVzW3Nwcml0ZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudFNwcml0ZU5hbWUgPSBzcHJpdGVOYW1lO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgYm9uZSA9IHNsb3QuYm9uZTtcclxuXHJcbiAgICAgICAgICAgIHNsb3RDb250YWluZXIucG9zaXRpb24ueCA9IGJvbmUud29ybGRYICsgYXR0YWNobWVudC54ICogYm9uZS5tMDAgKyBhdHRhY2htZW50LnkgKiBib25lLm0wMTtcclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5wb3NpdGlvbi55ID0gYm9uZS53b3JsZFkgKyBhdHRhY2htZW50LnggKiBib25lLm0xMCArIGF0dGFjaG1lbnQueSAqIGJvbmUubTExO1xyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnNjYWxlLnggPSBib25lLndvcmxkU2NhbGVYO1xyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnNjYWxlLnkgPSBib25lLndvcmxkU2NhbGVZO1xyXG5cclxuICAgICAgICAgICAgc2xvdENvbnRhaW5lci5yb3RhdGlvbiA9IC0oc2xvdC5ib25lLndvcmxkUm90YXRpb24gKiBzcGluZS5kZWdSYWQpO1xyXG5cclxuICAgICAgICAgICAgc2xvdC5jdXJyZW50U3ByaXRlLnRpbnQgPSBQSVhJLnV0aWxzLnJnYjJoZXgoW3Nsb3QucixzbG90Lmcsc2xvdC5iXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IHNwaW5lLkF0dGFjaG1lbnRUeXBlLnNraW5uZWRtZXNoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFzbG90LmN1cnJlbnRNZXNoTmFtZSB8fCBzbG90LmN1cnJlbnRNZXNoTmFtZSAhPT0gYXR0YWNobWVudC5uYW1lKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWVzaE5hbWUgPSBhdHRhY2htZW50Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2xvdC5jdXJyZW50TWVzaCAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2gudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNsb3QubWVzaGVzID0gc2xvdC5tZXNoZXMgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNsb3QubWVzaGVzW21lc2hOYW1lXSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHNsb3QubWVzaGVzW21lc2hOYW1lXS52aXNpYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbWVzaCA9IHRoaXMuY3JlYXRlTWVzaChzbG90LCBhdHRhY2htZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBzbG90Q29udGFpbmVyLmFkZENoaWxkKG1lc2gpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNsb3QuY3VycmVudE1lc2ggPSBzbG90Lm1lc2hlc1ttZXNoTmFtZV07XHJcbiAgICAgICAgICAgICAgICBzbG90LmN1cnJlbnRNZXNoTmFtZSA9IG1lc2hOYW1lO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhdHRhY2htZW50LmNvbXB1dGVXb3JsZFZlcnRpY2VzKHNsb3QuYm9uZS5za2VsZXRvbi54LCBzbG90LmJvbmUuc2tlbGV0b24ueSwgc2xvdCwgc2xvdC5jdXJyZW50TWVzaC52ZXJ0aWNlcyk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzbG90Q29udGFpbmVyLnZpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNsb3RDb250YWluZXIudmlzaWJsZSA9IHRydWU7XHJcblxyXG4gICAgICAgIHNsb3RDb250YWluZXIuYWxwaGEgPSBzbG90LmE7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vKipcclxuICogV2hlbiBhdXRvdXBkYXRlIGlzIHNldCB0byB5ZXMgdGhpcyBmdW5jdGlvbiBpcyB1c2VkIGFzIHBpeGkncyB1cGRhdGVUcmFuc2Zvcm0gZnVuY3Rpb25cclxuICpcclxuICogQHByaXZhdGVcclxuICovXHJcblNwaW5lLnByb3RvdHlwZS5hdXRvVXBkYXRlVHJhbnNmb3JtID0gZnVuY3Rpb24gKClcclxue1xyXG4gICAgdGhpcy5sYXN0VGltZSA9IHRoaXMubGFzdFRpbWUgfHwgRGF0ZS5ub3coKTtcclxuICAgIHZhciB0aW1lRGVsdGEgPSAoRGF0ZS5ub3coKSAtIHRoaXMubGFzdFRpbWUpICogMC4wMDE7XHJcbiAgICB0aGlzLmxhc3RUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSh0aW1lRGVsdGEpO1xyXG5cclxuICAgIFBJWEkuQ29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBuZXcgc3ByaXRlIHRvIGJlIHVzZWQgd2l0aCBzcGluZS5SZWdpb25BdHRhY2htZW50XHJcbiAqXHJcbiAqIEBwYXJhbSBzbG90IHtzcGluZS5TbG90fSBUaGUgc2xvdCB0byB3aGljaCB0aGUgYXR0YWNobWVudCBpcyBwYXJlbnRlZFxyXG4gKiBAcGFyYW0gYXR0YWNobWVudCB7c3BpbmUuUmVnaW9uQXR0YWNobWVudH0gVGhlIGF0dGFjaG1lbnQgdGhhdCB0aGUgc3ByaXRlIHdpbGwgcmVwcmVzZW50XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5TcGluZS5wcm90b3R5cGUuY3JlYXRlU3ByaXRlID0gZnVuY3Rpb24gKHNsb3QsIGF0dGFjaG1lbnQpXHJcbntcclxuICAgIHZhciBkZXNjcmlwdG9yID0gYXR0YWNobWVudC5yZW5kZXJlck9iamVjdDtcclxuICAgIHZhciBiYXNlVGV4dHVyZSA9IGRlc2NyaXB0b3IucGFnZS5yZW5kZXJlck9iamVjdDtcclxuICAgIHZhciBzcHJpdGVSZWN0ID0gbmV3IFBJWEkubWF0aC5SZWN0YW5nbGUoZGVzY3JpcHRvci54LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRvci55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRvci5yb3RhdGUgPyBkZXNjcmlwdG9yLmhlaWdodCA6IGRlc2NyaXB0b3Iud2lkdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdG9yLnJvdGF0ZSA/IGRlc2NyaXB0b3Iud2lkdGggOiBkZXNjcmlwdG9yLmhlaWdodCk7XHJcbiAgICB2YXIgc3ByaXRlVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoYmFzZVRleHR1cmUsIHNwcml0ZVJlY3QpO1xyXG4gICAgdmFyIHNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShzcHJpdGVUZXh0dXJlKTtcclxuXHJcbiAgICB2YXIgYmFzZVJvdGF0aW9uID0gZGVzY3JpcHRvci5yb3RhdGUgPyBNYXRoLlBJICogMC41IDogMC4wO1xyXG4gICAgc3ByaXRlLnNjYWxlLnggPSBkZXNjcmlwdG9yLndpZHRoIC8gZGVzY3JpcHRvci5vcmlnaW5hbFdpZHRoICogYXR0YWNobWVudC5zY2FsZVg7XHJcbiAgICBzcHJpdGUuc2NhbGUueSA9IGRlc2NyaXB0b3IuaGVpZ2h0IC8gZGVzY3JpcHRvci5vcmlnaW5hbEhlaWdodCAqIGF0dGFjaG1lbnQuc2NhbGVZO1xyXG4gICAgc3ByaXRlLnJvdGF0aW9uID0gYmFzZVJvdGF0aW9uIC0gKGF0dGFjaG1lbnQucm90YXRpb24gKiBzcGluZS5kZWdSYWQpO1xyXG4gICAgc3ByaXRlLmFuY2hvci54ID0gc3ByaXRlLmFuY2hvci55ID0gMC41O1xyXG4gICAgc3ByaXRlLmFscGhhID0gYXR0YWNobWVudC5hO1xyXG5cclxuICAgIHNsb3Quc3ByaXRlcyA9IHNsb3Quc3ByaXRlcyB8fCB7fTtcclxuICAgIHNsb3Quc3ByaXRlc1tkZXNjcmlwdG9yLm5hbWVdID0gc3ByaXRlO1xyXG4gICAgcmV0dXJuIHNwcml0ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgU3RyaXAgZnJvbSB0aGUgc3BpbmUgZGF0YVxyXG4gKiBAcGFyYW0gc2xvdCB7c3BpbmUuU2xvdH0gVGhlIHNsb3QgdG8gd2hpY2ggdGhlIGF0dGFjaG1lbnQgaXMgcGFyZW50ZWRcclxuICogQHBhcmFtIGF0dGFjaG1lbnQge3NwaW5lLlJlZ2lvbkF0dGFjaG1lbnR9IFRoZSBhdHRhY2htZW50IHRoYXQgdGhlIHNwcml0ZSB3aWxsIHJlcHJlc2VudFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuU3BpbmUucHJvdG90eXBlLmNyZWF0ZU1lc2ggPSBmdW5jdGlvbiAoc2xvdCwgYXR0YWNobWVudClcclxue1xyXG4gICAgdmFyIGRlc2NyaXB0b3IgPSBhdHRhY2htZW50LnJlbmRlcmVyT2JqZWN0O1xyXG4gICAgdmFyIGJhc2VUZXh0dXJlID0gZGVzY3JpcHRvci5wYWdlLnJlbmRlcmVyT2JqZWN0O1xyXG4gICAgdmFyIHRleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKGJhc2VUZXh0dXJlKTtcclxuXHJcbiAgICB2YXIgc3RyaXAgPSBuZXcgUElYSS5TdHJpcCh0ZXh0dXJlKTtcclxuICAgIHN0cmlwLmRyYXdNb2RlID0gUElYSS5TdHJpcC5EUkFXX01PREVTLlRSSUFOR0xFUztcclxuICAgIHN0cmlwLmNhbnZhc1BhZGRpbmcgPSAxLjU7XHJcblxyXG4gICAgc3RyaXAudmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KGF0dGFjaG1lbnQudXZzLmxlbmd0aCk7XHJcbiAgICBzdHJpcC51dnMgPSBhdHRhY2htZW50LnV2cztcclxuICAgIHN0cmlwLmluZGljZXMgPSBhdHRhY2htZW50LnRyaWFuZ2xlcztcclxuICAgIHN0cmlwLmFscGhhID0gYXR0YWNobWVudC5hO1xyXG5cclxuICAgIHNsb3QubWVzaGVzID0gc2xvdC5tZXNoZXMgfHwge307XHJcbiAgICBzbG90Lm1lc2hlc1thdHRhY2htZW50Lm5hbWVdID0gc3RyaXA7XHJcblxyXG4gICAgcmV0dXJuIHN0cmlwO1xyXG59O1xyXG4iLCIvKipcbiAqIEBmaWxlICAgICAgICBTcGluZSByZXNvdXJjZSBsb2FkZXJcbiAqIEBhdXRob3IgICAgICBJdmFuIFBvcGVseXNoZXYgPGl2YW4ucG9wZWx5c2hldkBnbWFpbC5jb20+XG4gKiBAY29weXJpZ2h0ICAgMjAxMy0yMDE1IEdvb2RCb3lEaWdpdGFsXG4gKiBAbGljZW5zZSAgICAge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9Hb29kQm95RGlnaXRhbC9waXhpLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0V8TUlUIExpY2Vuc2V9XG4gKi9cblxuLyoqXG4gKiBAbmFtZXNwYWNlIFBJWEkubG9hZGVyc1xuICovXG5cbnZhciBhdGxhc1BhcnNlciA9IHJlcXVpcmUoJy4vYXRsYXNQYXJzZXInKSxcbiAgICBQSVhJID0gcmVxdWlyZSgncGl4aS5qcycpO1xuXG5mdW5jdGlvbiBMb2FkZXIoYmFzZVVybCwgY29uY3VycmVuY3kpXG57XG4gICAgUElYSS5sb2FkZXJzLkxvYWRlci5jYWxsKHRoaXMsIGJhc2VVcmwsIGNvbmN1cnJlbmN5KTtcblxuICAgIC8vIHBhcnNlIGFueSBzcGluZSBkYXRhIGludG8gYSBzcGluZSBvYmplY3RcbiAgICB0aGlzLnVzZShhdGxhc1BhcnNlcigpKTtcbn1cblxuTG9hZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUElYSS5sb2FkZXJzLkxvYWRlci5wcm90b3R5cGUpO1xuTG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExvYWRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkZXI7XG4iLCJ2YXIgUmVzb3VyY2UgPSByZXF1aXJlKCdyZXNvdXJjZS1sb2FkZXInKS5SZXNvdXJjZSxcbiAgICBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyksXG4gICAgc3BpbmUgPSByZXF1aXJlKCcuLi9TcGluZVJ1bnRpbWUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZXNvdXJjZSwgbmV4dCkge1xuICAgICAgICAvLyBza2lwIGlmIG5vIGRhdGEsIGl0cyBub3QganNvbiwgb3IgaXQgaXNuJ3QgYXRsYXMgZGF0YVxuICAgICAgICBpZiAoIXJlc291cmNlLmRhdGEgfHwgIXJlc291cmNlLmlzSnNvbiB8fCAhcmVzb3VyY2UuZGF0YS5ib25lcykge1xuICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiB1c2UgYSBiaXQgb2YgaGFja2VyeSB0byBsb2FkIHRoZSBhdGxhcyBmaWxlLCBoZXJlIHdlIGFzc3VtZSB0aGF0IHRoZSAuanNvbiwgLmF0bGFzIGFuZCAucG5nIGZpbGVzXG4gICAgICAgICAqIHRoYXQgY29ycmVzcG9uZCB0byB0aGUgc3BpbmUgZmlsZSBhcmUgaW4gdGhlIHNhbWUgYmFzZSBVUkwgYW5kIHRoYXQgdGhlIC5qc29uIGFuZCAuYXRsYXMgZmlsZXNcbiAgICAgICAgICogaGF2ZSB0aGUgc2FtZSBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgYXRsYXNQYXRoID0gcmVzb3VyY2UudXJsLnN1YnN0cigwLCByZXNvdXJjZS51cmwubGFzdEluZGV4T2YoJy4nKSkgKyAnLmF0bGFzJztcbiAgICAgICAgdmFyIGF0bGFzT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNyb3NzT3JpZ2luOiByZXNvdXJjZS5jcm9zc09yaWdpbixcbiAgICAgICAgICAgIHhoclR5cGU6IFJlc291cmNlLlhIUl9SRVNQT05TRV9UWVBFLlRFWFRcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGJhc2VVcmwgPSByZXNvdXJjZS51cmwuc3Vic3RyKDAsIHJlc291cmNlLnVybC5sYXN0SW5kZXhPZignLycpICsgMSk7XG5cblxuICAgICAgICB0aGlzLmFkZChyZXNvdXJjZS5uYW1lICsgJ19hdGxhcycsIGF0bGFzUGF0aCwgYXRsYXNPcHRpb25zLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBzcGluZSBhdGxhcyB1c2luZyB0aGUgbG9hZGVkIHRleHRcbiAgICAgICAgICAgIHZhciBzcGluZUF0bGFzID0gbmV3IHNwaW5lLkF0bGFzKHRoaXMueGhyLnJlc3BvbnNlVGV4dCwgYmFzZVVybCwgcmVzLmNyb3NzT3JpZ2luKTtcblxuICAgICAgICAgICAgLy8gc3BpbmUgYW5pbWF0aW9uXG4gICAgICAgICAgICB2YXIgc3BpbmVKc29uUGFyc2VyID0gbmV3IHNwaW5lLlNrZWxldG9uSnNvblBhcnNlcihuZXcgc3BpbmUuQXRsYXNBdHRhY2htZW50UGFyc2VyKHNwaW5lQXRsYXMpKTtcbiAgICAgICAgICAgIHZhciBza2VsZXRvbkRhdGEgPSBzcGluZUpzb25QYXJzZXIucmVhZFNrZWxldG9uRGF0YShyZXNvdXJjZS5kYXRhKTtcblxuICAgICAgICAgICAgcmVzb3VyY2Uuc3BpbmVEYXRhID0gc2tlbGV0b25EYXRhO1xuICAgICAgICAgICAgcmVzb3VyY2Uuc3BpbmVBdGxhcyA9IHNwaW5lQXRsYXM7XG5cbiAgICAgICAgICAgIC8vIEdvIHRocm91Z2ggZWFjaCBzcGluZUF0bGFzLnBhZ2VzIGFuZCB3YWl0IGZvciBwYWdlLnJlbmRlcmVyT2JqZWN0IChhIGJhc2VUZXh0dXJlKSB0b1xuICAgICAgICAgICAgLy8gbG9hZC4gT25jZSBhbGwgbG9hZGVkLCB0aGVuIGNhbGwgdGhlIG5leHQgZnVuY3Rpb24uXG4gICAgICAgICAgICBhc3luYy5lYWNoKHNwaW5lQXRsYXMucGFnZXMsIGZ1bmN0aW9uIChwYWdlLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhZ2UucmVuZGVyZXJPYmplY3QuaGFzTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhZ2UucmVuZGVyZXJPYmplY3Qub25jZSgnbG9hZGVkJywgZG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgbmV4dCk7XG4gICAgICAgIH0pO1xuICAgIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYXRsYXNQYXJzZXI6IHJlcXVpcmUoJy4vYXRsYXNQYXJzZXInKSxcbiAgICBMb2FkZXI6IHJlcXVpcmUoJy4vTG9hZGVyJylcbn07XG4iXX0=
