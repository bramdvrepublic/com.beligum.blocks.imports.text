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

package com.beligum.blocks.imports.text.rdf;

import com.beligum.blocks.config.InputType;
import com.beligum.blocks.exceptions.RdfInitializationException;
import com.beligum.blocks.rdf.RdfFactory;
import com.beligum.blocks.rdf.ifaces.RdfProperty;
import com.beligum.blocks.rdf.ontologies.Main;
import com.beligum.blocks.rdf.ontologies.RDF;

/**
 * Created by bram on 2/28/16.
 */
public class Ontology extends Main
{
    //-----CONSTANTS-----

    //-----MEMBERS-----
    public static final RdfProperty text = RdfFactory.newProxyProperty("text");

    //-----CONSTRUCTORS-----
    @Override
    protected void create(RdfFactory rdfFactory) throws RdfInitializationException
    {
        // Note: no need to call the super class, it will be called automatically

        rdfFactory.register(text)
                  .isPublic(true)
                  .label(gen.com.beligum.blocks.imports.text.messages.blocks.imports.text.Entries.ontology_label_text)
                  .dataType(RDF.HTML)
                  .widgetType(InputType.Editor);
    }


    //-----PUBLIC METHODS-----
}
