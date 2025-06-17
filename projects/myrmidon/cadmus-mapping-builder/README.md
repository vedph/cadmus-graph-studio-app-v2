# CadmusMappingBuilder

- 📦 `@myrmidon/cadmus-mapping-builder`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## Overview

### Data

This library contains the logic for building Cadmus mapping rules for a semantic graph using a UI.

Data is managed by an implementation of the `NodeMappingService` interface, which has methods for importing, exporting and editing mapping rules. This is implemented by a RAM-based service (`RamNodeMappingService`) loading its data from a JSON document.

This mappings handled by this service are of type `NodeMapping`, i.e. a rule's mapping plus properties representing references to its parent and children mappings. This, the `NodeMapping` is a nested node: in fact, each rule is a tree of mappings.

For instance, here is the JSON document corresponding to a single mapping with two children. As you can see, in this case there are no explicit identifiers; when this happens, the node mapping service will automatically assign ID and parent IDs to each mapping node. This is done via an instance of `MappingJsonService`, which takes care of reading and writing mappings documents.

```json
"event_chronotopes": {
  "name": "event_chronotopes",
  "description": "For each chronotope, map the place/date of an event to triples which create a place node for the place and link it to the event via a triple using crm:P7_took_place_at for places; and to triples using crm:P4_has_time_span which in turn has a new timespan node has object.",
  "source": "chronotopes",
  "sid": "{$sid}/chronotope",
  "children": [
    {
      "name": "event_chronotopes/place",
      "source": "place",
      "output": {
        "nodes": {
          "place": "itn:places/{@value}"
        },
        "triples": [
          "{?place} a crm:E53_Place",
          "{?event} crm:P7_took_place_at {?place}"
        ]
      }
    },
    {
      "name": "event_chronotopes/date",
      "source": "date",
      "output": {
        "metadata": {
          "date_value": "{!_hdate({@.} & value)}",
          "date_text": "{!_hdate({@.} & text)}"
        },
        "nodes": {
          "timespan": "itn:timespans/ts##"
        },
        "triples": [
          "{?event} crm:P4_has_time-span {?timespan}",
          "{?timespan} crm:P82_at_some_time_within \"{$date_value}\"^^xs:float",
          "{?timespan} crm:P87_is_identified_by \"{$date_text}\"@en"
        ]
      }
    }
  ]
}
```

### Components

A list of mappings (`NodeMapping`) can be browsed with `MappingListComponent`, using a `NodeMappingListService` which manages paging. In the studio app, this list is initially loaded from static assets via a `MappingJsonService`; you can then load your own from a file, and save it back to a file.

When you edit a mapping in the list, the `MappingTreeEditor` opens for that mapping. This uses two components:

- a `MappingTree`, showing the full tree of the edited mapping. This receives the mapping root node, and shows its tree. According to user actions it emits events requesting to delete a node, add a node as a child of an existing one, or edit a specific node. These events are then handled by the mapping tree editor, which changes the mapping being edited.
- a `MappingEditorComponent`, used to edit each node in that tree. When saving edits, the edited mapping is updated.

The `MappingTree` internally uses a flat tree structure, as it leverages a generic paged tree component. So, it gets the `NodeMapping` being edited, and builds a flat tree from it, using `MappingTreeService`.`reset` with that mapping's ID.

>In turn, this service, which is a wrapper for a paged tree store, uses the `MappingPagedTreeStoreService` to load into the tree store the tree of the selected mapping, flattening it into flat nodes (of type `MappingPagedTreeNode`). It then resets the store, which will force it to reload its data, consisting in the selected mapping's tree.

TODO
