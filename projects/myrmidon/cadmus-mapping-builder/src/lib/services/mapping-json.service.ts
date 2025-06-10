import { Injectable } from '@angular/core';

import { deepCopy } from '@myrmidon/ngx-tools';

import {
  MappedNode,
  MappedTriple,
  NodeMapping,
  NodeMappingOutput,
} from '../models';

/**
 * Interface corresponding to the node's output in the JSON mapping format.
 */
export interface SerializedMappedNodeOutput {
  nodes?: { [key: string]: string };
  triples?: string[];
  metadata?: { [key: string]: string };
}

/**
 * Interface corresponding to a mapped node in the JSON mapping format.
 */
export interface SerializedMappedNode {
  id?: number;
  parentId?: number;
  ordinal?: number;
  name: string;
  sourceType: number;
  facetFilter?: string;
  groupFilter?: string;
  flagsFilter?: number;
  titleFilter?: string;
  partTypeFilter?: string;
  partRoleFilter?: string;
  description?: string;
  source: string;
  sid: string;
  scalarPattern?: string;
  output?: SerializedMappedNodeOutput;
  children?: SerializedMappedNode[];
}

/**
 * Interface corresponding to a JSON document containing node mappings.
 * This document can contain named mappings (namedMappings) and document
 * mappings (documentMappings). Document mappings are the true mappings;
 * named mappings are just branches of nodes which get reused in multiple
 * document mappings. Document mappings can reference named mappings
 * by name, and these references will be expanded when reading the document.
 * A reference to a named mapping is just an object having only the name,
 * and (among other missing properties) no source, which is required for
 * each true mapping.
 */
export interface NodeMappingDocument {
  namedMappings?: { [key: string]: SerializedMappedNode };
  documentMappings: SerializedMappedNode[];
}

/**
 * Custom JSON mapping service. This is used to serialize and deserialize
 * a mapping to/from JSON using a more human-friendly and compact format.
 * This format differs from the NodeMapping model in those aspects:
 * - the ID and parent ID are optionally excluded;
 * - output.nodes becomes an object where each node is a property with
 * key=its key and value="uid [label|tag]";
 * - output.triples becomes an array of strings with format "s p o" or
 * "s p "ol"" or "s p "ol"@lang" or "s p "ol"^^type".
 */
@Injectable({
  providedIn: 'root',
})
export class MappingJsonService {
  private _nextId = 1;

  /**
   * Visit all the mappings in the specified mapping's hierarchy, calling
   * the specified visitor function for each visited mapping, and setting
   * the parent of each mapping if requested.
   *
   * @param mapping The mapping to visit.
   * @param hydration True to supply ID and parents for the falsy IDs
   * and parents of each visited mapping.
   * @param visitor The function to call for each visited mapping, if any;
   * if this returns false, the visit is interrupted.
   */
  public visitMappings(
    mapping: NodeMapping | null,
    hydration = true,
    visitor?: (m: NodeMapping) => boolean
  ): void {
    // nope if no mapping
    if (!mapping) {
      return;
    }

    // supply ID and parent if requested
    if (hydration && !mapping.id) {
      mapping.id = this._nextId++;
    }
    if (visitor && !visitor(mapping)) {
      return;
    }

    // handle its children
    if (mapping.children?.length) {
      for (let child of mapping.children) {
        if (hydration) {
          child.parentId = mapping.id;
          child.parent = mapping;
        }
        if (visitor && !visitor(child)) {
          return;
        }
        this.visitMappings(child, hydration, visitor);
      }
    }
  }

  /**
   * Adapt the received nodes to an object ready to be serialized into JSON
   * with a more compact format.
   * @param nodes The nodes to adapt.
   * @returns Adapted node, a dictionary where each key is the node's key,
   * and each value is a string with format "uid [label|tag]".
   */
  private adaptNodes(nodes?: {
    [key: string]: MappedNode;
  }): { [key: string]: string } | undefined {
    if (!nodes) {
      return undefined;
    }
    const result: { [key: string]: string } = {};
    for (let key in nodes) {
      let node = nodes[key];
      if (node.label || node.tag) {
        result[key] = node.tag
          ? `${node.uid} [${node.label}|${node.tag}]`
          : `${node.uid} [${node.label}]`;
      } else {
        result[key] = node.uid;
      }
    }
    return result;
  }

  /**
   * Adapt the received triples to an array ready to be serialized into JSON
   * with a more compact format.
   * @param triples The triples to adapt.
   * @returns Adapted triples, an array of strings with format "s p o" or
   * "s p "ol"" or "s p "ol"@lang" or "s p "ol"^^type".
   */
  private adaptTriples(triples?: MappedTriple[]): string[] | undefined {
    if (!triples) {
      return undefined;
    }
    return triples?.map((t) => {
      let o: string;
      if (t.o) {
        o = t.o;
      } else {
        o = t.ol?.startsWith('"') ? t.ol : `"${t.ol}"`;
      }
      return `${t.s} ${t.p} ${o}`;
    });
  }

  /**
   * Adapt the received mapping output to an object ready to be serialized
   * @param output The output to adapt.
   * @returns Output ready to be serialized into JSON with a more compact format.
   */
  private adaptMappingOutput(
    output: NodeMappingOutput | undefined | null
  ): SerializedMappedNodeOutput | undefined {
    return {
      // nodes: { key: "uid [label|tag]" }
      nodes: this.adaptNodes(output?.nodes),
      // triples: [ "s p o", "s p "ol"" ]
      triples: this.adaptTriples(output?.triples),
      // metadata: { key: "value" }
      metadata: output?.metadata,
    };
  }

  /**
   * Get the ready to serialize node from the specified node mapping.
   * @param node The node mapping to serialize.
   * @param dropId True to drop ID and parent ID.
   * @returns The serialized mapped node.
   */
  private getSerializedMappedNode(
    node: NodeMapping,
    dropId = false
  ): SerializedMappedNode {
    return {
      id: dropId ? undefined : node.id,
      parentId: dropId ? undefined : node.parentId,
      ordinal: node.ordinal,
      name: node.name,
      sourceType: node.sourceType,
      facetFilter: node.facetFilter,
      groupFilter: node.groupFilter,
      flagsFilter: node.flagsFilter,
      titleFilter: node.titleFilter,
      partTypeFilter: node.partTypeFilter,
      partRoleFilter: node.partRoleFilter,
      description: node.description,
      source: node.source,
      sid: node.sid,
      scalarPattern: node.scalarPattern,
      output: this.adaptMappingOutput(node.output),
      children: node.children?.map((c) =>
        this.getSerializedMappedNode(c, dropId)
      ),
    };
  }

  /**
   * Serialize the specified mapping to JSON.
   *
   * @param mapping The mapping to serialize.
   * @param dropId True to drop ID and parent ID.
   * @returns JSON string.
   */
  public serializeMapping(mapping: NodeMapping, dropId = false): string {
    return JSON.stringify(
      this.getSerializedMappedNode(mapping, dropId),
      null,
      2
    );
  }

  private parseNode(text: string | null | undefined): MappedNode | null {
    if (!text) {
      return null;
    }
    // parse node from "uid [label|tag]" (uid required)
    const m = text.match(
      /^((?:(?!\[[^\[\]]+\]$).)*)(?:\[([^\]\|]+)?(?:\|([^\]]+))?\])?/
    );
    if (!m) {
      return null;
    }
    return {
      uid: m[1].trim(),
      label: m[2]?.trim(),
      tag: m[3]?.trim(),
    };
  }

  private getMappedNodes(nodes?: {
    [key: string]: string;
  }): { [key: string]: MappedNode } | undefined {
    if (!nodes) {
      return undefined;
    }
    const result: { [key: string]: MappedNode } = {};
    for (let key in nodes) {
      const node = this.parseNode(nodes[key]);
      if (node) {
        result[key] = node;
      }
    }
    return result;
  }

  private getMappedTriples(triples?: string[]): MappedTriple[] | undefined {
    if (!triples) {
      return undefined;
    }
    return triples.map((t) => {
      // More robust parsing - split on first two spaces only
      const firstSpace = t.indexOf(' ');
      const secondSpace = t.indexOf(' ', firstSpace + 1);

      if (firstSpace === -1 || secondSpace === -1) {
        throw new Error(`Invalid triple format: ${t}`);
      }

      const s = t.substring(0, firstSpace);
      const p = t.substring(firstSpace + 1, secondSpace);
      const o = t.substring(secondSpace + 1);

      return o.startsWith('"') ? { s, p, ol: o } : { s, p, o };
    });
  }

  private getMapping(node: SerializedMappedNode): NodeMapping {
    const mapping: NodeMapping = {
      id: node.id || 0,
      parentId: node.parentId,
      ordinal: node.ordinal,
      name: node.name,
      sourceType: node.sourceType,
      facetFilter: node.facetFilter,
      groupFilter: node.groupFilter,
      flagsFilter: node.flagsFilter,
      titleFilter: node.titleFilter,
      partTypeFilter: node.partTypeFilter,
      partRoleFilter: node.partRoleFilter,
      description: node.description,
      source: node.source,
      sid: node.sid,
      scalarPattern: node.scalarPattern,
      output: {
        nodes: this.getMappedNodes(node.output?.nodes),
        triples: this.getMappedTriples(node.output?.triples),
        metadata: node.output?.metadata,
      },
      children: node.children?.map((c) => this.getMapping(c)),
    };

    return mapping;
  }

  /**
   * Read a JSON document containing node mappings.
   *
   * @param json The JSON document to read.
   * @param resetId The flag to reset the next ID to 1.
   * If true, the next ID will be reset to 1 before reading the document.
   * @returns Array of node mappings read from the document.
   */
  public readMappingsDocument(json: string, resetId = true): NodeMapping[] {
    // reset the next ID if requested
    if (resetId) {
      this._nextId = 1;
    }

    /// parse the JSON document
    const doc = JSON.parse(json) as NodeMappingDocument;
    if (!doc?.documentMappings?.length) {
      return [];
    }

    // read named mappings
    let named: { [key: string]: NodeMapping } = {};
    if (doc.namedMappings) {
      Object.keys(doc.namedMappings).forEach((key) => {
        named[key] = this.getMapping(doc.namedMappings![key]);
      });
    }

    // read document mappings
    const mappings = doc.documentMappings.map((m) => this.getMapping(m));

    // hydrate mappings expanding named mappings references
    for (let i = 0; i < mappings.length; i++) {
      // assign IDs and parents
      this.visitMappings(mappings[i], true);

      // expand named mappings - check if this is a reference (no output, no children)
      let hasExpansions = false;
      this.visitMappings(mappings[i], false, (m) => {
        // Only expand if this looks like a named reference:
        // - name exists in named mappings
        // - has no output or minimal content (likely just a reference)
        if (named[m.name] && !m.source) {
          hasExpansions = true;
          // copy named mapping when expanding
          const mc = deepCopy(named[m.name]);
          mc.id = m.id;
          mc.parentId = m.parentId;
          mc.parent = m.parent;

          if (m.parent?.children) {
            const idx = m.parent.children.findIndex((c) => c.id === m.id);
            if (idx >= 0) {
              m.parent.children[idx] = mc;
            }
          } else {
            mappings[i] = mc;
          }
        }
        return true;
      });

      // repeat hydration on expanded mappings to ensure that
      // also expanded mappings descendants are hydrated
      if (hasExpansions) {
        this.visitMappings(mappings[i], true);
      }
    }
    return mappings;
  }
}
