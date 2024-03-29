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
 * Created by wouter on 12/06/15.
 */
base.plugin("blocks.core.MediumEditor", ["base.core.Commons", "constants.blocks.core", "blocks.core.MediumEditorExtensions", function (Commons, BlocksConstants, Extensions)
{
    var MediumModule = this;

    var mediumEditor = null;

    //If you change these, make sure to review the acceptedRules below!
    var toolbarButtons = [Extensions.StylesPicker.NAME, 'bold', 'italic', 'underline', /*'strikethrough',*/ 'superscript', Extensions.LinkInput.NAME, 'orderedlist', 'unorderedlist', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'removeFormat'];
    var toolbarButtonsInline = ['bold', 'italic', 'underline', 'superscript', Extensions.LinkInput.NAME, 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'removeFormat'];

    var stylePickerStyles = [];
    var toolbarOptions = {};

    this.getEditor = function (container, element, inline, hideToolbar, enablePasteHtml)
    {
        if (mediumEditor != null) {
            MediumModule.removeEditor();
        }

        var options = {
            buttonLabels: 'fontawesome',
            extensions: {}
        };

        // The idea here is to build a 'whitelist' of tags/attributes/values we'll
        // allow to be pasted-in. It will be passed to the paste extension below.
        // These are the rules and the format of the data structure:
        // - the object consists of a collection of tag names that are allowed in the text
        // - all tags not in the object will be removed and replaced with their text() variant
        // - all tag names must be lowercase
        // - each tag name points to an object of attributes that are allowed for this tag
        // - each attribute has either a string or an array of strings as it's (allowed) value(s)
        // - there's a special '*' wildcard value that accepts any value for this attribute (it just needs to be present)
        // - the 'style' attribute is special, because it's value(s) are individual styles, not the entire attribute value (eg. 'display: block')
        // - the right hand side of the style attribute can also be the wildcard '*' to indicate any value for this style is allowed (eg. 'display: *')
        // - there's a special '*' wildcard tag name that points to attributes that are allowed for all tags

        //sync this with the list of toolbar buttons above
        var acceptedRules = {
            '*': {
                attrs: {
                    style: [
                        'text-align: left',
                        'text-align: center',
                        'text-align: right',
                    ]
                },
                children: {
                    'b': '*',
                    'i': '*',
                    'u': '*',
                    'sup': '*',
                    'strike': '*',
                    'a': '*',
                    'span': '*',
                }
            },
            'p': {
                //no special attributes allowed
            },
            'span': {
                attrs: {
                    style: [
                        //this undos the <b> tag in case a parent has already made it bold
                        'font-weight: normal',
                        //same for <i>
                        'font-style: normal',
                        //same for <u>
                        'text-decoration: none',
                    ]
                },
                children: {
                    'b': '*',
                    'i': '*',
                    'u': '*',
                    'sup': '*',
                    'strike': '*',
                    'a': '*',
                }
            },
            'b': {
                //no special attributes allowed
            },
            'i': {
                //no special attributes allowed
            },
            'u': {
                //no special attributes allowed
            },
            'sup': {
                //no special attributes allowed
            },
            'strike': {
                //no special attributes allowed
            },
            'a': {
                attrs: {
                    href: '*',
                    target: '_blank',
                    //these get set by the Medium Editor anchor extension (the parent of our link-input)
                    rel: 'noopener noreferrer'
                },
                children: {
                    'b': '*',
                    'i': '*',
                    'u': '*',
                    'sup': '*',
                    'strike': '*',
                }
            },
            'ol': {
                //no special attributes allowed
                children: {
                    'li': '*',
                }
            },
            'ul': {
                //no special attributes allowed
                children: {
                    'li': '*',
                }
            },
            'li': {
                //no special attributes allowed
            },
        };

        var stylePicker = null;
        if (stylePickerStyles && stylePickerStyles.length > 0) {
            stylePicker = new Extensions.StylesPicker({});
            stylePicker.setStyles(stylePickerStyles);

            //don't add the styles combobox if we don't have styles
            options.extensions[Extensions.StylesPicker.NAME] = stylePicker;

            for (var i = 0; i < stylePickerStyles.length; i++) {
                var val = stylePickerStyles[i];
                if (val.text != null && val.value != null && val.value.indexOf(':') >= 0) {
                    var config = val.value.split(':');
                    var tag = config[0].trim().toLowerCase();
                    var clazz = config[1].trim();

                    //we need at least that tag
                    if (tag) {
                        // Copy-pasted from the StylesPicker extension as ref:
                        //
                        // This will clear the existing classes, but leave the tag alone
                        //  {value: ":", text: Messages.p},
                        //
                        // This is generally the default case: a p without classes (eg. when hitting enter in editor)
                        //  {value: "p:", text: Messages.p},
                        //
                        // Will change the tag to <h1> and remove existing classes
                        //  {value: "h1:", text: Messages.h1},
                        //
                        // Will change the tag to <h1> clear existing classes and add the classes after the colon
                        //  {value: "h1:red", text: Messages.h1Red}
                        //

                        // add the tag if it's not already there
                        if (!acceptedRules[tag]) {
                            acceptedRules[tag] = {};
                        }

                        //if we have a class value, we need to add it as well
                        if (clazz) {
                            var tagRef = acceptedRules[tag];
                            //watch out: don't overwrite possible existing values
                            if (tagRef.attrs && tagRef.attrs['class']) {
                                //convert to an array if not yet the case
                                if (!$.isArray(tagRef.attrs['class'])) {
                                    tagRef.attrs['class'] = [ tagRef.attrs['class'] ];
                                }
                                tagRef.attrs['class'].push(clazz);
                            }
                            else {
                                if (!tagRef.attrs) {
                                    tagRef.attrs = {};
                                }
                                //we can add the simple string, no array needed
                                tagRef.attrs['class'] = clazz;
                            }
                        }
                    }
                }
            }
        }

        if (enablePasteHtml) {

            options.paste = {
                //note: default is the force plain text (true), explicitly change it
                forcePlainText: false,
                //we need to activate this to activate our custom paste plugin in extensions.js
                cleanPastedHTML: true,
                //these indicate no more cleaning is to be done by the internal html cleaning (we'll do all the cleaning)
                cleanReplacements: [],
                cleanAttrs: [],
                cleanTags: ['meta'],
                unwrapTags: [],

                //some custom objects, see extension.js
                acceptedRules: acceptedRules,
                inlineEditor: inline
            };

            //overwrite the default paste extension with our custom overloaded version (see extensions.js)
            MediumEditor.extensions.paste = Extensions.PasteHandlerExt;
        }
        else {
            options.paste = {
                //note: default is the force plain text (true)
                forcePlainText: true,
                cleanPastedHTML: false,
            };
        }

        //overwrite the removeFormat button because we want it to remove the formatting more agressively
        //note that all builtin buttons are represented by the same object and have 'action' properties
        //to distinguish between them, so we need to override that pase object and differentiate
        //in the handleClick() event handler
        MediumEditor.extensions.button = Extensions.ButtonExt;

        //overwrite the default toolbar extension with our custom overloaded version (see extensions.js)
        MediumEditor.extensions.toolbar = Extensions.ToolbarExt;

        //install our own link form extension
        options.extensions[Extensions.LinkInput.NAME] = new Extensions.LinkInput({});

        if (!hideToolbar) {
            var toolbarOptions = {

                // The set of buttons to display on the toolbar
                buttons: toolbarButtons,

                // Enable the toolbar always displaying in the same location relative to the medium-editor element.
                // Note: the big difference between a static toolbar and a regular one, is that in the medium editor
                // project, the toolbar is supposed to move along with the selection (and even be hidden when nothing
                // selected). A static toolbar is a toolbar that's positioned to a element, instead of the selection.
                static: true,

                // This enables/disables the toolbar "sticking" to the viewport and staying visible on the screen while the page scrolls.
                sticky: true,

                // Only when the static option is true, this enables updating the state of the toolbar buttons
                // even when the selection is collapsed (there is no selection, just a cursor)
                // Note that this is what activates the toolbar in the first place when a block is clicked,
                // because on initialization, we set the cursor (thus, an empty selection) where the user clicked and
                // because of this flag, the toolbar is activated.
                // Update: not true anymore: now we (also) do a focus() call
                updateOnEmptySelection: true,

                // Note: only when the static option is true
                align: 'left',
                // diffLeft: 100,
                // diffTop: 100,

                //some custom options for better toolbar positioning
                anchorElement: container[0],
            };

            if (inline) {
                toolbarOptions.buttons = toolbarButtonsInline;
            }

            options.toolbar = toolbarOptions;
        }
        else {
            options.toolbar = false;
            //hmmm, this doesn't seem to work very well...
            options.keyboardCommands = false;
        }

        options.disableReturn = inline;
        //we implemented our own to get around some limitations, see admin.js for details
        options.disablePlaceholders = true;

        mediumEditor = new MediumEditor(element[0], options);

        return mediumEditor;
    };

    this.getActiveEditor = function ()
    {
        return mediumEditor;
    };

    this.removeEditor = function (element)
    {
        if (mediumEditor != null) {
            mediumEditor.destroy();
        }
        mediumEditor = null;

        // Note: this is basically the same code as in mediumEditor.destroy(),
        // but forces the cleanup of the element without the editor being active
        if (element) {

            element.removeAttr('contentEditable');
            element.removeAttr('spellcheck');
            element.removeAttr('role');
            element.removeAttr('aria-multiline');
            element.removeAttr('data-placeholder');

            //first copy the attributes to remove if we don't do this it causes problems
            //iterating over the array we're removing elements from
            var attributes = $.map(element[0].attributes, function (item)
            {
                return item.name;
            });
            // now remove the attributes
            $.each(attributes, function (i, attr)
            {
                if (attr.indexOf('medium-editor') >= 0 || attr.indexOf('data-medium') >= 0) {
                    element.removeAttr(attr);
                }
            });

            // remove all classes that start with 'medium-editor'
            element.removeClass (function (index, className) {
                return (className.match (/(^|\s)medium-editor\S+/g) || []).join(' ');
            });
            Commons.removeEmptyAttr(element, 'class');
        }
    };

    this.getActiveToolbar = function ()
    {
        var retVal = null;

        if (mediumEditor != null) {
            retVal = mediumEditor.getExtensionByName("toolbar");
        }

        return retVal;
    };

    this.getToolbarElement = function ()
    {
        var retVal = null;

        var toolbar = this.getActiveToolbar();
        if (toolbar) {
            retVal = toolbar.getToolbarElement();
        }

        return retVal;
    };

    /**
     * Selects all text of the currently active and focused editor.
     * This is an alternative for this.getActiveEditor().selectAllContents()
     * because that doesn't seem to always work as expected.
     */
    this.selectAllContents = function ()
    {
        var editor = this.getActiveEditor();

        if (editor) {
            var element = editor.getFocusedElement();

            if (element) {
                // See https://stackoverflow.com/questions/3805852/select-all-text-in-contenteditable-div-when-it-focus-click
                var sel, range;
                if (window.getSelection && document.createRange) {
                    range = document.createRange();
                    range.selectNodeContents(element);
                    sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                else if (document.body.createTextRange) {
                    range = document.body.createTextRange();
                    range.moveToElementText(element);
                    range.select();
                }
            }
        }
    };

    this.setToolbarButtons = function (buttonArray)
    {
        toolbarOptions = buttonArray;
    };

    this.setStylePickerStyles = function (newStyles)
    {
        stylePickerStyles = newStyles;
    };

}]);
