///<reference path="Utilities.ts"/>

/* 
   GF.js, by Peter Ljunglöf
   This file must be loaded BEFORE the GF grammar is loaded!
*/


class GFGrammar {
    constructor(
        public abs : GFAbstract,
        public cncs : {[lang:string] : GFConcrete}
    ) {
        for (var lang in cncs) {
            this.cncs[lang].abs = abs;
        }
    }

    /** GFGrammar.linearise(tree):
        @param language: a String denoting which concrete syntax to use
        @param tree: a GFTree object
        @return: an Array of {word:String, path:String} 
    **/
    public linearise(language : string, tree : GFTree) : LinToken[] {
        return this.cncs[language].linearise(tree);
    }
}

class GFAbstract {
    public cat2funs : {[cat:string] : string[]};
    public typing2funs : {[cat:string] : {[args:string] : string[]}};
    constructor(
        public startcat : string,
        public types : {[fun:string] : Type}
    ) {
        this.cat2funs = {};
        for (var fun in types) {
            var cat : string = types[fun].abscat;
            if (!this.cat2funs[cat]) {
                this.cat2funs[cat] = [];
            }
            this.cat2funs[cat].push(fun);
        }
        this.typing2funs = {};
        for (var fun in types) {
            var typ = types[fun].abscat;
            var hashargs = Utilities.hash(types[fun].children);
            if (!this.typing2funs[typ]) this.typing2funs[typ] = {};
            if (!this.typing2funs[typ][hashargs]) this.typing2funs[typ][hashargs] = [];
            this.typing2funs[typ][hashargs].push(fun);
        }
    }

    /** GFAbstract.typecheck(tree):
        Throws a TypeError if the tree is not type correct.
        If the tree lacks type information, the types are output to the console.
        @param tree: a GFTree object
    **/
    public typecheck(tree : GFTree, ntype? : string) : void {
        var ftype : Type = this.types[tree.node];
        if (!ftype) {
            throw(new TypeError("Function not found: " + tree.node));
        }
        if (ntype && ntype != ftype.abscat) {
            throw(new TypeError("Function type mismatch: " + tree.node + ":" + ntype + 
                                " (should be " + ftype.abscat + ")"));
        }
        // if (tree.type && tree.type != ftype.abscat) {
        //     throw(new TypeError("Function type mismatch: " + tree.node + ":" + tree.type + 
        //                         " (should be " + ftype.abscat + ")"));
        // {
        // if (!tree.type) {
        //     console.log("Missing type of function " + tree.node + " : " + ftype.abscat);
        // }
        if (ftype.children.length != tree.children.length) {
            throw(new TypeError("Children mismatch: " + tree.node + " has " + tree.children.length +
                                " children (should be " + ftype.children.length + ")"));
        }
        for (var i = 0; i < tree.children.length; i++) {
            this.typecheck(tree.children[i], ftype.children[i]);
        }
    }


    //////////////////////////////////////////////////////////////////////
    // Random generation

    public generate(cat : string,
                    maxdepth? : number,
                    maxtries? : number,
                    filter? : (string) => boolean) : GFTree
    {
        if (!maxdepth) maxdepth = 10;
        if (!maxtries) maxtries = 1000;
        var cat2funs = this.cat2funs;
        var types = this.types;

        function _generate(cat : string, maxdepth : number) : any {
            if (maxdepth <= 0) return null;
            var funs : string[] = cat2funs[cat];
            if (typeof filter == "function") {
                funs = funs.filter(filter);
            }
            if (!funs.length) return null;
            var fun : string = funs[Math.floor(Math.random() * funs.length)];
            if (startswith(fun, "default_")) return null;
            var children : string[] = types[fun].children;
            var tree : GFTree = new GFTree(fun, []);
            for (var i = 0; i < children.length; i++) {
                var child : any = _generate(children[i], maxdepth-1);
                if (!child) return null;
                tree.children.push(child);
            }
            return tree;
        }

        for (var i = 0; i < maxtries; i++) {
            var result : any = _generate(cat, maxdepth);
            if (result) return result;
        }
        return null;
    }

}


interface LinToken {
    word : string;
    path : string;
}

class GFConcrete {
    public abs : GFAbstract;
    public flags : {[flag:string] : string};
    public productions : {[cat:string] : Production[]};
    public functions : {[fun:string] : CncFun};
    public sequences : {[seq:string] : Symbol[]};
    public categories : {[abscat:string] : string[]};
    public inversecats : {[cat:string] : string};
    public nr_cats : number;

    public coercions : {[cat:string] : string[]};
    public lincats : {[cat:string] : number};
    public linfuns : {[absfun:string] : {[rhs:string] : {fun:string;cat:string;seqs:string[]}[]}};
    public max_arity : number;

    constructor(
        flags : {[flag:string] : string},
        productions : {[cat:number] : Production[]},
        functions : CncFun[],
        sequences : Symbol[][],
        categories : {[abscat:string] : {s:number;e:number}},
        nr_cats : number
    ) {
        this.abs = undefined;
        this.productions = {};
        for (var p in productions) {
            this.productions[mkCat(p)] = productions[p];
        }
        this.functions = {};
        for (var i = 0; i < functions.length; i++) {
            this.functions[mkFun(i)] = functions[i];
        }
        this.sequences = {};
        for (var i = 0; i < sequences.length; i++) {
            this.sequences[mkSeq(i)] = sequences[i];
        }
        this.categories = {};
        this.inversecats = {};
        for (var abscat in categories) {
            this.categories[abscat] = [];
            for (var i = categories[abscat].s; i <= categories[abscat].e; i++) {
                this.categories[abscat].push(mkCat(i));
                this.inversecats[mkCat(i)] = abscat;
            }
        }
        this.nr_cats = nr_cats;

        // this.coercions = {cat: [cat, ...], ...}
        // this.lincats = {cat: arity(integer)}
        // this.linfuns = {absfun: {[cat,...]: [{fun:fun, cat:cat, seqs:[seq,...]}, ...], ...} , ...}
        this.coercions = {};
        this.lincats = {};
        this.linfuns = {};
        this.max_arity = 1;
        for (var cat in this.productions) {
            setdefault(this.coercions, cat, []).push(cat);
            var prods = this.productions[cat];
            for (var i = 0; i < prods.length; i++) {
                if (prods[i] instanceof Coerce) {
                    setdefault(this.coercions, (<Coerce>prods[i]).cat, []).push(cat);
                } else if (prods[i] instanceof Apply) {
                    var prod = <Apply> prods[i];
                    var cncfun = this.functions[prod.fun];
                    var xxx : {[rhs:string] : {fun:string;cat:string;seqs:string[]}[]} = {};
                    var lf : {[rhs:string] : {fun:string;cat:string;seqs:string[]}[]}
                        = setdefault(this.linfuns, cncfun.absfun, xxx);
                    var children = [];
                    for (var j = 0; j < prod.children.length; j++) {
                        children.push(prod.children[j].parg);
                    }
                    var yyy : {fun:string;cat:string;seqs:string[]}[] = [];
                    setdefault(lf, children+"", yyy).push({fun:prod.fun, cat:cat, seqs:cncfun.seqs});
                    var arity = cncfun.seqs.length;
                    setdefault(this.lincats, cat, arity);
                    if (this.lincats[cat] != arity) {
                        alert("Mismatching linfun arities for cat: " + cat);
                    }
                    if (arity > this.max_arity) {
                        this.max_arity = arity;
                    }
                }
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // GF linearisations

    /** GFConcrete.linearise(tree):
        @param tree: a GFTree instance
        @return: an Array of {word:String, path:String} 
    **/

    public linearise(tree : GFTree) : LinToken[] {
        var catlins = this._linearise_nondet(tree, "");
        if (catlins.length > 0) {
            return this._expand_tokens(catlins[0].lin[0]);
        }
    }

    private _expand_tokens(lin : {arg:Symbol;path:string}[]) : LinToken[] {
        if (lin.length == 0) {
            return [];
        } else if (lin[0].arg) {
            var newlin : LinToken[] = [];
            for (var i = lin.length-1; i >= 0; i--) {
                var path : string = lin[i].path;
                var arg = lin[i].arg;
                if (arg instanceof SymKS) {
                    for (var j = (<SymKS>arg).tokens.length-1; j >= 0; j--) {
                        newlin.push({'word':(<SymKS>arg).tokens[j], 'path':path});
                    }
                } else if (arg instanceof SymKP) {
                    var tokens : SymKS[] = (<SymKP>arg).tokens;
                    if (newlin.length) {
                        altloop:
                        for (var altix = 0; altix < (<SymKP>arg).alts.length; altix++) {
                            var alt = (<SymKP>arg).alts[altix];
                            for (var followix = 0; followix < alt.follows.length; followix++) {
                                var prefix = alt.follows[followix];
                                if (startswith(newlin[0].word, prefix)) {
                                    tokens = alt.tokens;
                                    break altloop;
                                }
                            }
                        }
                    }
                    for (var j = tokens.length-1; j >= 0; j--) {
                        var toks = tokens[j].tokens;
                        for (var k = 0; k < toks.length; k++) {
                            newlin.push({'word':toks[k], 'path':path});
                        }
                    }
                }
            }
            return newlin.reverse();
        } else {
            lin.map(function(sublin){
                return this._expand_tokens(sublin);
            });
        }
    }

    private _linearise_nondet(tree : GFTree, path : string)
    : {cat:string;lin:{arg:number;path:string}[][]}[]
    {
        var result = [];
        if (tree instanceof GFTree && this.linfuns[tree.node]) {
            var linfuns = this.linfuns[tree.node];
            var allchildren = this._linearise_children_nondet(tree, 0, path);
            for (var childrenix = 0; childrenix < allchildren.length; childrenix++) {
                var children = allchildren[childrenix];
                var allfcs = linfuns[children.cats.join()];
                if (allfcs && allfcs.length > 0) {
                    for (var fcsix = 0; fcsix < allfcs.length; fcsix++) {
                        var fcs = allfcs[fcsix];
                        var lin = [];
                        for (var seqix = 0; seqix < fcs.seqs.length; seqix++) {
                            var seqnr = fcs.seqs[seqix];
                            var phrase = [];
                            var seq = this.sequences[seqnr];
                            for (var argix = 0; argix < seq.length; argix++) {
                                var arg = seq[argix];
                                if (arg instanceof SymCat) {
                                    var scarg = <SymCat>arg;
                                    var alltokens = children.lins[scarg.arg][scarg.param];
                                    for (var tokix = 0; tokix < alltokens.length; tokix++) {
                                        var token = alltokens[tokix];
                                        phrase.push(token);
                                    }
                                } else {
                                    phrase.push({'arg':arg, 'path':path});
                                }
                            }
                            lin.push(phrase);
                        }
                        result.push({'cat':fcs.cat, 'lin':lin});
                    }
                }
            }
        } else {
            // var childtype;
            // if (tree instanceof GFTree) {
            var childtype = this.abs.types[tree.node].abscat;
            var treeS = tree.node.toString();
            // } else if (startswith(tree, GFMETA) && tree.length > 1) {
            //     childtype = tree.slice(1);
            // }
            var cats = this.categories[childtype];
            for (var catix = 0; catix < cats.length; catix++) {
                var cat = cats[catix];
                var arity = this.lincats[cat] || this.max_arity;
                var lin = [];
                for (var k = 0; k < arity; k++) {
                    lin.push([{'arg': {'tokens':["["+treeS+"]"]}, 'path': path}]);
                }
                result.push({'cat':cat, 'lin':lin});
            }
        }
        return result;
    }

    private _linearise_children_nondet(tree : GFTree, i : number, path : string)
    : {cats:string[];lins:{arg:number;path:string}[][][]}[] {
        var result = [];
        if (i >= tree.children.length) {
            result.push({'cats':[], 'lins':[]});
        } else {
            var allchild = this._linearise_nondet(tree.children[i], path + i);
            var allchildren = this._linearise_children_nondet(tree, i+1, path);
            for (var childix = 0; childix < allchild.length; childix++) {
                var child = allchild[childix];
                for (var childrenix = 0; childrenix < allchildren.length; childrenix++) {
                    var children = allchildren[childrenix];
                    var lins = [child.lin].concat(children.lins);
                    var cats = [child.cat].concat(children.cats);
                    var allcocats = this._coerce_cats(cats, 0);
                    for (var cocatix = 0; cocatix < allcocats.length; cocatix++) {
                        var cocats = allcocats[cocatix];
                        result.push({'cats':cocats, 'lins':lins});
                    }
                }
            }
        }
        return result;
    }


    private _coerce_cats(cats : string[], i : number) : string[][] {
        var result = [];
        if (i >= cats.length) {
            result.push([]);
        } else {
            var cocats = this.coercions[cats[i]] || [cats[i]];
            var cocats_rest = this._coerce_cats(cats, i+1);
            for (var cocatix = 0; cocatix < cocats.length; cocatix++) {
                for (var restix = 0; restix < cocats_rest.length; restix++) {
                    result.push([cocats[cocatix]].concat(cocats_rest[restix]));
                }
            }
        }
        return result;
    }

}

/** strLin(lin, ?showpath, ?focuspath, ?prefix, ?suffix)
    @param lin: a linearisation as returned by GFConcrete.linearise()
    @param showpath: boolean, if true then show the path of each word
    @param focuspath: the highlighted node, if any (a string of digits)
    @param prefix, suffix: the string that should be used for highlighting
    @return: a String
**/
function strLin(lin : LinToken[],
                showpath? : boolean,
                focus? : string,
                prefix? : string,
                suffix? : string
               ) : string
{
    if (prefix == null) prefix = "*";
    if (suffix == null) suffix = prefix;
    return lin.map(function(w){
        var token = w.word;
        if (showpath) token += "/" + w.path;
        if (startswith(w.path, focus)) token = prefix + token + suffix;
        return token;
    }).join(" ");
}


//////////////////////////////////////////////////////////////////////
// GF trees

/** GFTree(node, ?children): creates a GF tree
    @param node, type: String
    @param children: an Array of GFTree's
    @return: a new object
**/

class GFTree {
    constructor(public node : string,
                public children : GFTree[]) {}

    // function GFTree(node : string, children? : string[]) : any {
    //     if (children) {
    //         return [node].concat(children);
    //     } else {
    //         return [node];
    //     }
    // }

    private static GFMETA = "?";

    static meta(typ : string) : GFTree {
        return new GFTree(GFTree.GFMETA + typ, []);
    }

    public isMeta() : string {
        return this.node[0] == GFTree.GFMETA && this.node.slice(1);
    }

    public size() : number {
        var size = 1;
        for (var i = 0; i < this.children.length; i++) {
            size += this.children[i].size();
        }
        return size;
    }

    public toString(focuspath? : string, prefix? : string, suffix? : string, maxdepth? : number) : string {
        if (prefix == null) prefix = "*";
        if (suffix == null) suffix = prefix;
        if (maxdepth !== null) {
            if (maxdepth <= 0) return "...";
            maxdepth--;
        }
        var result = (this.children.length == 0) ? this.node :
            "(" + this.node + " " + this.children.map((child, n) => {
                if (child == null) {
                    return GFTree.GFMETA;
                } else {
                    var newpath = focuspath && focuspath[0] == n+"" ? focuspath.slice(1) : null;
                    return child.toString(newpath, prefix, suffix, maxdepth);
                }
            }).join(" ") + ")";
        if (focuspath === "") 
            return prefix + result + suffix;
        else
            return result;
    }

    // /** strTree(tree, ?focuspath, ?prefix, ?suffix)
    //     @param tree: a GF tree
    //     @param focuspath: the highlighted node (a string of digits)
    //     @param prefix, suffix: the string that should be used for highlighting
    //     @return: a String
    // **/
    // function strTree(tree : any, focuspath? : string, prefix? : string, suffix? : string) : string {
    //     if (prefix == null) prefix = "*";
    //     if (suffix == null) suffix = prefix;
    //     var result : string ;
    //     if (tree instanceof Array) {
    //         result = "(" + tree.map((child, n) => {
    //             var newpath = focuspath && focuspath[0] == n ? focuspath.slice(1) : null;
    //             return strTree(child, newpath, prefix, suffix);
    //         }).join(" ") + ")";
    //     } else if (tree == null) {
    //         result = GFMETA;
    //     } else {
    //         result = "" + tree;
    //     }
    //     if (focuspath === "") 
    //         return prefix + result + suffix;
    //     else
    //         return result;
    // }

    public copy() : GFTree {
        return new GFTree(this.node, this.children.map((child) => {
            return (child instanceof GFTree) ? child.copy() : child;
        }));
    }

    // /** copyTree(tree)
    //     @param tree: a GF tree
    //     @return: a deep copy of the tree
    // **/
    // function copyTree(tree : any) : any {
    //     if (tree instanceof Array) {
    //         return tree.map(copyTree);
    //     } else {
    //         return tree;
    //     }
    // }

    public getSubtree(path : string) : GFTree {
        var subtree = this;
        for (var i = 0; i < path.length; i++) {
            var n = path[i];
            // var NODELEAF = ":"
            // if (n !== NODELEAF)
            subtree = subtree.children[n];
            if (!subtree) return;
        }
        return subtree;
    }

    // /** getSubtree(tree, path)
    //     @param tree: a GF tree
    //     @param path: node reference (a string of digits)
    //     @return: the subtree specified by the given path
    // **/
    // function getSubtree(tree : any, path : string) : any {
    //     var subtree = tree;
    //     for (var i = 0; i < path.length; i++) {
    //         var n = path[i];
    //         // var NODELEAF = ":"
    //         // if (n !== NODELEAF)
    //         subtree = subtree[n];
    //         if (!subtree) return;
    //     }
    //     return subtree;
    // };

    public updateSubtree(path : string, update : GFTree | Function) : void {
        if (path.length == 0) {
            var newsub : GFTree = (update instanceof Function) ? update(this) : update;
            this.node = newsub.node;
            this.children = newsub.children;
        } else {
            var n = path[path.length-1];
            var parent : GFTree = this.getSubtree(path.slice(0, -1));
            parent[n] = (update instanceof Function) ? update(parent[n]) : update;
        }
    }

    // /** updateSubtree(tree, path, update)
    //     @param tree: a GF tree
    //     @param path: node reference (a string of digits)
    //     @param update: a function that updates the specified subtree
    //     -- or a tree which should replace the existing subtree
    // **/
    // function updateSubtree(tree : any, path : string, update : any) {
    //     var n = path[path.length-1];
    //     path = path.slice(0, -1);
    //     var parent = getSubtree(tree, path);
    //     if (update instanceof Function) {
    //         parent[n] = (update instanceof Function) ? update(parent[n]) : update;
    //     }
    // }

    public updateCopy(path : string, update : GFTree | Function) : GFTree {
        var plen = path.length;
        function _updateSubtree(sub, i) {
            if (i >= plen) {
                return (update instanceof Function) ? update(sub) : update;
            } else {
                var n = parseInt(path[i]);
                return new GFTree(sub.node,
                                  sub.children.slice(0, n)
                                  .concat([_updateSubtree(sub.children[n], i+1)])
                                  .concat(sub.children.slice(n+1)));
            }
        }
        return _updateSubtree(this, 0);
    }

    // /** updateCopy(tree, path, update)
    //     @param tree: a GF tree
    //     @param path: node reference (a string of digits)
    //     @param update: a function that updates the specified subtree
    //     -- or a tree which should replace the existing subtree
    //     @return: an updated copy of the tree - the original tree is left unchanged
    // **/

    // function updateCopy(tree : any, path : string, update : any) : any {
    //     var plen = path.length;
    //     function _updateSubtree(sub, i) {
    //         if (i >= plen) {
    //             return (update instanceof Function) ? update(sub) : update;
    //         } else {
    //             var n = parseInt(path[i]);
    //             return sub.slice(0, n).concat([_updateSubtree(sub[n], i+1)]).concat(sub.slice(n+1));
    //         }
    //     }
    //     return _updateSubtree(tree, 0);
    // }

}

/** parseFocusedGFTree(descr)
    @param descr: a string representing the tree
    @return: a new GFTree
**/
function parseGFTree(descr : string) : GFTree {
    return parseFocusedGFTree(descr).tree;
}

/** parseFocusedGFTree(descr)
    @param descr: a string representing the tree
    @return: a record {tree: a new GFTree, focus: a focus node}
**/
function parseFocusedGFTree(descr : string) : {tree:GFTree; focus?:string} {
    var tokens = descr
        .replace(/(\*?)\( */g," $1(")
        .replace(/\)/g," ) ")
        .replace(/^ +| +$/g,"")
        .split(/ +/);
    var focus = null;
    var stack : GFTree[] = [new GFTree(null, [])];
    tokens.forEach(function(token){
        if (token[0] == "*") {
            focus = stack.map(function(t){return t.children.length}).join("").slice(1);
            token = token.slice(1);
        }
        if (token[0] == "(") {
            if (stack.length == 1 && stack[0].children.length > 0) {
                console.log("PARSE ERROR: Expected end-of-string, found '(': " + descr);
            } else if (token.length <= 1) {
                console.log("PARSE ERROR: Expected node, found end-of-string: " + descr);
            } else {
                var node = token.slice(1);
                stack.push(new GFTree(node, []));
            }
        } else if (token == ")") {
            if (stack.length == 1) {
                var err = (stack[0].children.length == 0)
                    ? "No matching open bracket" : "Expected end-of-string";
                console.log("PARSE ERROR: " + err + ", found ')': " + descr);
            } else {
                var tree = stack.pop();
                stack[stack.length-1].children.push(tree);
            }
        } else if (/^\w+$/.test(token)) {
            stack[stack.length-1].children.push(new GFTree(token, []));
        } else if (/^\?\w+$/.test(token)) {
            stack[stack.length-1].children.push(new GFTree(token, []));
        } else {
            console.log("PARSE ERROR: Unknown token " + token + ": " + descr);
        }
    });
    if (stack.length > 1) {
        console.log("PARSE ERROR: Expected close bracket, found end-of-string: " + descr);
    } else if (stack[0].children.length == 0) {
        console.log("PARSE ERROR: Expected open bracket, found end-of-string: " + descr);
    } else {
        return {tree:stack[0].children[0], focus:focus};
    }
}


//////////////////////////////////////////////////////////////////////
// utility functions

/** setdefault(dict, key, defval): lookup key in dict, and set it to defval if not there
    @param dict: an Object
    @param key: the String key
    @param defval: the default value to set, if key doesn't have a value already
    @return: the result of looking up key in dict
**/
function setdefault<V>(dict : {[key:string] : V}, key : string, defval : V) : V {
    if (dict[key] == null) 
        dict[key] = defval;
    return dict[key];
}

/** startswith(string, prefix)
    @param string, prefix: Strings
    @return: True if string starts with prefix
**/
function startswith(str : string, prefix : string) : boolean {
    if (typeof str == "string" && typeof prefix == "string")
        return str.slice(0, prefix.length) == prefix;
}

//////////////////////////////////////////////////////////////////////
// functions for creating GF grammars from auto-generated javascript
// DO NOT RELY ON THESE - they might change whenever GF's output format changes

function mkFun(i) { return "F" + i }
function mkCat(i) { return "C" + i }
function mkSeq(i) { return "S" + i }

class Type {
    constructor(public children : string[], public abscat : string) {}
}

interface Production {}

class Apply implements Production {
    public fun : string;
    constructor(fun : number, public children : PArg[]) {
        this.fun = mkFun(fun);
    }
}

class Coerce implements Production {
    public cat : string;
    constructor(cat : number) {
        this.cat = mkCat(cat);
    }
}

class PArg {
    public parg : string;
    constructor(cat : number) {
        this.parg = mkCat(cat);
    }
}

class CncFun {
    public seqs : string[];
    constructor(public absfun, seqs : number[]) {
        this.seqs = [];
        for (var i = 0; i < seqs.length; i++)
            this.seqs.push(mkSeq(seqs[i]));
    }
}

interface Symbol {}

class SymLit implements Symbol {
    constructor(public arg : number, public param : number) {}
}

class SymCat implements Symbol {
    constructor(public arg : number, public param : number) {}
}

class SymKS implements Symbol {
    public tokens : string[];
    constructor(...tokens : string[]) {
        this.tokens = tokens;
    }
}

class SymKP implements Symbol {
    constructor(public tokens : SymKS[], public alts : Alt[]) {}
}

class Alt {
    constructor(public tokens : SymKS[], public follows : string[]) {}
}

