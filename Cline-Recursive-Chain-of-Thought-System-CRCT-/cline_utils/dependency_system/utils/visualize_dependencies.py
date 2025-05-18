# cline_utils/dependency_system/utils/visualize_dependencies.py

"""
Handles the generation of Mermaid syntax for visualizing project dependencies.
"""

import os
import logging
import re
from collections import defaultdict
from typing import List, Optional, Dict, Tuple, Set

# Assuming these are the correct relative import paths based on the new file location
from ..core.key_manager import KeyInfo, sort_key_strings_hierarchically # Assuming global_path_to_key_info_type is Dict[str, KeyInfo]
from ..core.dependency_grid import DIAGONAL_CHAR # For skipping self-loops if necessary
from ..io import tracker_io # For aggregate_all_dependencies
from ..utils.path_utils import get_project_root, normalize_path # For path normalization
from ..utils.config_manager import ConfigManager # To get priorities etc.

logger = logging.getLogger(__name__)

PathMigrationInfo = Dict[str, Tuple[Optional[str], Optional[str]]]

def _is_direct_parent_child_key_relationship(
    key1_str: str,
    key2_str: str,
    global_path_to_key_info_map: Dict[str, KeyInfo]
) -> bool:
    """
    Checks if one key's path is the direct parent_path of the other key's path.
    """
    key1_info = next((info for info in global_path_to_key_info_map.values() if info.key_string == key1_str), None)
    key2_info = next((info for info in global_path_to_key_info_map.values() if info.key_string == key2_str), None)
    if not key1_info or not key2_info: return False
    if key2_info.parent_path and normalize_path(key1_info.norm_path) == normalize_path(key2_info.parent_path): return True
    if key1_info.parent_path and normalize_path(key2_info.norm_path) == normalize_path(key1_info.parent_path): return True
    return False


def generate_mermaid_diagram(
    focus_keys_list: List[str],
    global_path_to_key_info_map: Dict[str, KeyInfo],
    path_migration_info: PathMigrationInfo, # Note: renamed from path_migration_info_param
    all_tracker_paths_list: List[str],
    config_manager_instance: ConfigManager
) -> Optional[str]:
    """
    Core logic to generate a Mermaid string for given focus keys or overall project.

    Args:
        focus_keys_list: List of key strings to focus on. If empty, attempts to visualize all.
        global_path_to_key_info_map: Maps normalized paths to KeyInfo objects (CURRENT state).
        path_migration_info: The authoritative map linking paths to their old/new keys.
        all_tracker_paths_list: List of paths to all tracker files.
        config_manager_instance: Instance of ConfigManager.

    Returns:
        The Mermaid diagram string or None on critical failure.
        Returns a simple "no data" Mermaid string if no relevant items are found.
    """
    logger.info(f"Generating Mermaid diagram. Focus Keys: {focus_keys_list or 'Project Overview'}")

    try:
        aggregated_links_with_origins = tracker_io.aggregate_all_dependencies(
            set(all_tracker_paths_list), path_migration_info
        )
    except ValueError as ve:
        logger.error(f"Mermaid generation failed: Error during dependency aggregation: {ve}")
        return f"flowchart TB\n\n// Error: Could not aggregate dependencies: {ve}"
    except Exception as e:
        logger.error(f"Mermaid generation failed: Unexpected error during aggregation: {e}", exc_info=True)
        return f"flowchart TB\n\n// Error: Unexpected error aggregating: {e}"

    consolidated_directed_links: Dict[Tuple[str, str], str] = {
        link: char_and_origins[0]
        for link, char_and_origins in aggregated_links_with_origins.items()
    }
    logger.debug(f"Aggregated {len(consolidated_directed_links)} consolidated directed links using current keys.")

    # --- Scope Determination ---
    keys_in_module_scope = set(); is_module_view = False; focus_keys_valid = set()
    if len(focus_keys_list) == 1:
        focus_key_str = focus_keys_list[0]
        focus_info = next((info for info in global_path_to_key_info_map.values() if info.key_string == focus_key_str), None)
        if focus_info and focus_info.is_directory:
            is_module_view = True; module_path_prefix = focus_info.norm_path + "/"
            keys_in_module_scope.add(focus_key_str)
            for ki_val in global_path_to_key_info_map.values():
                if ki_val.norm_path == focus_info.norm_path or ki_val.norm_path.startswith(module_path_prefix):
                    keys_in_module_scope.add(ki_val.key_string)
            focus_keys_valid.add(focus_key_str)
        elif focus_info: focus_keys_valid.add(focus_key_str)
        else: logger.warning(f"Focus key '{focus_key_str}' not found. Overview."); focus_keys_list = []
    elif len(focus_keys_list) > 0:
         for fk_str in focus_keys_list:
             if any(info.key_string == fk_str for info in global_path_to_key_info_map.values()): focus_keys_valid.add(fk_str)
             else: logger.warning(f"Multi-focus key '{fk_str}' not found. Ignoring.")
         if not focus_keys_valid: logger.error("No valid focus keys."); return "flowchart TB\n\n// Error: No valid focus keys."

    # --- Edge Preparation ---
    intermediate_edges = []; processed_pairs_for_intermediate = set()
    non_n_links = {(s, t): char for (s, t), char in consolidated_directed_links.items() if char != 'n'}
    for (source, target), forward_char in sorted(non_n_links.items()):
        pair_tuple = tuple(sorted((source, target)))
        if pair_tuple in processed_pairs_for_intermediate: continue
        reverse_char = non_n_links.get((target, source))
        if forward_char == 'x' or reverse_char == 'x': intermediate_edges.append((source, target, 'x'))
        elif forward_char == '<' and reverse_char == '>': intermediate_edges.append((source, target, '<'))
        elif forward_char == '>' and reverse_char == '<': intermediate_edges.append((target, source, '<'))
        else: intermediate_edges.append((source, target, forward_char))
        processed_pairs_for_intermediate.add(pair_tuple)

    # --- Edge Filtering by Scope ---
    edges_within_scope = []; relevant_keys_for_nodes = set()
    if is_module_view:
        relevant_keys_for_nodes.update(keys_in_module_scope)
        for k1, k2, char_val in intermediate_edges:
            k1_is_internal = k1 in keys_in_module_scope; k2_is_internal = k2 in keys_in_module_scope
            if (k1_is_internal and k2_is_internal) or (k1_is_internal != k2_is_internal):
                edges_within_scope.append((k1, k2, char_val)); relevant_keys_for_nodes.add(k1); relevant_keys_for_nodes.add(k2)
    elif focus_keys_valid:
        relevant_keys_for_nodes.update(focus_keys_valid)
        for k1, k2, char_val in intermediate_edges:
            if k1 in focus_keys_valid or k2 in focus_keys_valid:
                edges_within_scope.append((k1, k2, char_val)); relevant_keys_for_nodes.add(k1); relevant_keys_for_nodes.add(k2)
    else: # Overview
        edges_within_scope = intermediate_edges
        relevant_keys_for_nodes = {k for edge in edges_within_scope for k in edge[:2]}

    # --- Final Edge Filtering ---
    final_edges_to_draw = []
    key_string_to_info_lookup = {info.key_string: info for info in global_path_to_key_info_map.values()}
    for k1, k2, char_val in edges_within_scope:
        if char_val == 'p': continue
        info1 = key_string_to_info_lookup.get(k1); info2 = key_string_to_info_lookup.get(k2)
        if not info1 or not info2: continue
        if char_val == 'x' and _is_direct_parent_child_key_relationship(k1, k2, global_path_to_key_info_map): continue
        if char_val != 'd' and info1.is_directory != info2.is_directory: continue
        final_edges_to_draw.append((k1, k2, char_val))
    logger.info(f"Final count of edges to draw: {len(final_edges_to_draw)}")

    nodes_to_render = {k for edge_tuple in final_edges_to_draw for k in edge_tuple[:2]}
    if focus_keys_valid: nodes_to_render.update(focus_keys_valid)

    if not nodes_to_render: return "flowchart TB\n\n// No relevant data to visualize."
    logger.info(f"Final count of distinct nodes to render: {len(nodes_to_render)}")

    parent_to_children_map: Dict[Optional[str], List[KeyInfo]] = defaultdict(list)
    all_keys_in_hierarchy = set(nodes_to_render)
    queue_for_parents = list(nodes_to_render); visited_for_parents_build = set(nodes_to_render)
    while queue_for_parents:
        key_str_q = queue_for_parents.pop(0); info_q = key_string_to_info_lookup.get(key_str_q)
        if not info_q: continue
        parent_to_children_map[info_q.parent_path].append(info_q)
        if info_q.parent_path:
            parent_key_info = next((ki for ki in global_path_to_key_info_map.values() if ki.norm_path == info_q.parent_path), None)
            if parent_key_info and parent_key_info.key_string not in visited_for_parents_build:
                 all_keys_in_hierarchy.add(parent_key_info.key_string); visited_for_parents_build.add(parent_key_info.key_string); queue_for_parents.append(parent_key_info.key_string)

    # 6. Generate Mermaid String (Nodes and Subgraphs)
    mermaid_string_parts = ["flowchart TB"]
    # classDef module - for subgraph titles (text color, font-weight) and fallback directory nodes
    mermaid_string_parts.append("  classDef module fill:#f9f,stroke:#333,stroke-width:2px,color:#333,font-weight:bold;") 
    
    # MODIFIED: 'file' classDef for code files - new purple fill
    mermaid_string_parts.append("  classDef file fill:#D1C4E9,stroke:#666,stroke-width:1px,color:#333;") # Mild purple fill
    
    # 'doc' classDef remains for documentation files
    mermaid_string_parts.append("  classDef doc fill:#D1C4E9,stroke:#666,stroke-width:1px,color:#333;")
    
    mermaid_string_parts.append("  classDef focusNode stroke:#007bff,stroke-width:3px;")

    mermaid_string_parts.append("  linkStyle default stroke:#CCCCCC,stroke-width:1px") # Light gray links
    
    # --- Node Styling Helper ---
    project_root_viz = get_project_root()
    try:
        # Assuming _get_item_type is in template_generator.py
        from .template_generator import _get_item_type as get_item_type_for_diagram_style
    except ImportError:
        logger.error("Fallback: Could not import _get_item_type for styling.")
        def get_item_type_for_diagram_style(p, c, pr): return "doc" if any(p.endswith(e) for e in ['.md','.rst']) else "file"

    def _get_node_class(key_info_obj: KeyInfo) -> str:
        if key_info_obj.is_directory: return "module" # For standalone/fallback directory nodes
        item_type = get_item_type_for_diagram_style(key_info_obj.norm_path, config_manager_instance, project_root_viz)
        return "doc" if item_type == "doc" else "file"

    # Tracks keys that have a visual representation (file node, OR directory key used in subgraph title)
    mermaid_represented_keys = set()
    dir_key_to_subgraph_id_map: Dict[str, str] = {} 

    mermaid_string_parts.append("\n  %% -- Nodes and Subgraphs --")
    def _generate_mermaid_structure_recursive(parent_norm_path: Optional[str], depth_indent_str: str):
        nonlocal mermaid_represented_keys, dir_key_to_subgraph_id_map
        children_key_infos = sorted(
            parent_to_children_map.get(parent_norm_path, []),
            key=lambda ki: sort_key_strings_hierarchically([ki.key_string])[0]
        )

        for child_ki in children_key_infos:
            child_key_str = child_ki.key_string
            if child_key_str not in all_keys_in_hierarchy: continue

            item_basename = os.path.basename(child_ki.norm_path)

            if child_ki.is_directory:
                safe_subgraph_id = f"sg_{re.sub(r'[^a-zA-Z0-9_]', '_', child_key_str)}"
                mermaid_string_parts.append(f'{depth_indent_str}subgraph {safe_subgraph_id} ["{child_key_str}<br>{item_basename}"]')
                mermaid_represented_keys.add(child_key_str) 
                dir_key_to_subgraph_id_map[child_key_str] = safe_subgraph_id
                
                subgraph_fill = "#282828"  # VERY Dark gray background for subgraphs
                subgraph_stroke_color = "#39FF14" 
                subgraph_stroke_width = "4px"  

                if child_key_str in focus_keys_valid:
                    # Example: Make focused subgraph border a brighter neon or different highlight
                    # subgraph_stroke_color = "#00FF00" # Brighter green for focus
                    # subgraph_stroke_width = "5px" # Even thicker if focused
                    pass # Keeping it the same neon green for now, distinct from node focus.

                mermaid_string_parts.append(f'{depth_indent_str}  style {safe_subgraph_id} fill:{subgraph_fill},stroke:{subgraph_stroke_color},stroke-width:{subgraph_stroke_width}')
                
                _generate_mermaid_structure_recursive(child_ki.norm_path, depth_indent_str + "  ")
                mermaid_string_parts.append(f'{depth_indent_str}end')
            
            elif child_key_str in nodes_to_render: 
                if child_key_str not in mermaid_represented_keys:
                    node_label = f'{child_key_str}["{child_key_str}<br>{item_basename}"]'
                    mermaid_string_parts.append(f'{depth_indent_str}{node_label}')
                    
                    node_class = _get_node_class(child_ki) # Returns 'file', 'doc', or 'module'
                    mermaid_string_parts.append(f'{depth_indent_str}class {child_key_str} {node_class}')
                    if child_key_str in focus_keys_valid:
                        mermaid_string_parts.append(f'{depth_indent_str}class {child_key_str} focusNode')
                    mermaid_represented_keys.add(child_key_str)

    _generate_mermaid_structure_recursive(None, "  ")

    # Fallback Node Definitions
    mermaid_string_parts.append("\n  %% -- Fallback Node Definitions --")
    for key_str_fb in nodes_to_render:
        if key_str_fb not in mermaid_represented_keys:
            info_fb = key_string_to_info_lookup.get(key_str_fb)
            if info_fb:
                item_basename_fb = os.path.basename(info_fb.norm_path)
                node_label_fb = f'{key_str_fb}["{key_str_fb}<br>{item_basename_fb}"]'
                mermaid_string_parts.append(f'  {node_label_fb}')
                node_class_fb = _get_node_class(info_fb) 
                mermaid_string_parts.append(f'  class {key_str_fb} {node_class_fb}')
                if key_str_fb in focus_keys_valid:
                    mermaid_string_parts.append(f'  class {key_str_fb} focusNode')
                mermaid_represented_keys.add(key_str_fb) 
            else:
                logger.warning(f"Mermaid Fallback: KeyInfo missing for '{key_str_fb}'.")

    # Dependencies Edge Drawing
    mermaid_string_parts.append("\n  %% -- Dependencies --")
    dep_char_to_style = {
        '<': ('-->', "relies on"), '>': ('-->', "required by"),
        'x': ('<-->', "mutual"), 'd': ('-.->', "docs"),
        's': ('-.->', "semantic (weak)"), 'S': ('==>', "semantic (strong)"),
    }
    sorted_final_edges = sorted(final_edges_to_draw, key=lambda x: (sort_key_strings_hierarchically([x[0]])[0], sort_key_strings_hierarchically([x[1]])[0], x[2]))

    for k1, k2, dep_char in sorted_final_edges:
        if k1 not in mermaid_represented_keys or k2 not in mermaid_represented_keys:
            logger.debug(f"Skipping edge ({k1} {dep_char} {k2}) - node not represented.")
            continue
        node1_link_id = dir_key_to_subgraph_id_map.get(k1, k1)
        node2_link_id = dir_key_to_subgraph_id_map.get(k2, k2)
        arrow_style, label_text = dep_char_to_style.get(dep_char, ('-->', dep_char))
        source_node_link_id, target_node_link_id = node1_link_id, node2_link_id
        if dep_char == '>': 
            source_node_link_id, target_node_link_id = node2_link_id, node1_link_id
        mermaid_string_parts.append(f'  {source_node_link_id} {arrow_style}|"{label_text}"| {target_node_link_id}')

    return "\n".join(mermaid_string_parts)
