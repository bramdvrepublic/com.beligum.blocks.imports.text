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

base.plugin("blocks.imports.Text", ["base.core.Class", "base.core.Commons", "blocks.imports.Property", "blocks.core.Sidebar", "blocks.core.MediumEditor", "constants.blocks.imports.commons", "constants.blocks.core", "constants.blocks.imports.text", "messages.blocks.imports.text", function (Class, Commons, Property, Sidebar, Editor, ImportsConstants, BlocksConstants, TextConstants, TextMessages)
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

            var inlineEditor = Commons.isInlineElement(element);

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

            for (var i = 0; i < elements.length; i++) {
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

            // Instead of relying on the standard placeholder functionality, we decided to implement our own:
            // The main problem is that Medium Editor activates the class medium-editor-placeholder on the editor element
            // when it decides the element is empty. In reality, it has a '<p><br><p>' content (or eg. a '<h1><br></h2>', depending
            // on how it was emptied) for a <div> and is only empty for a <span>, and we don't have any means to detect this is css (the <div> case).
            //
            // Note that this is default behavior and is controlled by the browser, not Medium Editor: the browser adds the <br>,
            // Medium adds the <p> around it (as it uses the <p> tag as the last-man-standing tag for content).
            // These are good reads too:
            // https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Editable_content
            // https://stackoverflow.com/questions/14638887/br-is-inserted-into-contenteditable-html-element-if-left-empty
            //
            // Actually we _can_ detect (and put the placeholder) it, eg. with:
            // blocks-text div p:only-child br:only-child:before {
            //   content: attr(data-placeholder) !important;
            //   display: block !important;
            // }
            // But because of that last <br> (and because it's a <br>), this doesn't work because <br> doesn't like to be styled.
            // Also, there doesn't seem to be an :empty pseudo-selector (although mozilla want it https://developer.mozilla.org/en-US/docs/Web/CSS/:empty)
            //
            // Also note that removing the <br> using js is not a good idea, because it causes text to go before the empty element
            // when typing in an empty <div>. When typing after focusing <div contenteditable><p></p></div>,
            // this happens: <div contenteditable>New text comes here<p></p></div>
            //
            // All in all, to be more flexible, we decided to implement a simple DIY solution with the code below,
            // that sets a permanent class on empty elements, so we can also use this in functionality on non-admin
            // pages (eg. when the editor saves a page with no content).
            //
            // The rest of this is implemented in main.less
            var updatePlaceholder = function (event, rawEditorElement)
            {
                if (element.text().trim().length == 0) {
                    element.addClass(ImportsConstants.COMMONS_EMPTY_CLASS);

                    //note that we shouldn't introduce a paragraph in an inline editor, so we do our best to detect an inline editor
                    var isBlock = !inlineEditor && (element.css('display') == 'block' || Commons.isBlockElement(element));

                    if (isBlock) {
                        //these are two implementations of the same thing, I guess,
                        //all the checking is not really necessary, when it's empty, it's empty, right?
                        var USE_V1 = true;
                        if (USE_V1) {
                            element.html('<p><br></p>');
                        }
                        else {
                            //we do this because deleting everything from the editor
                            //seems to keep the first used tag alive (eg. <h1><br></h1>)
                            //and only after backspacing it once more, it gets replaced
                            //to <p><br></p>. This is weird when behavior, so let's work around it.
                            if (element.children().length == 1) {
                                var child = $(element.children()[0]);
                                if (child[0].tagName.toLowerCase() != 'p') {
                                    var grandchildren = child.children();
                                    if (grandchildren.length == 1 && grandchildren[0].tagName.toLowerCase() == 'br') {
                                        element.html('<p><br></p>');
                                    }
                                }
                            }
                        }
                    }
                    else {
                        //this is a quick fix for disappearing text after deleting a pasted text,
                        //but it doesn't seem to happen anymore
                        //element.html('&nbsp;');
                    }
                }
                else {
                    element.removeClass(ImportsConstants.COMMONS_EMPTY_CLASS);
                }
            };

            // See https://github.com/yabwe/medium-editor/blob/master/CUSTOM-EVENTS.md
            // editableInput is triggered whenever the content of a contenteditable changes,
            // including keypresses, toolbar actions, or any other user interaction that changes the html within the element.
            editor.subscribe('editableInput', updatePlaceholder);
            //a work around for the bug that the editor is not empty (yet) on key _down_
            // see https://github.com/orthes/medium-editor-insert-plugin/issues/408
            editor.subscribe('editableKeydownDelete', function (event, rawEditorElement)
            {
                setTimeout(function ()
                {
                    updatePlaceholder(event, rawEditorElement);

                    //the toolbar seems to be lost when doing the above,
                    //make sure that doesn't happen
                    var toolbar = editor.getExtensionByName('toolbar');
                    if (toolbar) {
                        $(toolbar.getToolbarElement()).addClass('medium-editor-toolbar-active');
                    }

                }, 250);
            });
            editor.subscribe('editablePaste', updatePlaceholder);
            editor.subscribe('focus', updatePlaceholder);
            editor.subscribe('blur', updatePlaceholder);

            //put the cursor where we clicked
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