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

package com.beligum.blocks.imports.text.config;

import com.fasterxml.jackson.core.JsonProcessingException;

/**
 * Created by bram on 12.06.17.
 */
public class Settings
{
    //-----CONSTANTS-----
    private static final String COMMON_PREFIX = "blocks.imports.text";
    private static final String STYLES_PREFIX = COMMON_PREFIX + ".styles";

    //-----VARIABLES-----
    private static Settings instance;
    private String cachedSylesMapJson;

    //-----CONSTRUCTORS-----
    private Settings()
    {
    }
    public static Settings instance()
    {
        if (Settings.instance == null) {
            Settings.instance = new Settings();
        }
        return Settings.instance;
    }

    //-----PUBLIC METHODS-----
    public String getStylesMapJson()
    {
        if (this.cachedSylesMapJson == null) {
            this.cachedSylesMapJson = com.beligum.blocks.imports.commons.config.Settings.instance().getConstantsJsonMap(STYLES_PREFIX + ".style");
        }

        return this.cachedSylesMapJson;
    }

    //-----PROTECTED METHODS-----

    //-----PRIVATE METHODS-----
}
