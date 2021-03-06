/**
 * jQuery Cookie plugin
 *
 * Copyright (c) 2010 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */
jQuery.cookie = function (key, value, options) {

    // key and at least value given, set cookie...
    if (arguments.length > 1 && String(value) !== "[object Object]") {
        options = jQuery.extend({}, options);

        if (value === null || value === undefined) {
            options.expires = -1;
        }

        if (typeof options.expires === 'number') {
            var days = options.expires, t = options.expires = new Date();
            t.setDate(t.getDate() + days);
        }

        value = String(value);

        return (document.cookie = [
            encodeURIComponent(key), '=',
            options.raw ? value : encodeURIComponent(value),
            options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
            options.path ? '; path=' + options.path : '',
            options.domain ? '; domain=' + options.domain : '',
            options.secure ? '; secure' : ''
        ].join(''));
    }

    // key and possibly options given, get cookie...
    options = value || {};
    var result, decode = options.raw ? function (s) {
        return s;
    } : decodeURIComponent;
    return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

/*!
 * jQuery Templates Plugin 1.0.0pre
 * http://github.com/jquery/jquery-tmpl
 * Requires jQuery 1.4.2
 *
 * Copyright Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
(function (jQuery, undefined) {
    var oldManip = jQuery.fn.domManip, tmplItmAtt = "_tmplitem", htmlExpr = /^[^<]*(<[\w\W]+>)[^>]*$|\{\{\! /,
            newTmplItems = {}, wrappedItems = {}, appendToTmplItems, topTmplItem = { key:0, data:{} }, itemKey = 0, cloneIndex = 0, stack = [];

    function newTmplItem(options, parentItem, fn, data) {
        // Returns a template item data structure for a new rendered instance of a template (a 'template item').
        // The content field is a hierarchical array of strings and nested items (to be
        // removed and replaced by nodes field of dom elements, once inserted in DOM).
        var newItem = {
            data:data || (data === 0 || data === false) ? data : (parentItem ? parentItem.data : {}),
            _wrap:parentItem ? parentItem._wrap : null,
            tmpl:null,
            parent:parentItem || null,
            nodes:[],
            calls:tiCalls,
            nest:tiNest,
            wrap:tiWrap,
            html:tiHtml,
            update:tiUpdate
        };
        if (options) {
            jQuery.extend(newItem, options, { nodes:[], parent:parentItem });
        }
        if (fn) {
            // Build the hierarchical content to be used during insertion into DOM
            newItem.tmpl = fn;
            newItem._ctnt = newItem._ctnt || newItem.tmpl(jQuery, newItem);
            newItem.key = ++itemKey;
            // Keep track of new template item, until it is stored as jQuery Data on DOM element
            (stack.length ? wrappedItems : newTmplItems)[itemKey] = newItem;
        }
        return newItem;
    }

    // Override appendTo etc., in order to provide support for targeting multiple elements. (This code would disappear if integrated in jquery core).
    jQuery.each({
        appendTo:"append",
        prependTo:"prepend",
        insertBefore:"before",
        insertAfter:"after",
        replaceAll:"replaceWith"
    }, function (name, original) {
        jQuery.fn[ name ] = function (selector) {
            var ret = [], insert = jQuery(selector), elems, i, l, tmplItems,
                    parent = this.length === 1 && this[0].parentNode;

            appendToTmplItems = newTmplItems || {};
            if (parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1) {
                insert[ original ](this[0]);
                ret = this;
            } else {
                for (i = 0, l = insert.length; i < l; i++) {
                    cloneIndex = i;
                    elems = (i > 0 ? this.clone(true) : this).get();
                    jQuery(insert[i])[ original ](elems);
                    ret = ret.concat(elems);
                }
                cloneIndex = 0;
                ret = this.pushStack(ret, name, insert.selector);
            }
            tmplItems = appendToTmplItems;
            appendToTmplItems = null;
            jQuery.tmpl.complete(tmplItems);
            return ret;
        };
    });

    jQuery.fn.extend({
        // Use first wrapped element as template markup.
        // Return wrapped set of template items, obtained by rendering template against data.
        tmpl:function (data, options, parentItem) {
            return jQuery.tmpl(this[0], data, options, parentItem);
        },

        // Find which rendered template item the first wrapped DOM element belongs to
        tmplItem:function () {
            return jQuery.tmplItem(this[0]);
        },

        // Consider the first wrapped element as a template declaration, and get the compiled template or store it as a named template.
        template:function (name) {
            return jQuery.template(name, this[0]);
        },

        domManip:function (args, table, callback, options) {
            if (args[0] && jQuery.isArray(args[0])) {
                var dmArgs = jQuery.makeArray(arguments), elems = args[0], elemsLength = elems.length, i = 0, tmplItem;
                while (i < elemsLength && !(tmplItem = jQuery.data(elems[i++], "tmplItem"))) {
                }
                if (tmplItem && cloneIndex) {
                    dmArgs[2] = function (fragClone) {
                        // Handler called by oldManip when rendered template has been inserted into DOM.
                        jQuery.tmpl.afterManip(this, fragClone, callback);
                    };
                }
                oldManip.apply(this, dmArgs);
            } else {
                oldManip.apply(this, arguments);
            }
            cloneIndex = 0;
            if (!appendToTmplItems) {
                jQuery.tmpl.complete(newTmplItems);
            }
            return this;
        }
    });

    jQuery.extend({
        // Return wrapped set of template items, obtained by rendering template against data.
        tmpl:function (tmpl, data, options, parentItem) {
            var ret, topLevel = !parentItem;
            if (topLevel) {
                // This is a top-level tmpl call (not from a nested template using {{tmpl}})
                parentItem = topTmplItem;
                tmpl = jQuery.template[tmpl] || jQuery.template(null, tmpl);
                wrappedItems = {}; // Any wrapped items will be rebuilt, since this is top level
            } else if (!tmpl) {
                // The template item is already associated with DOM - this is a refresh.
                // Re-evaluate rendered template for the parentItem
                tmpl = parentItem.tmpl;
                newTmplItems[parentItem.key] = parentItem;
                parentItem.nodes = [];
                if (parentItem.wrapped) {
                    updateWrapped(parentItem, parentItem.wrapped);
                }
                // Rebuild, without creating a new template item
                return jQuery(build(parentItem, null, parentItem.tmpl(jQuery, parentItem)));
            }
            if (!tmpl) {
                return []; // Could throw...
            }
            if (typeof data === "function") {
                data = data.call(parentItem || {});
            }
            if (options && options.wrapped) {
                updateWrapped(options, options.wrapped);
            }
            ret = jQuery.isArray(data) ?
                    jQuery.map(data, function (dataItem) {
                        return dataItem ? newTmplItem(options, parentItem, tmpl, dataItem) : null;
                    }) :
                    [ newTmplItem(options, parentItem, tmpl, data) ];
            return topLevel ? jQuery(build(parentItem, null, ret)) : ret;
        },

        // Return rendered template item for an element.
        tmplItem:function (elem) {
            var tmplItem;
            if (elem instanceof jQuery) {
                elem = elem[0];
            }
            while (elem && elem.nodeType === 1 && !(tmplItem = jQuery.data(elem, "tmplItem")) && (elem = elem.parentNode)) {
            }
            return tmplItem || topTmplItem;
        },

        // Set:
        // Use $.template( name, tmpl ) to cache a named template,
        // where tmpl is a template string, a script element or a jQuery instance wrapping a script element, etc.
        // Use $( "selector" ).template( name ) to provide access by name to a script block template declaration.

        // Get:
        // Use $.template( name ) to access a cached template.
        // Also $( selectorToScriptBlock ).template(), or $.template( null, templateString )
        // will return the compiled template, without adding a name reference.
        // If templateString includes at least one HTML tag, $.template( templateString ) is equivalent
        // to $.template( null, templateString )
        template:function (name, tmpl) {
            if (tmpl) {
                // Compile template and associate with name
                if (typeof tmpl === "string") {
                    // This is an HTML string being passed directly in.
                    tmpl = buildTmplFn(tmpl);
                } else if (tmpl instanceof jQuery) {
                    tmpl = tmpl[0] || {};
                }
                if (tmpl.nodeType) {
                    // If this is a template block, use cached copy, or generate tmpl function and cache.
                    tmpl = jQuery.data(tmpl, "tmpl") || jQuery.data(tmpl, "tmpl", buildTmplFn(tmpl.innerHTML));
                    // Issue: In IE, if the container element is not a script block, the innerHTML will remove quotes from attribute values whenever the value does not include white space.
                    // This means that foo="${x}" will not work if the value of x includes white space: foo="${x}" -> foo=value of x.
                    // To correct this, include space in tag: foo="${ x }" -> foo="value of x"
                }
                return typeof name === "string" ? (jQuery.template[name] = tmpl) : tmpl;
            }
            // Return named compiled template
            return name ? (typeof name !== "string" ? jQuery.template(null, name) :
                    (jQuery.template[name] ||
                        // If not in map, and not containing at least on HTML tag, treat as a selector.
                        // (If integrated with core, use quickExpr.exec)
                            jQuery.template(null, htmlExpr.test(name) ? name : jQuery(name)))) : null;
        },

        encode:function (text) {
            // Do HTML encoding replacing < > & and ' and " by corresponding entities.
            return ("" + text).split("<").join("&lt;").split(">").join("&gt;").split('"').join("&#34;").split("'").join("&#39;");
        }
    });

    jQuery.extend(jQuery.tmpl, {
        tag:{
            "tmpl":{
                _default:{ $2:"null" },
                open:"if($notnull_1){__=__.concat($item.nest($1,$2));}"
                // tmpl target parameter can be of type function, so use $1, not $1a (so not auto detection of functions)
                // This means that {{tmpl foo}} treats foo as a template (which IS a function).
                // Explicit parens can be used if foo is a function that returns a template: {{tmpl foo()}}.
            },
            "wrap":{
                _default:{ $2:"null" },
                open:"$item.calls(__,$1,$2);__=[];",
                close:"call=$item.calls();__=call._.concat($item.wrap(call,__));"
            },
            "each":{
                _default:{ $2:"$index, $value" },
                open:"if($notnull_1){$.each($1a,function($2){with(this){",
                close:"}});}"
            },
            "if":{
                open:"if(($notnull_1) && $1a){",
                close:"}"
            },
            "else":{
                _default:{ $1:"true" },
                open:"}else if(($notnull_1) && $1a){"
            },
            "html":{
                // Unecoded expression evaluation.
                open:"if($notnull_1){__.push($1a);}"
            },
            "=":{
                // Encoded expression evaluation. Abbreviated form is ${}.
                _default:{ $1:"$data" },
                open:"if($notnull_1){__.push($.encode($1a));}"
            },
            "!":{
                // Comment tag. Skipped by parser
                open:""
            }
        },

        // This stub can be overridden, e.g. in jquery.tmplPlus for providing rendered events
        complete:function (items) {
            newTmplItems = {};
        },

        // Call this from code which overrides domManip, or equivalent
        // Manage cloning/storing template items etc.
        afterManip:function afterManip(elem, fragClone, callback) {
            // Provides cloned fragment ready for fixup prior to and after insertion into DOM
            var content = fragClone.nodeType === 11 ?
                    jQuery.makeArray(fragClone.childNodes) :
                    fragClone.nodeType === 1 ? [fragClone] : [];

            // Return fragment to original caller (e.g. append) for DOM insertion
            callback.call(elem, fragClone);

            // Fragment has been inserted:- Add inserted nodes to tmplItem data structure. Replace inserted element annotations by jQuery.data.
            storeTmplItems(content);
            cloneIndex++;
        }
    });

    //========================== Private helper functions, used by code above ==========================

    function build(tmplItem, nested, content) {
        // Convert hierarchical content into flat string array
        // and finally return array of fragments ready for DOM insertion
        var frag, ret = content ? jQuery.map(content, function (item) {
            return (typeof item === "string") ?
                // Insert template item annotations, to be converted to jQuery.data( "tmplItem" ) when elems are inserted into DOM.
                    (tmplItem.key ? item.replace(/(<\w+)(?=[\s>])(?![^>]*_tmplitem)([^>]*)/g, "$1 " + tmplItmAtt + "=\"" + tmplItem.key + "\" $2") : item) :
                // This is a child template item. Build nested template.
                    build(item, tmplItem, item._ctnt);
        }) :
            // If content is not defined, insert tmplItem directly. Not a template item. May be a string, or a string array, e.g. from {{html $item.html()}}.
                tmplItem;
        if (nested) {
            return ret;
        }

        // top-level template
        ret = ret.join("");

        // Support templates which have initial or final text nodes, or consist only of text
        // Also support HTML entities within the HTML markup.
        ret.replace(/^\s*([^<\s][^<]*)?(<[\w\W]+>)([^>]*[^>\s])?\s*$/, function (all, before, middle, after) {
            frag = jQuery(middle).get();

            storeTmplItems(frag);
            if (before) {
                frag = unencode(before).concat(frag);
            }
            if (after) {
                frag = frag.concat(unencode(after));
            }
        });
        return frag ? frag : unencode(ret);
    }

    function unencode(text) {
        // Use createElement, since createTextNode will not render HTML entities correctly
        var el = document.createElement("div");
        el.innerHTML = text;
        return jQuery.makeArray(el.childNodes);
    }

    // Generate a reusable function that will serve to render a template against data
    function buildTmplFn(markup) {
        return new Function("jQuery", "$item",
                // Use the variable __ to hold a string array while building the compiled template. (See https://github.com/jquery/jquery-tmpl/issues#issue/10).
                "var $=jQuery,call,__=[],$data=$item.data;" +

                    // Introduce the data as local variables using with(){}
                        "with($data){__.push('" +

                    // Convert the template into pure JavaScript
                        jQuery.trim(markup)
                                .replace(/([\\'])/g, "\\$1")
                                .replace(/[\r\t\n]/g, " ")
                                .replace(/\$\{([^\}]*)\}/g, "{{= $1}}")
                                .replace(/\{\{(\/?)(\w+|.)(?:\(((?:[^\}]|\}(?!\}))*?)?\))?(?:\s+(.*?)?)?(\(((?:[^\}]|\}(?!\}))*?)\))?\s*\}\}/g,
                                function (all, slash, type, fnargs, target, parens, args) {
                                    var tag = jQuery.tmpl.tag[ type ], def, expr, exprAutoFnDetect;
                                    if (!tag) {
                                        throw "Unknown template tag: " + type;
                                    }
                                    def = tag._default || [];
                                    if (parens && !/\w$/.test(target)) {
                                        target += parens;
                                        parens = "";
                                    }
                                    if (target) {
                                        target = unescape(target);
                                        args = args ? ("," + unescape(args) + ")") : (parens ? ")" : "");
                                        // Support for target being things like a.toLowerCase();
                                        // In that case don't call with template item as 'this' pointer. Just evaluate...
                                        expr = parens ? (target.indexOf(".") > -1 ? target + unescape(parens) : ("(" + target + ").call($item" + args)) : target;
                                        exprAutoFnDetect = parens ? expr : "(typeof(" + target + ")==='function'?(" + target + ").call($item):(" + target + "))";
                                    } else {
                                        exprAutoFnDetect = expr = def.$1 || "null";
                                    }
                                    fnargs = unescape(fnargs);
                                    return "');" +
                                            tag[ slash ? "close" : "open" ]
                                                    .split("$notnull_1").join(target ? "typeof(" + target + ")!=='undefined' && (" + target + ")!=null" : "true")
                                                    .split("$1a").join(exprAutoFnDetect)
                                                    .split("$1").join(expr)
                                                    .split("$2").join(fnargs || def.$2 || "") +
                                            "__.push('";
                                }) +
                        "');}return __;"
        );
    }

    function updateWrapped(options, wrapped) {
        // Build the wrapped content.
        options._wrap = build(options, true,
                // Suport imperative scenario in which options.wrapped can be set to a selector or an HTML string.
                jQuery.isArray(wrapped) ? wrapped : [htmlExpr.test(wrapped) ? wrapped : jQuery(wrapped).html()]
        ).join("");
    }

    function unescape(args) {
        return args ? args.replace(/\\'/g, "'").replace(/\\\\/g, "\\") : null;
    }

    function outerHtml(elem) {
        var div = document.createElement("div");
        div.appendChild(elem.cloneNode(true));
        return div.innerHTML;
    }

    // Store template items in jQuery.data(), ensuring a unique tmplItem data data structure for each rendered template instance.
    function storeTmplItems(content) {
        var keySuffix = "_" + cloneIndex, elem, elems, newClonedItems = {}, i, l, m;
        for (i = 0, l = content.length; i < l; i++) {
            if ((elem = content[i]).nodeType !== 1) {
                continue;
            }
            elems = elem.getElementsByTagName("*");
            for (m = elems.length - 1; m >= 0; m--) {
                processItemKey(elems[m]);
            }
            processItemKey(elem);
        }
        function processItemKey(el) {
            var pntKey, pntNode = el, pntItem, tmplItem, key;
            // Ensure that each rendered template inserted into the DOM has its own template item,
            if ((key = el.getAttribute(tmplItmAtt))) {
                while (pntNode.parentNode && (pntNode = pntNode.parentNode).nodeType === 1 && !(pntKey = pntNode.getAttribute(tmplItmAtt))) {
                }
                if (pntKey !== key) {
                    // The next ancestor with a _tmplitem expando is on a different key than this one.
                    // So this is a top-level element within this template item
                    // Set pntNode to the key of the parentNode, or to 0 if pntNode.parentNode is null, or pntNode is a fragment.
                    pntNode = pntNode.parentNode ? (pntNode.nodeType === 11 ? 0 : (pntNode.getAttribute(tmplItmAtt) || 0)) : 0;
                    if (!(tmplItem = newTmplItems[key])) {
                        // The item is for wrapped content, and was copied from the temporary parent wrappedItem.
                        tmplItem = wrappedItems[key];
                        tmplItem = newTmplItem(tmplItem, newTmplItems[pntNode] || wrappedItems[pntNode]);
                        tmplItem.key = ++itemKey;
                        newTmplItems[itemKey] = tmplItem;
                    }
                    if (cloneIndex) {
                        cloneTmplItem(key);
                    }
                }
                el.removeAttribute(tmplItmAtt);
            } else if (cloneIndex && (tmplItem = jQuery.data(el, "tmplItem"))) {
                // This was a rendered element, cloned during append or appendTo etc.
                // TmplItem stored in jQuery data has already been cloned in cloneCopyEvent. We must replace it with a fresh cloned tmplItem.
                cloneTmplItem(tmplItem.key);
                newTmplItems[tmplItem.key] = tmplItem;
                pntNode = jQuery.data(el.parentNode, "tmplItem");
                pntNode = pntNode ? pntNode.key : 0;
            }
            if (tmplItem) {
                pntItem = tmplItem;
                // Find the template item of the parent element.
                // (Using !=, not !==, since pntItem.key is number, and pntNode may be a string)
                while (pntItem && pntItem.key != pntNode) {
                    // Add this element as a top-level node for this rendered template item, as well as for any
                    // ancestor items between this item and the item of its parent element
                    pntItem.nodes.push(el);
                    pntItem = pntItem.parent;
                }
                // Delete content built during rendering - reduce API surface area and memory use, and avoid exposing of stale data after rendering...
                delete tmplItem._ctnt;
                delete tmplItem._wrap;
                // Store template item as jQuery data on the element
                jQuery.data(el, "tmplItem", tmplItem);
            }
            function cloneTmplItem(key) {
                key = key + keySuffix;
                tmplItem = newClonedItems[key] =
                        (newClonedItems[key] || newTmplItem(tmplItem, newTmplItems[tmplItem.parent.key + keySuffix] || tmplItem.parent));
            }
        }
    }

    //---- Helper functions for template item ----

    function tiCalls(content, tmpl, data, options) {
        if (!content) {
            return stack.pop();
        }
        stack.push({ _:content, tmpl:tmpl, item:this, data:data, options:options });
    }

    function tiNest(tmpl, data, options) {
        // nested template, using {{tmpl}} tag
        return jQuery.tmpl(jQuery.template(tmpl), data, options, this);
    }

    function tiWrap(call, wrapped) {
        // nested template, using {{wrap}} tag
        var options = call.options || {};
        options.wrapped = wrapped;
        // Apply the template, which may incorporate wrapped content,
        return jQuery.tmpl(jQuery.template(call.tmpl), call.data, options, call.item);
    }

    function tiHtml(filter, textOnly) {
        var wrapped = this._wrap;
        return jQuery.map(
                jQuery(jQuery.isArray(wrapped) ? wrapped.join("") : wrapped).filter(filter || "*"),
                function (e) {
                    return textOnly ?
                            e.innerText || e.textContent :
                            e.outerHTML || outerHtml(e);
                });
    }

    function tiUpdate() {
        var coll = this.nodes;
        jQuery.tmpl(null, null, null, this).insertBefore(coll[0]);
        jQuery(coll).remove();
    }
})(jQuery);

// jquery i18n local

jQuery.i18n = function (key) {
    if (irm_labels[key])
        return irm_labels[key];
    else
        return "Not translate for:" + key;
}
jQuery.t = jQuery.i18n;

//===================创建函数代理========================
Function.prototype.customCreateDelegate = function (obj, args, appendArgs) {
    var method = this;
    return function () {
        var callArgs = args || arguments;
        if (appendArgs === true) {
            callArgs = Array.prototype.slice.call(arguments, 0);
            callArgs = callArgs.concat(args);
        } else if (typeof appendArgs == "number") {
            callArgs = Array.prototype.slice.call(arguments, 0);
            // copy arguments first
            var applyArgs = [appendArgs, 0].concat(args);
            // create method call params
            Array.prototype.splice.apply(callArgs, applyArgs);
            // splice them in
        }
        return method.apply(obj || window, callArgs);
    };
};


//======================页面加载mask========================================
(function ($) {

    /**
     * Displays loading mask over selected element(s). Accepts both single and multiple selectors.
     *
     * @param label Text message that will be displayed on top of the mask besides a spinner (optional).
     *                 If not provided only mask will be displayed without a label or a spinner.
     * @param delay Delay in milliseconds before element is masked (optional). If unmask() is called
     *              before the delay times out, no mask is displayed. This can be used to prevent unnecessary
     *              mask display for quick processes.
     */
    $.fn.mask = function (label, delay) {
        $(this).each(function () {
            if (delay !== undefined && delay > 0) {
                var element = $(this);
                element.data("_mask_timeout", setTimeout(function () {
                    $.maskElement(element, label)
                }, delay));
            } else {
                $.maskElement($(this), label);
            }
        });
    };

    /**
     * Removes mask from the element(s). Accepts both single and multiple selectors.
     */
    $.fn.unmask = function () {
        $(this).each(function () {
            $.unmaskElement($(this));
        });
    };

    /**
     * Checks if a single element is masked. Returns false if mask is delayed or not displayed.
     */
    $.fn.isMasked = function () {
        return this.hasClass("masked");
    };

    $.maskElement = function (element, label) {

        //if this element has delayed mask scheduled then remove it and display the new one
        if (element.data("_mask_timeout") !== undefined) {
            clearTimeout(element.data("_mask_timeout"));
            element.removeData("_mask_timeout");
        }

        if (element.isMasked()) {
            $.unmaskElement(element);
        }

        if (element.css("position") == "static") {
            element.addClass("masked-relative");
        }

        element.addClass("masked");

        var maskDiv = $('<div class="loadmask"></div>');

        //auto height fix for IE
        if (navigator.userAgent.toLowerCase().indexOf("msie") > -1) {
            maskDiv.height(element.height() + parseInt(element.css("padding-top")) + parseInt(element.css("padding-bottom")));
            maskDiv.width(element.width() + parseInt(element.css("padding-left")) + parseInt(element.css("padding-right")));
        }

        //fix for z-index bug with selects in IE6
        if (navigator.userAgent.toLowerCase().indexOf("msie 6") > -1) {
            element.find("select").addClass("masked-hidden");
        }

        element.append(maskDiv);

        if (label !== undefined) {
            var maskMsgDiv = $('<div class="loadmask-msg" style="display:none;"></div>');
            maskMsgDiv.append('<div>' + label + '</div>');
            element.append(maskMsgDiv);

            //calculate center position
            maskMsgDiv.css("top", Math.round(element.height() / 2 - (maskMsgDiv.height() - parseInt(maskMsgDiv.css("padding-top")) - parseInt(maskMsgDiv.css("padding-bottom"))) / 2) + "px");
            maskMsgDiv.css("left", Math.round(element.width() / 2 - (maskMsgDiv.width() - parseInt(maskMsgDiv.css("padding-left")) - parseInt(maskMsgDiv.css("padding-right"))) / 2) + "px");

            maskMsgDiv.show();
        }

    };

    $.unmaskElement = function (element) {
        //if this element has delayed mask scheduled then remove it
        if (element.data("_mask_timeout") !== undefined) {
            clearTimeout(element.data("_mask_timeout"));
            element.removeData("_mask_timeout");
        }

        element.find(".loadmask-msg,.loadmask").remove();
        element.removeClass("masked");
        element.removeClass("masked-relative");
        element.find("select").removeClass("masked-hidden");
    };

})(jQuery);

jQuery.log = function (message, level) {
    var logZone = null;
    var defaultLevel = level || "Debug";
    if ($("body div#jqlog:first").length > 0) {
        logZone = $("body div#jqlog:first");
    } else {
        logZone = $("<div id='jqlog'></div>");
        $("body:first").append(logZone);
    }
    if (logZone)
        logZone.append(defaultLevel + ":" + message + "</br>");
}


// Simple plugin for deserialization of forms.
$.deserialize = function (str, options) {
    var pairs = str.split(/&amp;|&/i),
            h = {},
            options = options || {};
    for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split('=');
        kv[0] = decodeURIComponent(kv[0]);
        if (!options.except || options.except.indexOf(kv[0]) == -1) {
            if ((/^\w+\[\w+\]$/).test(kv[0])) {
                var matches = kv[0].match(/^(\w+)\[(\w+)\]$/);
                if (typeof h[matches[1]] === 'undefined') {
                    h[matches[1]] = {};
                }
                h[matches[1]][matches[2]] = decodeURIComponent(kv[1]);
            } else {
                h[kv[0]] = decodeURIComponent(kv[1]);
            }
        }
    }
    return h;
};

$.fn.deserialize = function (options) {
    return $.deserialize($(this).serialize(), options);
};

jQuery.scrollbarWidth = function () {
//    var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div>');
//    // Append our div, do our calculation and then remove it
//    $('body').append(div);
//    var w1 = $('div', div).innerWidth();
//    div.css('overflow-y', 'scroll');
//    var w2 = $('div', div).innerWidth();
//    $(div).remove();
//    return (w1 - w2);
    var i = document.createElement('p');
    i.style.width = '100%';
    i.style.height = '200px';

    var o = document.createElement('div');
    o.style.position = 'absolute';
    o.style.top = '0px';
    o.style.left = '0px';
    o.style.visibility = 'hidden';
    o.style.width = '200px';
    o.style.height = '150px';
    o.style.overflow = 'hidden';
    o.appendChild(i);

    document.body.appendChild(o);
    var w1 = i.offsetWidth;
    var h1 = i.offsetHeight;
    o.style.overflow = 'scroll';
    var w2 = i.offsetWidth;
    var h2 = i.offsetHeight;
    if (w1 == w2) w2 = o.clientWidth;
    if (h1 == h2) h2 = o.clientWidth;

    document.body.removeChild(o);

    window.scrollbarWidth = w1-w2;
    window.scrollbarHeight = h1-h2;
    return w1-w2;
}

jQuery.fn.hasVerticalScrollBar = function () {
    if (this[0].clientHeight < this[0].scrollHeight) {
        return true
    } else {
        return false
    }
}

jQuery.fn.hasHorizontalScrollBar = function () {
    if (this[0].clientWidth < this[0].scrollWidth) {
        return true
    } else {
        return false
    }
}
jQuery.fn.insertAtCaret = function (myValue) {

	return this.each(function() {

		//IE support
		if (document.selection) {

			this.focus();
			sel = document.selection.createRange();
			sel.text = myValue;
			this.focus();

		} else if (this.selectionStart || this.selectionStart == '0') {

			//MOZILLA / NETSCAPE support
			var startPos = this.selectionStart;
			var endPos = this.selectionEnd;
			var scrollTop = this.scrollTop;
			this.value = this.value.substring(0, startPos)+ myValue+ this.value.substring(endPos,this.value.length);
			this.focus();
			this.selectionStart = startPos + myValue.length;
			this.selectionEnd = startPos + myValue.length;
			this.scrollTop = scrollTop;

		} else {

			this.value += myValue;
			this.focus();
		}
	});
};
