/*
 * Copyright 2017 Republic of Reinvention bvba. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *     
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Created by wouter on 8/07/15.
 */

base.plugin("blocks.core.MediumEditorExtensions", ["base.core.Class", "blocks.core.Notification", "blocks.imports.Widget", "blocks.core.Sidebar", "base.core.Commons", "messages.blocks.core", "constants.blocks.imports.text", "messages.blocks.imports.text", function (Class, Notification, Widget, Sidebar, Commons, BlocksMessages, TextConstants, TextMessages)
{
    var MediumEditorExtensions = this;

    //extends the dest object with all the properties in source and returns dest
    var extendOptions = function (dest, source)
    {
        var prop;
        dest = dest || {};
        for (prop in source) {
            if (source.hasOwnProperty(prop) && !dest.hasOwnProperty(prop)) {
                dest[prop] = source[prop];
            }
        }
        return dest;
    };

    //-----CLASS DEFINITIONS-----
    //used this as a reference: https://github.com/arcs-/MediumButton
    this.StylesPicker = Class.create(MediumEditor.extensions.form, {

        //-----CONSTANTS-----
        STATIC: {
            NAME: "styles-picker",
            VALUE_ATTR: "data-value"
        },

        editorStyles: [],
        //will keep an object with tag names that contain objects
        allTags: {},

        //-----CONSTRUCTORS-----
        constructor: function (options)
        {
            MediumEditorExtensions.StylesPicker.Super.call(this, options);

            this.name = MediumEditorExtensions.StylesPicker.NAME;
            this.options = extendOptions(options, {});
            this.isFormVisible = false;
            this.hasForm = false;
            this.editorStyles = [];
        },

        //-----OVERLOADED FUNCTIONS-----
        createButton: function ()
        {
            return this._createButtonElement().get(0);
        },

        isDisplayed: function ()
        {
            return this.isFormVisible;
        },

        handleClick: function (event)
        {
            //noop, bubble up to bootstrap instead
        },

        getForm: function ()
        {
        },

        hideForm: function ()
        {
        },

        checkState: function ()
        {
            //var html = getCurrentSelection();
            //if (this.options.start != '' && html.indexOf(this.options.start) > -1 && html.indexOf(this.options.end) > -1) {
            //    this.button.classList.add('medium-editor-button-active');
            //}
        },

        //-----OWN FUNCTIONS-----

        /**
         * Styles is an array with objects
         * object is of type {value: "", text: ""}
         * value = "p:red" -> text before the colon is the tag, text after the colon are the classes that will be added
         * nothing after colon will remove all classes, nothing before colon will not touch the tag
         * text is the text in the dropdown
         *
         * ----- example config -----
         * var styles = [
         * This will clear the existing classes, but leave the tag alone
         * {value: ":", text: Messages.p},
         *
         * This is generally the default case: a p without classes (eg. when hitting enter in editor)
         * {value: "p:", text: Messages.p},
         *
         * Will change the tag to <h1> and remove existing classes
         * {value: "h1:", text: Messages.h1},
         *
         * Will change the tag to <h1> clear existing classes and add the classes after the colon
         * {value: "h1:red", text: Messages.h1Red}
         * ];
         * ----------------------------
         */
        setStyles: function (newStyles)
        {
            this.editorStyles = newStyles;
        },
        getStyles: function ()
        {
            return this.editorStyles;
        },

        //-----PRIVATE FUNCTIONS-----
        _createButtonElement: function ()
        {
            var id = Commons.generateId();
            var button = $('<div class="dropdown btn-group ' + TextConstants.EDITOR_STYLES_CLASS + '"/>');
            var toggle = $('<button id="' + id + '" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Style <span class="caret"></span></button>');

            //indicate the selected style on opening of the dropdown
            var _this = this;
            toggle.click(function (e)
            {
                //only trigger while opening, not on close
                if (toggle.attr('aria-expanded') == 'false') {
                    //reset all combo list items
                    button.find('ul.dropdown-menu li').removeClass('active');

                    var selectedElements = _this._findSelectedElements();
                    for (var i = 0; i < selectedElements.length; i++) {
                        var el = selectedElements[i];

                        //contains a reference in our allTags structure
                        if (el.ref) {
                            el.ref.li.addClass('active');
                        }
                    }
                }
            });

            this.allTags = {};
            var styles = $('<ul class="dropdown-menu" aria-labelledby="' + id + '"/>');
            for (var i = 0; i < this.editorStyles.length; i++) {
                var val = this.editorStyles[i];

                // we'll use the texts with value null as a means to let the user define custom html (like subtitles)
                //note that you should know what's you're doing when using this
                if (val.text == null) {
                    if (val.value != null) {
                        styles.append(val.value);
                    }
                }
                //if it's not a special html case, add a link
                else {
                    //note that we bind to this, but pass the data in the function()
                    var btn = $('<a href="javascript:void(0)" ' + MediumEditorExtensions.StylesPicker.VALUE_ATTR + '="' + val.value + '">' + val.text + '</a>');
                    btn.click(btn.attr(MediumEditorExtensions.StylesPicker.VALUE_ATTR), function (event)
                    {
                        this._onSelect(event.data);

                        //close the dropdown on click, apparently this didn't work automatically...
                        $('#' + id).dropdown("toggle");
                    }.bind(this));


                    var newLi = $('<li></li>').append(btn);
                    styles.append(newLi);

                    //save everything in a structured list
                    //let's void weird config values
                    if (val.value.indexOf(':') >= 0) {
                        var config = val.value.split(':');
                        var tag = config[0].trim().toLowerCase();
                        var clazz = config[1].trim();
                        //uniformly handle empty tags and classes
                        if (!tag) {
                            tag = '';
                        }
                        if (!clazz) {
                            clazz = '';
                        }
                        //don't keep references to empty tags
                        //new entry, create the object
                        if (!(tag in this.allTags)) {
                            this.allTags[tag] = {};
                        }

                        //create a structure (the li will be filled later on, see below)
                        this.allTags[tag][clazz] = {
                            tag: tag,
                            clazz: clazz,
                            text: val.text,
                            value: val.value,
                            li: newLi
                        };
                    }
                }
            }

            button.append(toggle).append(styles);

            return button;
        },
        _onSelect: function (configValue)
        {
            this.base.saveSelection();

            var arguments = configValue.split(':');
            var tag = arguments[0].trim().toLowerCase();
            var clazz = arguments[1].trim();

            var selectedElements = this._findSelectedElements();

            for (var i = 0; i < selectedElements.length; i++) {
                var el = selectedElements[i].element;
                if (tag != "") {
                    var newEl = $("<" + tag + "/>");
                    //to be on the safe (and easy) side, we use .text() instead of .html()
                    // because it resulted in way too many outlier errors
                    newEl.html(el.text());
                    el.replaceWith(newEl);
                    el = newEl;
                }

                if (clazz != "") {
                    el.addClass(clazz);
                }
                else {
                    el.removeAttr("class");
                }
            }

            //make sure the caret is at the same position as before
            this.base.restoreSelection();

            //re-positions the toolbar
            this.base.checkSelection();
        },
        _findSelectedElements: function ()
        {
            var _this = this;
            //this will contain all the elements that are currently selected, both parents and children (eg. both <a> and <p> if nested)
            var elements = MediumEditor.selection.getSelectedElements(this.document);
            if (elements.length == 0) {
                elements.push(MediumEditor.selection.getSelectedParentElement(MediumEditor.selection.getSelectionRange(this.document)));
            }

            //we'll filter the list of elements to only keep the top-level (eg. the ones just below the "contenteditable")
            //and eliminate doubles in the mean time
            var filtered = [];
            var filteredNative = [];
            for (var i = 0; i < elements.length; i++) {
                var el = $(elements[i]);
                var selected = undefined;

                //1: only select elements _inside_ our editor (note that Medium Editor overloads the standard contenteditable attribute)
                //2: safety check: don't let the loop go all the way up the DOM, block at body
                while (!selected && !el.attr("contenteditable") && el[0].nodeName.toLowerCase() !== "body") {
                    var parent = el.parent();

                    if (parent.attr("contenteditable")) {
                        selected = el;
                    }
                    else {
                        el = el.parent();
                    }
                }

                if (selected) {
                    var index = $.inArray(selected[0], filteredNative);
                    if (index < 0) {
                        filteredNative.push(selected[0]);
                        filtered.push(selected);
                    }
                }
            }

            // Filter all elements that we will change with our style
            var retVal = [];
            for (var i = 0; i < filtered.length; i++) {
                var el = $(filtered[i]);
                var elTag = el[0].nodeName.toLowerCase();

                //We distinguish between three major cases:
                // 1) Both class and tag match (eg. h1:red)
                // 2) Only tag matches (eg. h1:)
                // 3) Only class matches (eg. :red)

                //1) and 2)
                if (elTag in this.allTags) {
                    //1) first try to find the most specific match: tag+class
                    var addedNew = false;
                    $.each(this.allTags[elTag], function (key, value)
                    {
                        if (key != '' && el.hasClass(key)) {
                            retVal.push({
                                element: el,
                                nodeName: elTag,
                                ref: _this.allTags[elTag][key]
                            });
                            addedNew = true;
                        }
                    });

                    //2) if no matching class was found, use the general case
                    //note that we nee to include this match because this method is also used to return matches that will receive a new class
                    if (!addedNew) {
                        retVal.push({
                            element: el,
                            nodeName: elTag,
                            ref: this.allTags[elTag]['']
                        });
                    }
                }

                //3)
                //Note: the empty tag is used to store all the general classes; it must be there to make sense
                //Also note this always need to run, because we can have multiple matches
                if (this.allTags['']) {
                    //iterate over all general classes
                    $.each(this.allTags[''], function (key, value)
                    {
                        if (key != '' && el.hasClass(key)) {
                            retVal.push({
                                element: el,
                                nodeName: elTag,
                                ref: _this.allTags[''][key]
                            });
                        }
                    });
                }
            }

            return retVal;
        }
    });

    this.LinkInput = Class.create(MediumEditor.extensions.anchor, {

        //-----CONSTANTS-----
        STATIC: {
            NAME: "link-input"
        },

        //-----VARIABLES-----
        linkElement: null,
        //reset: see constructor

        //-----CONSTRUCTORS-----
        constructor: function (options)
        {
            MediumEditorExtensions.LinkInput.Super.call(this, options);

            this.name = MediumEditorExtensions.LinkInput.NAME;
            this.options = extendOptions(options, {});
            this.cssPrefix = this.name + '-';
            this.confirmBtnClass = this.cssPrefix + 'confirm';
            this.cancelBtnClass = this.cssPrefix + 'cancel';
            this.openBtnClass = this.cssPrefix + 'open';
            this.deleteBtnClass = this.cssPrefix + 'delete';
        },

        //-----OVERLOADED FUNCTIONS-----
        // Called when the button the toolbar is clicked
        handleClick: function (event)
        {
            event.preventDefault();
            event.stopPropagation();

            var range = MediumEditor.selection.getSelectionRange(this.document);

            //reset the vars
            var opts = undefined;
            this.linkElement = null;

            if (range.startContainer.nodeName.toLowerCase() === 'a' ||
                range.endContainer.nodeName.toLowerCase() === 'a' ||
                MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a')) {

                //switch for old/new style
                if (true) {
                    var rawLinkEl = MediumEditor.selection.getSelectedParentElement(range);
                    //it's possible the caret is just inside the link, make sure we select it all,
                    //or a new <a> will get inserted at the caret's position instead of replacing the
                    //entire link's href
                    this.base.selectElement(rawLinkEl);

                    //save the link for later on
                    this.linkElement = $(rawLinkEl);
                    var href = this.linkElement.attr('href');
                    var target = this.linkElement.attr('target');
                    opts = {
                        value: href ? href : null,
                        target: target
                    };
                }
                else {
                    //this was the old behavior
                    return this.execAction('unlink');
                }
            }

            if (!this.isDisplayed()) {
                this.showForm(opts);
            }

            return false;
        },

        hideForm: function ()
        {
            MediumEditorExtensions.LinkInput.Super.prototype.hideForm.call(this);
        },

        showForm: function (opts)
        {
            //don't let the toggle changes get animated, it's weird when showing the panel for the first time
            this.setAnchorTargetAnimation(false);

            MediumEditorExtensions.LinkInput.Super.prototype.showForm.call(this, opts);

            //we need to call this because the parent method sets it, but doens't trigger the UI change
            $(this.getAnchorTargetCheckbox()).change();

            //after the timer for the (disabled) animation of the toggle is done,
            //it's nice to re-activate it for the user
            var that = this;
            setTimeout(function ()
            {
                that.setAnchorTargetAnimation(true)
            }, 500);

            //make sure we start from scratch
            var btnGroup = $(this.getForm().querySelector('.btn-group'));
            btnGroup.empty();

            //first of all, we add the save button
            var okBtn = $('<button type="button" class="btn btn-md btn-primary medium-editor-toolbar-save ' + this.confirmBtnClass + '"><i class="fa fa-check"></i></button>').appendTo(btnGroup);
            //note that this won't do anything if the value of the input field is not set
            //sometimes, it's a bit counter-intuitive, but what the hell, it's only a minor thing
            //and I didn't want to re-write the whole createLink() method
            okBtn.click(this.handleSaveClick.bind(this));

            //if we don't have a link (this is the first time the panel gets launched),
            //don't show the advanced buttons because they don't make any sense
            if (this.linkElement) {

                var that = this;
                var link = this.linkElement.attr('href');

                var openBtn = null;
                if (link) {
                    openBtn = $('<li><a href="javascript:void(0)" data-role="force" class="' + this.openBtnClass + '">' + TextMessages.linkControlOpen + '</a></li>');
                    openBtn.click(function (e)
                    {
                        //this is for the 'live' link
                        //var link = $(that.getInput()).val();
                        if (link) {
                            window.open(link, '_blank');
                        }
                        else {
                            Notification.warn(TextMessages.invalidLinkWarning);
                        }
                    });
                }

                var deleteBtn = $('<li><a href="javascript:void(0)" class="' + this.deleteBtnClass + '">' + TextMessages.linkControlDelete + '</a></li>');
                deleteBtn.click(function (e)
                {
                    //this native method seemed buggy, replaced with jquery variant
                    //that.execAction('unlink');

                    that.linkElement.replaceWith(that.linkElement.text());
                    //Note: we can't save it, or the current input value will be used
                    that.doFormCancel();
                });

                //only add complex UI when needed
                if (openBtn || deleteBtn) {
                    var toggleBtn = $('<button type="button" class="btn btn-md btn-primary dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button>').appendTo(btnGroup);
                    var actionsMenu = $('<ul class="dropdown-menu"></ul>').appendTo(btnGroup);
                    if (openBtn) {
                        openBtn.appendTo(actionsMenu);
                    }
                    if (deleteBtn) {
                        deleteBtn.appendTo(actionsMenu);
                    }
                }
            }
        },

        /**
         * See medium_editor.js AnchorForm.getTemplate() for a HTML reference
         */
        createForm: function ()
        {
            var form = $('<div id="' + ('medium-editor-toolbar-form-anchor-' + this.getEditorId()) + '" class="form medium-editor-toolbar-form"></div>');

            //this will contain the input, checkboxes, etc, but not the buttons
            var formWidgets = $('<div class="' + TextConstants.EDITOR_ANCHOR_FORM_WIDGETS_CLASS + '"></div>').appendTo(form);

            //TODO this is a fast hack to make the createTextInput() method below work cause we're not subclassing from Widget
            var dummyWidget = new Widget.Class();

            //var inputActions = this.buildInputActions(Sidebar, true, true, null);
            //TODO add the inputActions to the constructor below, but make it work with the sidebar finder
            var linkInput = dummyWidget.createTextInput(Sidebar,
                function getterFunction()
                {
                    //return element.attr(attribute);
                },
                function setterFunction(val)
                {
                    //return element.attr(attribute, val);
                },
                null, this.placeholderText, false, null)
                .appendTo(formWidgets);

            linkInput.find('input').addClass('medium-editor-toolbar-input');

            var targetToggle = dummyWidget.createToggleButton(TextMessages.linkTargetLabel,
                function initStateCallback()
                {
                    // var retVal = element.parent(LINK_SELECTOR).length > 0;
                    //
                    // if (retVal) {
                    //     startState = true;
                    // }
                    //
                    // return retVal;
                },

                function switchStateCallback(oldState, newState)
                {
                    // if (newState) {
                    //     element.wrap(wrapLink);
                    //     addInputForm();
                    // } else {
                    //     //this parent-child iteration ensures we have a <a> parent
                    //     element.parent(LINK_SELECTOR).children().unwrap();
                    //     removeInputForm();
                    // }
                },
                BlocksMessages.toggleLabelYes,
                BlocksMessages.toggleLabelNo)
                .appendTo(formWidgets);

            targetToggle.find('input').addClass('medium-editor-toolbar-anchor-target');

            var formControls = $('<div class="' + TextConstants.EDITOR_ANCHOR_FORM_CONTROLS_CLASS + '"></div>').appendTo(form);
            var btnGroup = $('<div class="btn-group"></div>').appendTo(formControls);
            //Note: the buttons are set in the showForm() method

            var cancelBtn = $('<a class="btn btn-link medium-editor-toolbar-close ' + this.cancelBtnClass + '"><i class="fa fa-close"></i></a>').appendTo(form);
            cancelBtn.click(this.handleCloseClick.bind(this));

            return form.get(0);
        },
        doFormSave: function ()
        {
            //this is a little preprocessing filter to support naked emails
            //(we'll prepend the mailto: protocol if we detect a mail address)
            var input = $(this.getInput());
            var value = input.val();
            if (!(value.indexOf('mailto:') == 0)
                //see http://emailregex.com/
                && /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value)) {
                input.val('mailto:' + value);
            }

            MediumEditorExtensions.LinkInput.Super.prototype.doFormSave.call(this);
        },
        getInput: function ()
        {
            return this.getForm().querySelector('input.medium-editor-toolbar-input');
        },
        getAnchorTargetCheckbox: function ()
        {
            return this.getForm().querySelector('input.medium-editor-toolbar-anchor-target');
        },
        setAnchorTargetAnimation: function (enableAnimation)
        {
            var toggleGroup = $(this.getAnchorTargetCheckbox()).parent().find('.toggle-group');

            if (enableAnimation) {
                toggleGroup.removeClass(TextConstants.LINK_TOGGLE_NO_ANIM_CLASS);
            }
            else {
                toggleGroup.addClass(TextConstants.LINK_TOGGLE_NO_ANIM_CLASS);
            }
        }


        //-----OWN FUNCTIONS-----

        //-----PRIVATE FUNCTIONS-----
    });

    this.ButtonExt = Class.create(MediumEditor.extensions.button, {

        //-----CONSTANTS-----

        //-----VARIABLES-----

        //-----CONSTRUCTORS-----
        constructor: function (options)
        {
            MediumEditorExtensions.ButtonExt.Super.call(this, options);
        },

        //-----OVERLOADED FUNCTIONS-----
        handleClick: function (event)
        {
            if (this.name == 'removeFormat') {

                event.preventDefault();
                event.stopPropagation();

                //this will not only remove formatting (eg. <b> and <i>) in this element,
                //but offers us a way to wipe the entire styling of the selected tag,
                //possibly correcting mistakes and so on
                //Note that this is a bit brute force and doesn't take there real selection
                //into account, but we can live with that
                var range = MediumEditor.selection.getSelectionRange(this.document);
                var elNode = MediumEditor.selection.getSelectedParentElement(range);
                if (elNode) {
                    var el = $(elNode);

                    //detect inline mode and add a <p> to the text if we're
                    //dealing with full-html editing
                    if (this.base.options.disableReturn) {
                        el.replaceWith(el.text());
                    }
                    else {
                        el.replaceWith($('</p>').html(el.text()));
                    }

                    //this is a chance to delete left-over (and undeletable) empty tags
                    // that are messing up the formatting
                    el.find(':empty').remove();
                }
            }
            else {
                MediumEditorExtensions.ButtonExt.Super.prototype.handleClick.call(this, event);
            }
        },
    });

    this.PasteHandlerExt = Class.create(MediumEditor.extensions.paste, {

        //-----CONSTANTS-----
        STATIC: {
            NAME: "paste-ext"
        },

        //-----VARIABLES-----

        //-----CONSTRUCTORS-----
        constructor: function (options)
        {
            MediumEditorExtensions.PasteHandlerExt.Super.call(this, options);

            this.acceptedStyles = options.acceptedStyles;
            this.inlineEditor = options.inlineEditor;

            //we'll iterate over the values and make everything an array to smooth processing later on
            //also, we'll link the general styles into the specific styles so we don't have to differentiate
            var generalAttrs = this.acceptedStyles['*'];
            //note: we always need at least a <p>, because it
            //represents the replacement containers for block text
            //so we add it if it's not there
            var hasP = false;
            var _this = this;
            $.each(this.acceptedStyles, function (tagName, attrs)
            {
                //uniformize
                var tagNameLower = tagName.toLowerCase();

                //if we're dealing with an inline editor,
                //we need to remove all blocks or we'll end up with invalid states
                if (options.inlineEditor && Commons.isBlockElement(tagNameLower)) {
                    delete _this.acceptedStyles[tagName];
                }
                else {

                    if (!hasP && tagNameLower == 'p') {
                        hasP = true;
                    }

                    $.each(attrs, function (attr, value)
                    {
                        if (!$.isArray(value)) {
                            attrs[attr] = [value];
                        }
                    });

                    if (tagNameLower != '*' && generalAttrs) {
                        $.each(generalAttrs, function (generalAttr, generalValue)
                        {
                            if (generalAttr in attrs) {
                                //append the general array to the existing array
                                //note that this might possibly double allowed values,
                                //but that's not such a big deal, right?
                                for (var i = 0; i < generalValue.length; i++) {
                                    attrs[generalAttr].push(generalValue[i]);
                                }
                            }
                            else {
                                attrs[generalAttr] = generalValue;
                            }
                        });
                    }
                }
            });

            if (!hasP && !options.inlineEditor) {
                this.acceptedStyles['p'] = generalAttrs || {};
            }
        },

        //-----OVERLOADED FUNCTIONS-----
        pasteHTML: function (html, options)
        {
            var _this = this;

            //note: parseHTML() returns an array of (raw) dom nodes
            var container = $('<div/>');
            //var domTags = $.parseHTML('Dit is een test <h1>Met een hoofd</h1> <p> en <b>een</b> paragraaf</p>');
            var domTags = $.parseHTML(html);
            for (var i = 0; i < domTags.length; i++) {
                var node = domTags[i];

                var filteredNode = this._filterElementsRecursively($(node));
                if (filteredNode) {
                    container.append(filteredNode);
                }
            }

            this._insertHTML(container);
        },
        _filterElementsRecursively: function (el)
        {
            el = this._filterElement(el);

            //null value means the element got deleted
            //no children means the returned value is a string or a text node
            if (el && el.children) {
                var _this = this;
                el.children().each(function (i, val)
                {
                    var child = $(val);
                    var filteredChild = _this._filterElementsRecursively(child);
                    if (filteredChild) {
                        child.replaceWith(filteredChild);
                    }
                    else {
                        child.remove();
                    }
                });
            }

            return el;
        },
        _filterElement: function (el)
        {
            var retVal = null;

            //We'll try to avoid creating empty blocks
            //note that we shouldn't use text() because some 'empty' elements, like <span>&nbsp;</span>
            //really do matter and have a function (like adding spacing before and after links)
            var nodeName = el[0].nodeName;
            var isTextNode = nodeName.indexOf('#') == 0;
            if (isTextNode || el.html().trim() != '') {
                //note: compared to tagName, nodeName also returns something for eg #text, #comment, etc.
                //note that this means free-standing text (not surrounded by an element), will be removed
                //if nothing is set in the rules for the tag '#text'
                //Also note that all node names in the style rules must be lowercase
                var tagRules = this.acceptedStyles[nodeName.toLowerCase()];

                //if we find rules for this tag, this means it's allowed,
                //we just need to filter it's attributes
                if (tagRules) {
                    this._filterAttributes(el, tagRules);
                    retVal = el;
                }
                //if this tag is not allowed, we textify it, trying to preserve 'blocks'
                else {
                    //Note: creating a span here isn't the right solution,
                    // we just want to convert it to a text node,
                    // so the editor's content won't be cluttered with
                    // a bunch of <span> wrapped text
                    var textContent = el.text();

                    //leave the retVal at null if the text is empty
                    if (textContent.trim() != '') {

                        //Note: if we convert a block element to an inline element because we're in
                        //inline mode, we need to append a space too, because this would
                        //join the texts of two blocks together without spacing.
                        //This means the last one will have a trailing space, but I can live with that
                        var isBlock = !isTextNode && (el.css('display') == 'block' || Commons.isBlockElement(el));
                        if (this.inlineEditor || isBlock) {
                            textContent += ' ';
                        }

                        //from the text(string) docs:
                        // We need to be aware that this method escapes the string provided as necessary so that it will render correctly in HTML.
                        retVal = $('<p/>').text(textContent);
                    }
                }
            }

            if (retVal) {
                //these are two cleaning methods we took over from the parent method
                //(to be found with: MediumEditorExtensions.PasteHandlerExt.Super.prototype.pasteHTML.call(this, container.html(), options);)
                if (typeof retVal === 'string' || retVal instanceof String) {
                    //no need to cleanup spans when we're a string
                    retVal = retVal.replace(/&nbsp;/g, ' ');
                }
                //when it's not a string, it's a jquery element
                else {

                    //this will probably be just one
                    for (var i = 0; i < retVal.length; i++) {
                        if (retVal[i]) {
                            this.cleanupSpans(retVal[i]);
                        }
                    }

                    retVal.html(retVal.html().replace(/&nbsp;/g, ' '));
                }
            }

            return retVal;
        },
        _filterAttributes: function (el, tagRules)
        {
            if (tagRules) {

                //iterate the attributes (using plain JS) of the element
                //and remove everything that's not allowed
                var attrs = [];
                //note: we need to build a temp array because we're about to modify the attributes on the fly
                var elAttrs = el[0].attributes;
                for (var i = 0; i < elAttrs.length; i++) {
                    var a = elAttrs[i];
                    attrs.push({
                        name: a.name,
                        value: a.value
                    });
                }

                for (var i = 0; i < attrs.length; i++) {
                    var attrName = attrs[i].name;
                    var attrValue = attrs[i].value;

                    var attrRules = tagRules[attrName];
                    //if the attribute is in the rules, we keep it and start
                    //processing it's value
                    if (attrRules) {
                        //iterate all the allowed values for this attribute
                        var allowedAttr = false;
                        var cleanedStyle = '';
                        for (var j = 0; j < attrRules.length && !allowedAttr; j++) {

                            var attrAllowedValue = attrRules[j];

                            //if the value is a wildcard, we're safe
                            if (attrAllowedValue == '*') {
                                allowedAttr = true;
                            }
                            else {
                                if (attrName == "style") {
                                    var allowedStyles = attrAllowedValue.split(':');
                                    var allowedStyleName = allowedStyles[0].trim();
                                    var allowedStyleValue = allowedStyles[1].trim();
                                    //trim the semicolon at the end if there's one
                                    while (allowedStyleValue.charAt(allowedStyleValue.length - 1) == ';') {
                                        allowedStyleValue = allowedStyleValue.substring(0, allowedStyleValue.length - 1);
                                    }

                                    //the style value can be anything, just copy it over
                                    if (allowedStyleValue == '*' || el.css(allowedStyleName) == allowedStyleValue) {
                                        cleanedStyle += allowedStyleName + ': ' + el.css(allowedStyleName) + '; ';
                                    }

                                    //note: don't set the allowedAttr because we must validate all styles till the end
                                }
                                else {
                                    allowedAttr = attrValue.trim() == attrAllowedValue;
                                }
                            }
                        }

                        if (!allowedAttr) {
                            el.removeAttr(attrName);
                        }
                        el.removeAttr('style');
                        if (cleanedStyle != '') {
                            el.attr('style', cleanedStyle.trim());
                        }
                    }
                    //otherwise, we delete it immediately
                    else {
                        el.removeAttr(attrName);
                    }
                }
            }
        },
        /**
         * This is basically our own implementation of the standard insertHTML() command
         * because we wanted to be able to control it more tightly.
         * We started out with the insertHTMLCommand() in the Medium Editor source code,
         * and pulled in the Rangy library for more control over the selected text.
         */
        _insertHTML: function (htmlContainer)
        {
            //note: we switched to using the Rangy library for managing the selection,
            //because it frees us from a lot of headache
            var sel = rangy.getSelection();

            if (sel.rangeCount > 0) {

                //this helps a lot in removing any whitespace from the start and end of the selection
                //and especially when using a triple-click on full paragraphs (which also selects the newline
                // up until just before the next tag). But note that this will
                //also trim the spaces from an eg. regular text section, yielding in a result where
                //the selected space will be unselected before the paste is done, which feels unnatural.
                //But for now, the benefits of the first case are more important.
                //Update: we modified this to trimEnd() (instead of just trim()) and introduced a check
                //for a text node at the end of the selection, resulting is more natural behavior for the
                //case described above.
                if (sel.focusNode && sel.focusNode.nodeName && sel.focusNode.nodeName != '#text') {
                    //if we have nothing selected (the cursor is just placed somewhere),
                    //this would stop the paste from happening, so avoid that
                    var noSelection = sel.focusNode == sel.anchorNode && sel.focusOffset == 0 && sel.anchorOffset == 0;
                    if (!noSelection) {
                        sel.trimEnd();
                    }
                }

                //note that normal use only supports one selection
                var range = sel.getRangeAt(0);

                //this is a workaround for a bug in chrome and others:
                //when triple-clicking a line (eg. a <h1>, the entire line gets selected,
                //but secretly, the beginning of the next line as well. If you paste something,
                //the text is placed on the next line, but the first empty <h1> is kept around
                //for unknown reasons.
                //Our solution is to ask for all the nodes that are selected before executing
                //the deleteContents() and iterating them afterwards, deleting all the nodes
                //that still exist and are empty
                //Update: we don't do this anymore because we wipe _all_ empty tags, see below
                //var nodes = range.getNodes();

                //first the first parent element around the selection
                //If it's a block element and the pasted code is also
                //wrapped by a block element, we'll need to strip
                //the blocks from the pasted html because otherwise
                //it's eg. possible to paste a <p> inside a <h1> and
                //we don't want that
                var parentNode = range.commonAncestorContainer;
                var parentEl = parentNode;
                while (parentEl.nodeName.indexOf('#') != -1) {
                    parentEl = parentEl.parentNode;
                }

                var parent = $(parentEl);
                if (Commons.isBlockElement(parent)) {
                    //note that if we just created a new paragraph where the new text
                    //needs to be placed, we'll be in a <p><br></p> parent.
                    //So let's skip the cleaning because it's sort of the whole
                    //point of allowing to paste formatted code in a new paragraph.
                    if (parent.text() != '') {
                        //these are all top-level children
                        var children = htmlContainer.children();
                        children.each(function (index)
                        {
                            var child = $(this);
                            while (child.length > 0 && Commons.isBlockElement(child)) {
                                var childInner = child.html();
                                child.replaceWith(childInner);
                                child = childInner;
                            }
                        });
                    }
                }

                //Now do the real pasting of the new cleaned html
                //but note that non-builtin pasting doesn't have undo...
                var USE_BUILTIN_PASTING = true;
                if (USE_BUILTIN_PASTING) {

                    MediumEditorExtensions.PasteHandlerExt.Super.prototype.pasteHTML.call(this, htmlContainer.html(),
                        // we make this empty because the whole point is we did this part outself
                        {
                            cleanAttrs: [],
                            cleanTags: [],
                            unwrapTags: []
                        }
                    );
                    //this is the naked version of the command above if we'd ever need it
                    //MediumEditor.util.insertHTMLCommand(this.document, htmlContainer[0].innerHTML.replace(/&nbsp;/g, ' '));

                    var DO_EXTRA_CLEANUP = true;

                    if (DO_EXTRA_CLEANUP) {

                        //note we work on a clone to skip the code below if not needed
                        var filteredParent = this._filterElementsRecursively(parent.clone());

                        //note: this is the part that messes up the undo/redo,
                        //so don't do it if it's not needed
                        if (filteredParent && filteredParent.html() != parent.html()) {

                            //needed to keep selection after cleanup below
                            this.base.saveSelection();

                            //The builtin 'insertHTML' command introduces too many own styling
                            // (like automatically inserting span styles with 'font-style: normal' when they come after a <a> in a <h1>)
                            //so we'll need to re-clean it! Only problem is that if we undo this and redo it afterwards, it will
                            //redo with the unprocessed html but we can live with that
                            parent.replaceWith(filteredParent);

                            this.base.restoreSelection();
                        }
                    }
                }
                //use Rangy pasting instead: note that we lose undo/redo functionality
                else {
                    range.pasteHtml(htmlContainer.html());
                }

                //Update: see above why this is commented
                // //see comments above, this is the second part
                // for (var i = 0; i < nodes.length; i++) {
                //     var n = nodes[i];
                //     if (n && n.tagName) {
                //         var nEl = $(n);
                //         if (nEl.is(':empty')) {
                //             nEl.remove();
                //         }
                //     }
                // }

                //some aftermath cleanup
                //we get in trouble when empty tags get pasted because they're
                //not always selectable (and thus undeletable), so we get rid of them
                //Note that this won't delete tags with text nodes, which is okay
                parent.find(':empty').remove();
            }

            //note: as for undo/redo history, see this for more info:
            //https://stackoverflow.com/questions/28217539/allowing-contenteditable-to-undo-after-dom-modification
            //For now, we can't undo after pasting :-(
            //TODO see https://addyosmani.com/blog/mutation-observers/
        }

        //do we need this? Don't think so, it's handled in the updatePlaceholder() of admin.js now
        // // https://github.com/yabwe/medium-editor/issues/992
        // // If we're monitoring calls to execCommand, notify listeners as if a real call had happened
        // if (this.document.execCommand.callListeners) {
        //     this.document.execCommand.callListeners(['insertHTML', false, html], retVal);
        // }
    });

}]);
