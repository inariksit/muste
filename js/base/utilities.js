
// List utilities

function array_cmp(a, b) {
    if (a instanceof Array) {
        if (b instanceof Array) {
            var alen = a.length, blen = b.length;
            if (alen < blen) return -1;
            if (alen > blen) return 1;
            for (var i = 0; i < alen; i++) {
                var cmp = array_cmp(a[i], b[i]);
                if (cmp) return cmp;
            }
            return 0;
        } else {
            return 1;
        }
    } else if (b instanceof Array) {
        return -1;
    } else {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }
}


function array_eq(a, b) {
    if (a instanceof Array) {
        if (b instanceof Array) {
            var alen = a.length, blen = b.length;
            if (alen !== blen) return false;
            for (var i = 0; i < alen; i++) {
                var eq = array_eq(a[i], b[i]);
                if (!eq) return eq;
            }
            return true;
        } else {
            return false;
        }
    } else if (b instanceof Array) {
        return false;
    } else {
        return a == b;
    }
}


function flatten(obj) {
    if (obj instanceof Array) {
        var list = [];
        for (var i = 0; i < obj.length; i++) {
            list.push.apply(list, flatten(obj[i]));
        }
        return list;
    } else {
        return [obj];
    }
}


function common_prefix(sequences) {
    if (!sequences.length) {
        return [];
    }
    var minlen = Math.min.apply(this, sequences.map(function(seq){return seq.length}));
    for (var i = 0; i < minlen; i++) {
        var value = sequences[0][i];
        for (var seq = 1; seq < sequences.length; seq++) {
            if (sequences[seq][i] != value) {
                return sequences[seq].slice(0, i);
            }
        }
    }
    return sequences[0].slice(0, minlen);
}


// Converting a list of strings into a string, so that the original list can be retrieved

function ishash(hash) {
    return (typeof(hash) == "string" && /^\{\[\"[0-9]/.test(hash));
}


function hash(args) {
    return JSON.stringify(args);
}


function unhash(hash) {
    return JSON.parse(hash);
}


// Timing

var TIMERS = {};

function RESET_TIMERS() {
    TIMERS = {};
}

function START_TIMER(n) {
    if (!TIMERS[n]) TIMERS[n] = 0;
    TIMERS[n] -= Date.now();
}

function STOP_TIMER(n) {
    TIMERS[n] += Date.now();
}

function LOG_TIMERS() {
    console.log("TIMERS", JSON.stringify(TIMERS));
}


function getTime() {
    return Date.now();
}


function showTime(start) {
    return (getTime() - start).toFixed(1) + " ms";
}


// Pretty-printing

function strObject(obj) {
    if (obj == null) {
	    return "" + obj;
    } else if (obj instanceof Array) {
	    var result = obj.map(function(o){
	        return strObject(o);
	    });
	    return "[" + result.join(", ") + "]";
    } else if (obj instanceof Object) {
	    var result = [];
	    for (var key in obj) {
	        result.push(key + ": " + strObject(obj[key]));
	    }
	    return "{" + result.join(", ") + "}";
    } else if (typeof obj == "string") {
	    return '"' + obj + '"'
    } else {
	    return "" + obj;
    }
}


// Error handling

function alertError(title, description) {
    alert("*** " + title + "***\n" + description);
}