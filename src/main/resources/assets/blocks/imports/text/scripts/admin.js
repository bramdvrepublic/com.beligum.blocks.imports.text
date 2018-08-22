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

base.plugin("blocks.imports.Text", ["base.core.Class", "blocks.imports.Property", "blocks.core.Sidebar", "blocks.core.MediumEditor", "constants.blocks.core", "constants.blocks.imports.text", "messages.blocks.imports.text", function (Class, Property, Sidebar, Editor, BlocksConstants, TextConstants, TextMessages)
{
    var Text = this;
    this.TAGS = ["blocks-text div", "blocks-text span"];

    //inherit from property (otherwise it'll create an extra box in the sidebar)
    (this.Class = Class.create(Property.Class, {

        //-----VARIABLES-----

        //-----CONSTRUCTORS-----
        constructor: function ()
        {
            Text.Class.Super.call(this);
        },

        //-----IMPLEMENTED METHODS-----
        init: function ()
        {
        },
        focus: function (block, element, hotspot, event)
        {
            Text.Class.Super.prototype.focus.call(this, block, element, hotspot, event);

            // Preparation
            element.attr("contenteditable", true);

            var inlineEditor = element.prop('tagName') == 'SPAN';

            // This is a bit tricky and needs more info:
            // when implementing the data-editor-options feature, it was meanly meant to put on random elements (eg. div and span)
            // that we could then "activate" by attaching the inline editor to (eg. see the blocks-imports-carousel project).
            // We could then easily put some attributes on those elements to control what kind of editor was instantiated.
            // But, it also makes sense (and feels natural) to put those options directly on <blocks-text> elements,
            // and expect them to instantiate a correct editor, based on those options.
            // However, the "element" object here ('here', meaning in a standard blocks-text object) is not the <blocks-text>
            // element, but it's child property-container element <div property="text">.
            // So if we want to be able to serve both uses (using this code attached to a blocks-text and to a regular div),
            // we'll have to implement a little workaround to check if the parent is a blocks-text and also incorporate
            // the option-attributes on that element.
            // Of course, as usual, the more down the DOM, the more important, so we allow for option-overriding of parent-element options.

            var elements = [];

            //if the parent is a blocks-text, append it to the list of elements to be inspected for options
            var parent = element.parent();
            if (parent && parent.prop('tagName') == 'BLOCKS-TEXT') {
                elements.push(parent);
            }

            //lastly, add the most important element, the 'legacy' one (the one that can override all previous)
            elements.push(element);

            for (var i=0;i<elements.length;i++) {
                var e = elements[i];

                //this allows us to set some specific additional options to the elements to control how the editor behaves
                var options = {};
                var optionsAttr = e.attr(TextConstants.OPTIONS_ATTR);
                if (optionsAttr) {
                    //this converts and array to an object
                    var optionsAttrValues = optionsAttr.split(" ");
                    for (var i = 0; i < optionsAttrValues.length; i++) {
                        var option = optionsAttrValues[i];
                        //special flag to force the inline editor, no matter the tag
                        if (option == TextConstants.OPTIONS_FORCE_INLINE) {
                            inlineEditor = true;
                        }
                        else {
                            //for now, we don't have values, so just set to true
                            //note that code (eg the constuctor in mediumModule.js) depends on this to be true
                            options[option] = true;
                        }
                    }
                }
            }

            var editor = Editor.getEditor(element, inlineEditor, options[TextConstants.OPTIONS_NO_TOOLBAR]);

            editor.subscribe('editableInput', function (event, editorElement) {
                Logger.info(event);
            });

            this._setCursor(hotspot.left, hotspot.top);

            // Add toolbar to sidebar
            var toolbar = $(Editor.getToolbarElement());
            if (toolbar) {
                toolbar.addClass(BlocksConstants.PREVENT_BLUR_CLASS);
                //make sure, if we click the toolbar, the block-window doesn't pop up
                toolbar.attr(BlocksConstants.CLICK_ROLE_ATTR, BlocksConstants.FORCE_CLICK_ATTR_VALUE);
            }
        },
        blur: function (block, element)
        {
            Text.Class.Super.prototype.blur.call(this, block, element);

            Logger.info("BLUR: '"+element.text()+"'");
            if ($.trim(element.text())=='') {
                Logger.info("EMPTY");
            }

            Editor.removeEditor(element);
            element.removeAttr("contenteditable");
        },
        getConfigs: function (block, element)
        {
            return Text.Class.Super.prototype.getConfigs.call(this, block, element);
        },
        getWindowName: function ()
        {
            return TextMessages.widgetTitle;
        },

        //-----PRIVATE METHODS-----
        /*
         * Puts the cursor for given coordinates
         * */
        _setCursor: function (x, y)
        {
            var caretPosition = this._getRangeFromPosition(x, y);
            if (caretPosition != null) {
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(caretPosition);
            }
        },
        _getRangeFromPosition: function (x, y)
        {
            var range = null;
            if (document.caretPositionFromPoint) {
                var pos = document.caretPositionFromPoint(x, y);
                range = document.createRange();
//            range.selectNodeContents(pos.offsetNode);
                range.setStart(pos.offsetNode, pos.offset);
//            range.setEnd(pos.offsetNode, pos.offset);

            } else if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(x, y);
            } else {
                Logger.debug("Field editing is not supported ...");
            }

            return range;
        },

    })).register(this.TAGS);

}]);