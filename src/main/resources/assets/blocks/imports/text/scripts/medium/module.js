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
base.plugin("blocks.core.MediumEditor", ["blocks.core.MediumEditorExtensions", function (Extensions)
{
    var MediumModule = this;

    var mediumEditor = null;

    //If you change these, make sure to review the acceptedPastedStyles below!
    var toolbarButtons = [Extensions.StylesPicker.NAME, 'bold', 'italic', 'underline', 'strikethrough', 'superscript', Extensions.LinkInput.NAME, 'orderedlist', 'unorderedlist', 'justifyLeft', 'justifyCenter', 'justifyRight', 'removeFormat'];
    var toolbarButtonsInline = ['bold', 'italic', 'underline', 'superscript', Extensions.LinkInput.NAME, 'justifyLeft', 'justifyCenter', 'justifyRight', 'removeFormat'];

    var stylePickerStyles = [];
    var toolbarOptions = {};

    this.getToolbarElement = function ()
    {
        var retVal = null;
        if (mediumEditor != null) {
            var toolbarExt = mediumEditor.getExtensionByName("toolbar");
            if (toolbarExt) {
                retVal = toolbarExt.getToolbarElement();
            }
        }
        return retVal;
    };

    this.getEditor = function (element, inline, hideToolbar)
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
        var acceptedPastedStyles = {
            '*': {
                'style': [
                    'text-align: left',
                    'text-align: center',
                    'text-align: right',
                ]
            },
            'p': {
                //no special attributes allowed
            },
            'span': {
                'style': [
                    //this undos the <b> tag in case a parent has already made it bold
                    'font-weight: normal',
                    //same for <i>
                    'font-style: normal',
                    //same for <u>
                    'text-decoration: none',
                ]
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
                'href': '*',
                'target': '_blank',
                //these get set by the Medium Editor anchor extension (the parent of our link-input)
                'rel': 'noopener noreferrer'
            },
            'ol': {
                //no special attributes allowed
            },
            'ul': {
                //no special attributes allowed
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
                        if (!(tag in acceptedPastedStyles)) {
                            acceptedPastedStyles[tag] = {};
                        }

                        //if we have a class value, we need to add it as well
                        if (clazz) {
                            var tagRef = acceptedPastedStyles[tag];
                            //watch out: don't overwrite possible existing values
                            if ('class' in tagRef) {
                                //convert to an array if not yet the case
                                if (!$.isArray(tagRef['class'])) {
                                    tagRef['class'] = [tagRef['class']];
                                }
                                tagRef['class'].push(clazz);
                            }
                            else {
                                //we can add the simple string, no array needed
                                tagRef['class'] = clazz;
                            }
                        }
                    }
                }
            }
        }

        var pasteOptions = {
            //note: default is the force plain text (true)
            forcePlainText: false,

            //we need to activate this to activate our custom paste plugin in extensions.js
            cleanPastedHTML: true,
            //these indicate no more cleaning is to be done by the internal html cleaning
            cleanReplacements: [],
            cleanAttrs: [],
            cleanTags: [],
            unwrapTags: [],

            //custom object, see extension.js
            acceptedStyles: acceptedPastedStyles
        };
        options.paste = pasteOptions;

        //overwrite the default paste extension with our custom overloaded version (see extensions.js)
        MediumEditor.extensions.paste = Extensions.PasteHandlerExt;

        //install our own link form extension
        options.extensions[Extensions.LinkInput.NAME] = new Extensions.LinkInput({});

        if (!hideToolbar) {
            var toolbarOptions = {};

            //enable the toolbar always displaying in the same location relative to the medium-editor element.
            toolbarOptions.static = true;
            //this enables updating the state of the toolbar buttons even when the selection is collapsed (there is no selection, just a cursor)
            toolbarOptions.updateOnEmptySelection = true;
            if (!inline) {
                toolbarOptions.buttons = toolbarButtons;
            } else {
                toolbarOptions.buttons = toolbarButtonsInline;
            }
            toolbarOptions.align = 'left';

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

    this.removeEditor = function (element)
    {
        if (mediumEditor != null) {
            mediumEditor.destroy();
        }
        mediumEditor = null;
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
