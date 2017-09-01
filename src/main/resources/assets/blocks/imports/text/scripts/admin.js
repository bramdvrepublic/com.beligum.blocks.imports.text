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

            //this allows us to set some specific additional options to the elements to control how the editor behaves
            var options = {};
            var optionsAttr = element.attr(TextConstants.OPTIONS_ATTR);
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

            // last argument means inline (no enter allowed) or not
            var editor = Editor.getEditor(element, inlineEditor, options[TextConstants.OPTIONS_NO_TOOLBAR]);
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