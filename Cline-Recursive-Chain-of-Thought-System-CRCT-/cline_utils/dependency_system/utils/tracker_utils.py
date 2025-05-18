# utils/tracker_utils.py

import os
import glob
import logging
import re
from typing import Any, Dict, Set, Tuple, List, Optional
from collections import defaultdict

from .cache_manager import cached
from .config_manager import ConfigManager
from .path_utils import normalize_path, get_project_root
from cline_utils.dependency_system.core.key_manager import KeyInfo, sort_key_strings_hierarchically, validate_key
from cline_utils.dependency_system.core.dependency_grid import PLACEHOLDER_CHAR, decompress, DIAGONAL_CHAR, EMPTY_CHAR

logger = logging.getLogger(__name__)

# Type alias from tracker_io
PathMigrationInfo = Dict[str, Tuple[Optional[str], Optional[str]]] # path -> (old_key, new_key)


@cached("tracker_data",
        key_func=lambda tracker_path:
        f"tracker_data:{normalize_path(tracker_path)}:{(os.path.getmtime(tracker_path) if os.path.exists(tracker_path) else 0)}")
def read_tracker_file(tracker_path: str) -> Dict[str, Any]:
    """
    Read a tracker file and parse its contents. Caches based on path and mtime.
    Args:
        tracker_path: Path to the tracker file
    Returns:
        Dictionary with keys, grid, and metadata, or empty structure on failure.
    """
    tracker_path = normalize_path(tracker_path)
    if not os.path.exists(tracker_path):
        logger.debug(f"Tracker file not found: {tracker_path}. Returning empty structure.")
        return {"keys": {}, "grid": {}, "last_key_edit": "", "last_grid_edit": ""}
    try:
        with open(tracker_path, 'r', encoding='utf-8') as f: content = f.read()
        keys = {}; grid = {}; last_key_edit = ""; last_grid_edit = ""
        key_section_match = re.search(r'---KEY_DEFINITIONS_START---\n(.*?)\n---KEY_DEFINITIONS_END---', content, re.DOTALL | re.IGNORECASE)
        if key_section_match:
            key_section_content = key_section_match.group(1)
            for line in key_section_content.splitlines():
                line = line.strip()
                if not line or line.lower().startswith("key definitions:"): continue
                match = re.match(r'^([a-zA-Z0-9]+)\s*:\s*(.*)$', line)
                if match:
                    k, v = match.groups()
                    if validate_key(k): keys[k] = normalize_path(v.strip())
                    else: logger.warning(f"Skipping invalid key format in {tracker_path}: '{k}'")

        grid_section_match = re.search(r'---GRID_START---\n(.*?)\n---GRID_END---', content, re.DOTALL | re.IGNORECASE)
        if grid_section_match:
            grid_section_content = grid_section_match.group(1)
            lines = grid_section_content.strip().splitlines()
            # Skip header line (X ...) if present
            if lines and (lines[0].strip().upper().startswith("X ") or lines[0].strip() == "X"): lines = lines[1:]
            for line in lines:
                line = line.strip()
                match = re.match(r'^([a-zA-Z0-9]+)\s*=\s*(.*)$', line)
                if match:
                    k, v = match.groups()
                    if validate_key(k): grid[k] = v.strip()
                    else: logger.warning(f"Grid row key '{k}' in {tracker_path} has invalid format. Skipping.")

        last_key_edit_match = re.search(r'^last_KEY_edit\s*:\s*(.*)$', content, re.MULTILINE | re.IGNORECASE)
        if last_key_edit_match: last_key_edit = last_key_edit_match.group(1).strip()
        last_grid_edit_match = re.search(r'^last_GRID_edit\s*:\s*(.*)$', content, re.MULTILINE | re.IGNORECASE)
        if last_grid_edit_match: last_grid_edit = last_grid_edit_match.group(1).strip()

        logger.debug(f"Read tracker '{os.path.basename(tracker_path)}': {len(keys)} keys, {len(grid)} grid rows")
        return {"keys": keys, "grid": grid, "last_key_edit": last_key_edit, "last_grid_edit": last_grid_edit}
    except Exception as e:
        logger.exception(f"Error reading tracker file {tracker_path}: {e}")
        return {"keys": {}, "grid": {}, "last_key_edit": "", "last_grid_edit": ""}

def find_all_tracker_paths(config: ConfigManager, project_root: str) -> Set[str]:
    """Finds all main, doc, and mini tracker files in the project."""
    all_tracker_paths = set()
    memory_dir_rel = config.get_path('memory_dir')
    if not memory_dir_rel:
        logger.warning("memory_dir not configured. Cannot find main/doc trackers.")
        memory_dir_abs = None
    else:
        memory_dir_abs = normalize_path(os.path.join(project_root, memory_dir_rel))
        logger.debug(f"Path Components: project_root='{project_root}', memory_dir_rel='{memory_dir_rel}', calculated memory_dir_abs='{memory_dir_abs}'")

        # Main Tracker
        main_tracker_abs = config.get_path("main_tracker_filename", os.path.join(memory_dir_abs, "module_relationship_tracker.md"))
        logger.debug(f"Using main_tracker_abs from config (or default): '{main_tracker_abs}'")
        if os.path.exists(main_tracker_abs): all_tracker_paths.add(main_tracker_abs)
        else: logger.debug(f"Main tracker not found at: {main_tracker_abs}")

        # Doc Tracker
        doc_tracker_abs = config.get_path("doc_tracker_filename", os.path.join(memory_dir_abs, "doc_tracker.md"))
        logger.debug(f"Using doc_tracker_abs from config (or default): '{doc_tracker_abs}'")
        if os.path.exists(doc_tracker_abs): all_tracker_paths.add(doc_tracker_abs)
        else: logger.debug(f"Doc tracker not found at: {doc_tracker_abs}")

    # Mini Trackers
    code_roots_rel = config.get_code_root_directories()
    if not code_roots_rel:
         logger.warning("No code_root_directories configured. Cannot find mini trackers.")
    else:
        for code_root_rel in code_roots_rel:
            code_root_abs = normalize_path(os.path.join(project_root, code_root_rel))
            mini_tracker_pattern = os.path.join(code_root_abs, '**', '*_module.md')
            try:
                found_mini_trackers = glob.glob(mini_tracker_pattern, recursive=True)
                normalized_mini_paths = {normalize_path(mt_path) for mt_path in found_mini_trackers}
                all_tracker_paths.update(normalized_mini_paths)
                logger.debug(f"Found {len(normalized_mini_paths)} mini trackers under '{code_root_rel}'.")
            except Exception as e:
                 logger.error(f"Error during glob search for mini trackers under '{code_root_abs}': {e}")

    logger.info(f"Found {len(all_tracker_paths)} total tracker files.")
    return all_tracker_paths

# --- Modified Aggregation Function ---
@cached("aggregation", key_func=lambda paths, pmi: f"agg:{':'.join(sorted(list(paths)))}:{hash(tuple(sorted(pmi.items())))}", ttl=300)
def aggregate_all_dependencies(
    tracker_paths: Set[str],
    path_migration_info: PathMigrationInfo # Use the pre-built migration map
) -> Dict[Tuple[str, str], Tuple[str, Set[str]]]:
    """
    Reads all specified tracker files and aggregates dependencies, validating keys
    found in trackers against the path migration map to ensure they represent
    stable paths in the current state.

    Args:
        tracker_paths: A set of normalized paths to the tracker files.
        path_migration_info: The authoritative map linking paths to their
                             old and new keys, derived from global maps.

    Returns:
        A dictionary where:
            Key: Tuple (source_key_str, target_key_str) representing a directed link.
            Value: Tuple (highest_priority_dep_char, Set[origin_tracker_path_str])
                   for that directed link across all trackers.
                   Origin set contains paths of trackers where this link (with this char or lower priority) was found.
    """
    aggregated_links: Dict[Tuple[str, str], Tuple[str, Set[str]]] = {}
    config = ConfigManager() # Needed for priority
    get_priority = config.get_char_priority

    logger.info(f"Aggregating dependencies from {len(tracker_paths)} trackers using path migration map...")

    # Create helper map: old_key -> path (derived from path_migration_info for validation)
    # We need this to map keys found in the file grid back to paths
    old_key_to_stable_path: Dict[str, str] = {}
    for path, (old_key, _new_key) in path_migration_info.items():
        if old_key: # Only include paths that existed in the old state
             if old_key in old_key_to_stable_path:
                  # This indicates an old key was reused for different paths in the old map, error!
                  logger.error(f"Aggregation Error: Old key '{old_key}' maps to multiple paths ('{old_key_to_stable_path[old_key]}' and '{path}') according to migration map. Inconsistent old global map?")
                  # Continue might hide errors, maybe raise? For now, log and skip adding the duplicate.
             else:
                  old_key_to_stable_path[old_key] = path

    processed_trackers = 0
    for tracker_path in tracker_paths:
        logger.debug(f"Processing tracker for aggregation: {os.path.basename(tracker_path)}")
        tracker_data = read_tracker_file(tracker_path) # Uses cache
        grid_from_file = tracker_data.get("grid")
        keys_from_file = tracker_data.get("keys") # Stale key -> path

        if not grid_from_file or not keys_from_file:
            logger.debug(f"Skipping empty tracker or missing keys/grid: {os.path.basename(tracker_path)}")
            continue

        # Get the OLD key list sorted according to the tracker file structure
        old_keys_list_from_file = sort_key_strings_hierarchically(list(keys_from_file.keys()))

        processed_rows = 0
        skipped_unstable = 0
        for old_row_key_from_file, compressed_row in grid_from_file.items():

            # --- VALIDATION 1: Check Row Key Stability ---
            row_path = old_key_to_stable_path.get(old_row_key_from_file)
            if not row_path:
                 # This old key didn't exist in the old global map or mapped to multiple paths
                 # logger.debug(f"Agg Skip Row: Old key '{old_row_key_from_file}' from {os.path.basename(tracker_path)} not found in stable old_key_to_path map.")
                 skipped_unstable += 1
                 continue
            migration_tuple_row = path_migration_info.get(row_path)
            if not migration_tuple_row or migration_tuple_row[1] is None:
                 # Path removed or old key was unstable globally
                 # logger.debug(f"Agg Skip Row: Path '{row_path}' (from old key '{old_row_key_from_file}') unstable or removed.")
                 skipped_unstable += 1
                 continue
            current_row_key = migration_tuple_row[1] # Get the CURRENT key

            try:
                decompressed_row = decompress(compressed_row)
                if len(decompressed_row) != len(old_keys_list_from_file):
                     logger.warning(f"Aggregation: Row length mismatch for old key '{old_row_key_from_file}' in {os.path.basename(tracker_path)}. Skipping row.")
                     continue

                for old_col_idx, dep_char in enumerate(decompressed_row):
                    # Skip diagonal, no-dependency, empty
                    if dep_char in (DIAGONAL_CHAR, EMPTY_CHAR): continue

                    if old_col_idx >= len(old_keys_list_from_file): continue # Safety
                    old_col_key_from_file = old_keys_list_from_file[old_col_idx]

                    if old_row_key_from_file == old_col_key_from_file: continue # Should be caught by DIAGONAL_CHAR check, but belts and braces

                    # --- VALIDATION 2: Check Column Key Stability ---
                    col_path = old_key_to_stable_path.get(old_col_key_from_file)
                    if not col_path:
                         # logger.debug(f"Agg Skip Cell: Old col key '{old_col_key_from_file}' not stable.")
                         skipped_unstable += 1
                         continue
                    migration_tuple_col = path_migration_info.get(col_path)
                    if not migration_tuple_col or migration_tuple_col[1] is None:
                         # logger.debug(f"Agg Skip Cell: Col Path '{col_path}' unstable/removed.")
                         skipped_unstable += 1
                         continue
                    current_col_key = migration_tuple_col[1] # Get the CURRENT key

                    # --- Both paths are stable, process the dependency ---
                    current_link = (current_row_key, current_col_key)
                    existing_char, existing_origins = aggregated_links.get(current_link, (None, set()))

                    try:
                        current_priority = get_priority(dep_char)
                        existing_priority = get_priority(existing_char) if existing_char else -1 # Assign lowest priority if non-existent
                    except KeyError as e:
                         logger.warning(f"Invalid dependency character '{str(e)}' found in {tracker_path} for {old_row_key_from_file}->{old_col_key_from_file}. Skipping.")
                         continue

                    if current_priority > existing_priority:
                        # New char has higher priority, replace char and reset origins
                        aggregated_links[current_link] = (dep_char, {tracker_path})
                    elif current_priority == existing_priority:
                        if dep_char == existing_char: # Only add origin if char is identical
                            existing_origins.add(tracker_path)
                            aggregated_links[current_link] = (dep_char, existing_origins)
                        else: # Same priority, different char - new one wins, resets origins
                            aggregated_links[current_link] = (dep_char, {tracker_path})
                            logger.debug(f"Same priority, different char for {current_link}: old='{existing_char}', new='{dep_char}'. New char wins.")

                processed_rows += 1

            except Exception as e:
                logger.warning(f"Aggregation: Error processing row for old key '{old_row_key_from_file}' in {os.path.basename(tracker_path)}: {e}")
        
        if skipped_unstable > 0:
            logger.debug(f"Aggregation for {os.path.basename(tracker_path)}: Skipped {skipped_unstable} cells/rows due to unstable/removed paths.")
        processed_trackers += 1

    logger.info(f"Aggregation complete. Processed {processed_trackers} trackers. Found {len(aggregated_links)} unique directed links (based on current keys for stable paths).")
    return aggregated_links

# --- End of tracker_utils.py ---