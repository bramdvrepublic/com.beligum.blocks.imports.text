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

base.plugin("blocks.core.MediumEditorExtensions", ["base.core.Class", "blocks.core.Broadcaster", "blocks.core.Notification", "blocks.imports.Widget", "blocks.core.Sidebar", "base.core.Commons", "constants.blocks.core", "messages.blocks.core", "constants.blocks.imports.text", "messages.blocks.imports.text", function (Class, Broadcaster, Notification, Widget, Sidebar, Commons, BlocksConstants, BlocksMessages, TextConstants, TextMessages)
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
    /**
     * Extension to show a dropdown to select a paragraph style in the toolbar.
     * Used this as a reference: https://github.com/arcs-/MediumButton
     */
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

            //make sure all clicks on the elements in this form are permitted
            button.attr(BlocksConstants.CLICK_ROLE_ATTR, BlocksConstants.FORCE_CLICK_ATTR_VALUE);

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

                        //the elements contain a reference to our allTags structure, see _findSelectedElements()
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
                        this._onSelect(event, event.data);

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
        _onSelect: function (event, configValue)
        {
            this.base.saveSelection();

            var arguments = configValue.split(':');
            var tag = arguments[0].trim().toLowerCase();
            var clazz = arguments.length > 0 ? arguments[1].trim() : '';

            //we skip filtering to be able to 'reset' tags and/or classes that we set in the past,
            // but we want to clean up now
            var selectedElements = this._findSelectedElements(true);

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

            // When we alter the style of a paragraph, 99% of the time, the height of the block
            // will change, but not the entire page (eg. if the column is not completely filled),
            // so by forcing an update, we keep a good user experience
            this.base.checkContentChanged();
        },
        _findSelectedElements: function (skipFiltering)
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

                if (skipFiltering) {
                    retVal.push({
                        element: el,
                        nodeName: elTag,
                        ref: undefined
                    });
                }
                else {

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
            }

            return retVal;
        }
    });

    /**
     * An extension to show an editable hyperlink form when an active link is clicked.
     */
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
        // Called when the button in the toolbar is clicked
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

            // the size of the block may have changed, force an update
            this.base.checkContentChanged();
        },

        showForm: function (opts)
        {
            //don't let the toggle changes get animated, it's weird when showing the panel for the first time
            this.setAnchorTargetAnimation(false);

            MediumEditorExtensions.LinkInput.Super.prototype.showForm.call(this, opts);

            //make sure all clicks on the elements in this form are permitted
            $(this.getForm()).attr(BlocksConstants.CLICK_ROLE_ATTR, BlocksConstants.FORCE_CLICK_ATTR_VALUE);

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

        //-----PRIVATE FUNCTIONS-----
    });

    /**
     * We overload the button extensions to overwrite the removeFormat button
     * because we want it to remove the formatting more agressively.
     * Note that all builtin buttons are represented by the same object and have 'action' properties
     * to distinguish between them, so we need to override that pase object and differentiate
     * in the handleClick() event handler
     */
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

                    //if the common parent element is the editor element, handle it differently
                    if (elNode != this.base.elements[0]) {
                        //detect inline mode and add a <p> to the text if we're
                        //dealing with full-html editing
                        if (this.base.options.disableReturn) {
                            el.replaceWith(el.text());
                        }
                        else {
                            el.replaceWith($('<p/>').html(el.text()));
                        }
                    }
                    else {
                        if (this.base.options.disableReturn) {
                            el.html(el.text());
                        }
                        else {
                            el.html('<p>' + el.text() + '</p>');
                        }
                    }

                    //this is a chance to delete left-over (and undeletable) empty tags
                    // that are messing up the formatting
                    el.find(':empty').remove();
                }
            }
            else {
                MediumEditorExtensions.ButtonExt.Super.prototype.handleClick.call(this, event);
            }

            // the size of the block may have changed, force an update
            this.base.checkContentChanged();
        },
    });

    /**
     * We're overloading the paste handler to be able to control text pasting
     * a lot more intimately.
     */
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

            this.acceptedRules = options.acceptedRules;
            this.inlineEditor = options.inlineEditor;

            //we'll iterate over the values and make everything an array to smooth processing later on
            //also, we'll link the general styles into the specific styles so we don't have to differentiate
            var generalRules = this.acceptedRules['*'];
            var generalAttrs = generalRules ? generalRules.attrs : null;
            var generalChildren = generalRules ? generalRules.children : null;
            //note: we always need at least a <p>, because it
            //represents the replacement containers for block text
            //so we add it if it's not there
            var hasPAttrs = false;
            var _this = this;
            $.each(this.acceptedRules, function (tagName, rules)
            {
                //uniformize
                var tagNameLower = tagName.toLowerCase();

                var acceptedAttrs = rules.attrs;
                if (acceptedAttrs) {
                    $.each(acceptedAttrs, function (attrName, attrValues)
                    {
                        //if we're dealing with an inline editor,
                        //we need to remove all blocks or we'll end up with invalid states
                        if (options.inlineEditor && Commons.isBlockElement(tagNameLower)) {
                            delete _this.acceptedRules[tagName].attrs;
                        }
                        else {

                            if (!hasPAttrs && tagNameLower == 'p') {
                                hasPAttrs = true;
                            }

                            //uniformize: convert all values to an array
                            if (!$.isArray(attrValues)) {
                                attrValues = [attrValues];
                            }

                            if (tagNameLower !== '*' && generalAttrs) {
                                $.each(generalAttrs, function (generalStyleAttr, generalValue)
                                {
                                    if (generalStyleAttr in attrValues) {
                                        //append the general array to the existing array
                                        //note that this might possibly double allowed values,
                                        //but that's not such a big deal, right?
                                        for (var i = 0; i < generalValue.length; i++) {
                                            attrValues[generalStyleAttr].push(generalValue[i]);
                                        }
                                    }
                                    else {
                                        attrValues[generalStyleAttr] = generalValue;
                                    }
                                });
                            }

                            //we might have tampered with it
                            _this.acceptedRules[tagName].attrs[attrName] = attrValues;
                        }
                    });
                }

                var acceptedChildren = rules.children;
                if (tagNameLower != '*' && generalChildren && !acceptedChildren) {
                    rules.children = generalChildren;
                }

            });

            if (!hasPAttrs && !options.inlineEditor) {
                this.acceptedRules['p'] = {
                    attrs: generalAttrs,
                    children: generalChildren
                };
            }
        },

        //-----OVERLOADED FUNCTIONS-----
        pasteHTML: function (html, options)
        {
            var _this = this;

            var editor = this.base.elements[0];
            var editorEl = $(editor);

            // var parentBlock = editorEl.parents().filter(function(index, element) {
            //     return element.nodeType == Node.ELEMENT_NODE && element.nodeName.indexOf('-') !== -1;
            // }).first();

            var startHtml = editorEl.html();

            var selectedHtml = MediumEditor.selection.getSelectionHtml(this.document);
            var allSelected = selectedHtml.trim() == editorEl.html().trim();

            var selection = this.document.getSelection();
            var hasSelection = !selection.isCollapsed;

            // This is a handy extra pre-clean to get around the wrapping-first-tag problem
            // When selecting everything (eg. this: <h1>title</h1><p>text</p>) and pasting,
            // the pasted html will end up in the first tag, wrapping everything in a <h1>.
            // It's annoying when selecting all because it's counter-intuitive.
            if (allSelected) {
                //Update: don't do this, because it basically does the same (keeps the <h1>)
                // if (this.document.queryCommandSupported('delete')) {
                //     this.document.execCommand('delete', false, null);
                // }
                // else {
                this.base.setContent('<p><br></p>');
                // }
            }
            else {

                //if we have nothing selected (the cursor is just placed somewhere),
                //this would stop the paste from happening, so avoid that
                if (hasSelection) {

                    //this helps a lot in removing any whitespace from the start and end of the selection
                    //and especially when using a triple-click on full paragraphs (which also selects the newline
                    // up until just before the next tag). But note that this will
                    //also trim the spaces from an eg. regular text section, yielding in a result where
                    //the selected space will be unselected before the paste is done, which feels unnatural.
                    //But for now, the benefits of the first case are more important.
                    //Update: we modified this to trimEnd() (instead of just trim()) and introduced a check
                    //for a text node at the end of the selection, resulting is more natural behavior for the
                    //case described above.
                    if (selection.focusNode && selection.focusNode.nodeType == 1 && selection.focusOffset == 0) {

                        //the idea here is to create a list of selected nodes we can iterate (backwards)
                        //to find the focusNode in that list
                        var range = selection.getRangeAt(0);
                        var selectionParentEl = $(range.commonAncestorContainer);
                        var selectionParentChildren = selectionParentEl.contents();
                        var focusNodeIdx = -1;
                        for (var i = selectionParentChildren.length; i >= 0; i--) {
                            var child = selectionParentChildren[i];
                            if (child == selection.focusNode) {
                                focusNodeIdx = i;
                                break;
                            }
                        }

                        //if we found the node (this should always happen),
                        //try to skim off as much blank nodes as possible (the spaces+newline nodes)
                        //and stop if we find a non-empty one
                        if (focusNodeIdx > 0) {
                            var newFocusNode = selectionParentChildren[focusNodeIdx];
                            for (var i = focusNodeIdx - 1; i >= 0; i--) {
                                var node = selectionParentChildren[i];
                                if (node.textContent.trim() != '') {
                                    newFocusNode = node;
                                    break;
                                }
                            }

                            //range.setEnd() doesn't accept tags, it needs text nodes
                            if (newFocusNode.nodeType == 1) {
                                newFocusNode = newFocusNode.lastChild;
                            }

                            //only if we have a new focus that's a text node,
                            //set the new focus
                            if (newFocusNode && newFocusNode.nodeType == 3) {
                                //I guess these two do the same thing
                                range.setEnd(newFocusNode, newFocusNode.textContent.length);
                                //selection.extend(newFocusNode, newFocusNode.textContent.length);
                            }
                        }
                    }
                }


            }

            //TODO restore selection; doesn't work yet, we'll have to implement our own undo/redo
            //this.base.saveSelection();

            //two options
            var USE_DIRECT_PASTING = false;
            if (USE_DIRECT_PASTING) {
                MediumEditor.util.insertHTMLCommand(this.document, html.replace(/&nbsp;/g, ' '));
            }
            else {
                MediumEditorExtensions.PasteHandlerExt.Super.prototype.pasteHTML.call(this, html, options);
            }

            //when all is pasted (note that the browser sometimes adds extra arguments, even when
            // the supplied html is cleaned up), we filter the entire editor to make sure it's all cleaned
            var filteredHtmlContainer = this._filterHtml(editorEl.html());
            var filteredHtml = filteredHtmlContainer.html();
            this.base.setContent(filteredHtml);

            //this.base.restoreSelection();

            // the size of the block may have changed, force an update
            this.base.checkContentChanged();
        },
        _filterHtml: function (html)
        {
            //note: parseHTML() returns an array of (raw) dom nodes
            var retVal = $('<div/>');

            //var domTags = $.parseHTML('Dit is een test <h1>Met een hoofd</h1> <p> en <b>een</b> paragraaf</p>');
            var domTags = $.parseHTML(html);
            if (domTags) {
                for (var i = 0; i < domTags.length; i++) {
                    var node = domTags[i];

                    var filteredNode = this._filterElementsRecursively($(node));
                    if (filteredNode) {
                        retVal.append(filteredNode);
                    }
                }
            }

            return retVal;
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
            var nodeName = el[0].nodeName.toLowerCase();
            var isTextNode = nodeName.indexOf('#') === 0;
            if (isTextNode || el.html().trim() !== '') {

                var isAllowedInParent = true;
                var parentRules = null;
                if (!isTextNode) {
                    var parent = el.parent();
                    //if we don't have a parent or the parent is the editor, it's always okay
                    if (parent.length > 0 && parent[0] != this.base.elements[0]) {
                        parentRules = this.acceptedRules[parent[0].nodeName.toLowerCase()];
                        if (parentRules && parentRules.children) {
                            if (!parentRules.children[nodeName]) {
                                isAllowedInParent = false;
                            }
                        }
                        //if we have a parent and there are no rules, it's not allowed
                        else {
                            isAllowedInParent = false;
                        }
                    }
                }

                //note: compared to tagName, nodeName also returns something for eg #text, #comment, etc.
                //note that this means free-standing text (not surrounded by an element), will be removed
                //if nothing is set in the rules for the tag '#text'
                //Also note that all node names in the style rules must be lowercase
                var tagRules = this.acceptedRules[nodeName];

                //if we find rules for this tag, this means it's allowed,
                //we just need to filter it's attributes
                if (isAllowedInParent && tagRules) {
                    this._filterAttributes(el, tagRules.attrs);
                    retVal = el;
                }
                //if this tag is not allowed, we textify it, trying to preserve 'blocks'
                else {
                    retVal = this._textify(el, isTextNode, parentRules);
                }
            }

            if (retVal) {
                retVal = this._cleanup(retVal);
            }

            return retVal;
        },
        _filterAttributes: function (el, allowedAttrs)
        {
            if (allowedAttrs) {

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

                    var attrRules = allowedAttrs[attrName];
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
        _textify: function (el, isTextNode, parentRules)
        {
            var retVal = null;

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

                var isPAllowedInParent = true;
                if (parentRules && parentRules.children) {
                    if (!parentRules.children['p']) {
                        isPAllowedInParent = false;
                    }
                }
                //if we have a parent and there are no rules, it's not allowed
                else {
                    isPAllowedInParent = false;
                }

                if (isPAllowedInParent) {
                    //from the text(string) docs:
                    // We need to be aware that this method escapes the string provided as necessary so that it will render correctly in HTML.
                    retVal = $('<p/>').text(textContent);
                }
                else {
                    retVal = textContent;
                }
            }

            return retVal;
        },
        _cleanup: function (node)
        {
            if (node) {
                //these are two cleaning methods we took over from the parent method
                //(to be found with: MediumEditorExtensions.PasteHandlerExt.Super.prototype.pasteHTML.call(this, container.html(), options);)
                if (typeof node === 'string' || node instanceof String) {
                    //no need to cleanup spans when we're a string
                    node = node.replace(/&nbsp;/g, ' ');
                }
                //when it's not a string, it's a jquery element
                else {

                    //this will probably be just one
                    for (var i = 0; i < node.length; i++) {
                        if (node[i]) {
                            this.cleanupSpans(node[i]);
                        }
                    }

                    //here, we take the time to delete empty tags;
                    //meaning tags with nothing or only blank as content
                    var newHtml = node.html().replace(/&nbsp;/g, ' ');
                    if (newHtml.trim() == '') {
                        node = null;
                    }
                    else {
                        node.html();
                    }
                }
            }

            return node;
        },
    });

    /**
     * We're overloading the toolbar to be able to better control its placement
     */
    this.ToolbarExt = Class.create(MediumEditor.extensions.toolbar, {

        //-----CONSTANTS-----
        STATIC: {
            NAME: "toolbar-ext"
        },

        //-----VARIABLES-----
        anchorElement: undefined,
        borderWidth: undefined,

        //-----CONSTRUCTORS-----
        constructor: function (options)
        {
            MediumEditorExtensions.ToolbarExt.Super.call(this, options);

            //this is a custom element that's passed in to have more freedom regarding the positioning
            //note: this is not a jQuery element, just a regular DOM element, so we'll parse it
            this.anchorElement = $(options.anchorElement);

            //if we put a border around the focused element, it looks nicer to align the toolbar with
            //the bottom of that border instead of the top
            this.borderWidth = parseInt(BlocksConstants.FOCUSED_BLOCK_BORDER_PX);
        },

        //-----OVERLOADED FUNCTIONS-----
        /**
         * This method gets called when a static toolbar needs to be (re)positioned.
         * If it's also a sticky toolbar, it gets called on window scroll as well.
         */
        positionStaticToolbar: function (container)
        {
            MediumEditorExtensions.ToolbarExt.Super.prototype.positionStaticToolbar.call(this, container);

            if (this.anchorElement) {

                //when the toolbar is created and there's a difference between the anchor
                //and the editor element, make sure to align the two
                var toolbarElement = $(this.getToolbarElement());

                var anchorPos = this.anchorElement.offset();
                var anchorHeight = this.anchorElement.outerHeight(true);

                var containerTop = anchorPos.top;
                var toolbarHeight = toolbarElement.outerHeight();

                //default behavior is to just position the toolbar at the top left of the anchor
                var top = containerTop - toolbarHeight;
                var left = anchorPos.left;

                // Note that this code is basically the same (jQuery-fied and anchor-fied) version of
                // the superclass; it doesn't do anything else, so make sure it's synchronized.
                var stickyTop = false;
                if (this.sticky) {

                    // copy/pasted from the superclass, beware of changes!
                    var scrollTop = (this.document.documentElement && this.document.documentElement.scrollTop) || this.document.body.scrollTop;

                    // the toolbar is above the scroll top (and therefore partly hidden), but we've also scrolled
                    // past the container (actually not completely past, but the slice of container that's still
                    // showing is not enough to fit the toolbar)
                    if (scrollTop > (containerTop + anchorHeight - toolbarHeight - this.stickyTopOffset)) {
                        toolbarElement.removeClass('medium-editor-sticky-toolbar');
                        //align the toolbar with the bottom of the container
                        top = containerTop + anchorHeight - toolbarHeight;
                        stickyTop = true;
                    }
                    // the toolbar is above the scroll top (and therefore partly hidden), but the container
                    // is still (partly) visible: just position it at the top of the page so it 'scrolls along'
                    else if (scrollTop > (containerTop - toolbarHeight - this.stickyTopOffset)) {
                        toolbarElement.addClass('medium-editor-sticky-toolbar');
                        top = this.stickyTopOffset;
                        stickyTop = true;
                    }
                    // normal behavior: make sure to reset the classes we could have set above
                    else {
                        toolbarElement.removeClass('medium-editor-sticky-toolbar');
                    }
                }

                //don't allow a pixel gap between the toolbar and the top of the page
                if (!stickyTop) {
                    //strange but true: we don't need to substract if from the left value
                    top += this.borderWidth;
                }

                //overwrite the top and left with our adjusted values
                toolbarElement.css('top', top + 'px');
                toolbarElement.css('left', left + 'px');
            }
        },
        /**
         * We deliberately override this method to disable hiding the toolbar at the source
         * (eg. instead of overloading the css rules); instead, we want the toolbar to be visible at all times
         * so it's not hidden eg. when a dialog box pops up.
         */
        hideToolbar: function ()
        {
            //NOOP
        }

    });

}]);
