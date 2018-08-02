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
 * Created by bram on 8/13/15.
 */

base.plugin("blocks.core.TextStyles", ["blocks.imports.Commons", "constants.blocks.imports.text", "messages.blocks.imports.text", function (ImportsCommons, TextConstants, TextMessages)
{
    //-----EDITOR STYLES-----
    //possible it's not loaded (eg. because the block wasn't used in the page)
    var MediumEditor = base.getPlugin("blocks.core.MediumEditor");
    if (MediumEditor) {

        // Styles is an array with objects
        // object is of type {value:"", text""}
        // value = "p:red" -> text before the colon is the tag, text after the colon are the classes that will be added
        // nothing after colon will remove allm classes, nothing before colon will not touch the tag
        // text is the text in the dropdown
        //
        // Example:
        // [
        //     {text: null, value: '<li class="dropdown-header">' + TextMessages.styles_sectionTitles + '</li>'},
        //     {text: TextMessages.styles_h1, value: "h1:"},
        //     {text: TextMessages.styles_h2, value: "h2:"},
        //     {text: TextMessages.styles_h3, value: "h3:"},
        //     {text: null, value: '<li role="separator" class="divider"></li>'},
        //
        //     {text: null, value: '<li class="dropdown-header">' + TextMessages.styles_sectionText + '</li>'},
        //     {text: TextMessages.styles_p, value: "p:"},
        //     {text: null, value: '<li role="separator" class="divider"></li>'},
        // ]

        //first, parse map to resolve the messages and so on...
        var stylesArr = ImportsCommons.convertConstantToNameValueArray(TextConstants.STYLES_MAP_JSON_CONFIG);

        //now extract (and group) the styles, based on the 'section' property
        var stylePickerStyles = [];
        var lastSection = null;
        $.each(stylesArr, function (index, obj)
        {
            if (obj.section) {
                if (obj.section != lastSection) {
                    if (lastSection != null) {
                        stylePickerStyles.push({text: null, value: '<li role="separator" class="divider"></li>'});
                    }
                    stylePickerStyles.push({text: null, value: '<li class="dropdown-header">' + obj.section + '</li>'});
                }

                stylePickerStyles.push({text: obj.name, value: obj.value});
                lastSection = obj.section;
            }
            else {
                Logger.warn("Ignoring text style because it doesn't have a 'section' property set; ", obj);
            }
        });

        //initialize with a default value if nothing was set explicitly
        if (stylePickerStyles.length == 0) {
            stylePickerStyles = [
                {text: null, value: '<li class="dropdown-header">' + TextMessages.styles_sectionTitles + '</li>'},
                {text: TextMessages.styles_h1, value: "h1:"},
                {text: TextMessages.styles_h2, value: "h2:"},
                {text: TextMessages.styles_h3, value: "h3:"},
                {text: null, value: '<li role="separator" class="divider"></li>'},

                {text: null, value: '<li class="dropdown-header">' + TextMessages.styles_sectionText + '</li>'},
                {text: TextMessages.styles_p, value: "p:"},
            ];
        }

        //it's maybe prettier to add a closing divider...
        stylePickerStyles.push({text: null, value: '<li role="separator" class="divider"></li>'});

        MediumEditor.setStylePickerStyles(stylePickerStyles);
    }
}]);