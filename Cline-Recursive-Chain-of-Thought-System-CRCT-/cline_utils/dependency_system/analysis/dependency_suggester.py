# analysis/dependency_suggester.py

"""
Analysis module for dependency suggestion using contextual keys.
Suggests potential dependencies based on code analysis and embeddings.
Assigns specific characters based on the type of dependency found.
"""

from collections import defaultdict
import json
import re
import os
from typing import Dict, List, Tuple, Optional, Any
import importlib.util
import ast

# Import only from lower-level modules
# <<< *** MODIFIED IMPORTS *** >>>
from cline_utils.dependency_system.core.key_manager import (
    KeyInfo, # Added
    get_key_from_path as get_key_string_from_path # Renamed import
)
from cline_utils.dependency_system.utils.path_utils import get_file_type, normalize_path, resolve_relative_path, is_subpath, get_project_root
from cline_utils.dependency_system.utils.config_manager import ConfigManager
from cline_utils.dependency_system.utils.cache_manager import cached, clear_all_caches
# NOTE: Avoid importing analyze_file here to prevent circular dependency if analyzer calls suggester

# Logger setup (assuming it's configured elsewhere)
import logging
logger = logging.getLogger(__name__)

# Character Definitions:
# <: Row depends on column.
# >: Column depends on row.
# x: Mutual dependency.
# d: Documentation dependency.
# o: Self dependency (diagonal only).
# n: Verified no dependency.
# p: Placeholder (unverified).
# s: Semantic dependency (weak .06-.07) - Adjusted based on .clinerules
# S: Semantic dependency (strong .07+) - Added based on .clinerules

def clear_caches():
    """Clear all internal caches."""
    clear_all_caches()

def load_metadata(metadata_path: str) -> Dict[str, Any]:
    """
    Load metadata file with caching.

    Args:
        metadata_path: Path to the metadata file
    Returns:
        Dictionary containing metadata or empty dict on failure
    """
    try:
        with open(metadata_path, 'r', encoding='utf-8') as f: metadata = json.load(f)
        return metadata
    except FileNotFoundError: logger.warning(f"Metadata file not found at {metadata_path}. Run generate-embeddings first."); return {}
    except json.JSONDecodeError as e: logger.error(f"Invalid JSON in metadata file {metadata_path}: {e}"); return {}
    except Exception as e: logger.exception(f"Unexpected error reading metadata {metadata_path}: {e}"); return {}

# --- Main Dispatcher ---
# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_dependencies(file_path: str,
                         path_to_key_info: Dict[str, KeyInfo], # Changed from key_map
                         project_root: str,
                         file_analysis_results: Dict[str, Any],
                         threshold: float = 0.7) -> List[Tuple[str, str]]:
    """
    Suggest dependencies for a file, assigning appropriate characters, using contextual keys.

    Args:
        file_path: Path to the file to analyze
        path_to_key_info: Global map from normalized paths to KeyInfo objects.
        project_root: Root directory of the project
        file_analysis_results: Pre-computed analysis results for files
        threshold: Confidence threshold for *semantic* suggestions (0.0 to 1.0)
    Returns:
        List of (dependency_key_string, dependency_character) tuples
    """
    if not os.path.exists(file_path): logger.warning(f"File not found: {file_path}"); return []

    norm_path = normalize_path(file_path)
    file_ext = os.path.splitext(norm_path)[1].lower()

    # Pass path_to_key_info down
    if file_ext == '.py':
        return suggest_python_dependencies(norm_path, path_to_key_info, project_root, file_analysis_results, threshold)
    elif file_ext in ('.js', '.ts'):
        return suggest_javascript_dependencies(norm_path, path_to_key_info, project_root, file_analysis_results, threshold)
    elif file_ext in ('.md', '.rst'):
        config = ConfigManager()
        embeddings_dir_rel = config.get_path("embeddings_dir", "cline_utils/dependency_system/analysis/embeddings")
        embeddings_dir = normalize_path(os.path.join(project_root, embeddings_dir_rel))
        metadata_path = os.path.join(embeddings_dir, "metadata.json")
        return suggest_documentation_dependencies(norm_path, path_to_key_info, project_root, file_analysis_results, threshold, embeddings_dir, metadata_path)
    else:
        # Generic uses semantic only
        return suggest_generic_dependencies(norm_path, path_to_key_info, project_root, threshold)

# --- Tracker Type Specific Suggestion Logic ---

# <<< *** MODIFIED SIGNATURE *** >>>
def _identify_structural_dependencies(source_path: str, source_analysis: Dict[str, Any],
                                     path_to_key_info: Dict[str, KeyInfo], # Changed from key_map
                                     project_root: str) -> List[Tuple[str, str]]:
    """
    Identifies Python structural dependencies (calls, attributes, inheritance) using contextual keys.
    Returns list of tuples (dependency_key_string, dependency_character).
    """
    suggestions = []
    if not source_analysis: return []

    imports_data = source_analysis.get("imports", [])
    calls = source_analysis.get("calls", [])
    attributes = source_analysis.get("attribute_accesses", [])
    inheritance = source_analysis.get("inheritance", [])
    source_dir = os.path.dirname(source_path)
    # <<< *** REMOVED path_to_key *** >>>

    # --- Import map building (unchanged logic, resolves to paths) ---
    import_map_cache = {}
    def _build_import_map(current_source_path: str) -> Dict[str, str]:
        """ Parses a Python file and builds a map of imported names to their resolved module paths. """
        norm_source_path = normalize_path(current_source_path)
        if norm_source_path in import_map_cache: return import_map_cache[norm_source_path]
        local_import_map: Dict[str, str] = {} # name -> absolute_module_path
        try:
            with open(norm_source_path, 'r', encoding='utf-8') as f: content = f.read()
            tree = ast.parse(content, filename=norm_source_path)
            current_source_dir = os.path.dirname(norm_source_path)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        module_name = alias.name; imported_name = alias.asname or module_name
                        possible_paths = _convert_python_import_to_paths(module_name, current_source_dir, project_root)
                        if possible_paths: local_import_map[imported_name] = normalize_path(possible_paths[0])
                elif isinstance(node, ast.ImportFrom):
                    module_name = node.module or ""; level = node.level
                    base_dir_for_relative = current_source_dir
                    if level > 0:
                        for _ in range(level - 1): base_dir_for_relative = os.path.dirname(base_dir_for_relative)
                    full_module_name_for_path = module_name if level == 0 else (module_name or "")
                    resolve_from_dir = base_dir_for_relative if level > 0 else current_source_dir
                    possible_base_paths = _convert_python_import_to_paths(full_module_name_for_path, resolve_from_dir, project_root, is_from_import=True, relative_level=level)
                    if possible_base_paths:
                        resolved_base_path = normalize_path(possible_base_paths[0])
                        for alias in node.names:
                            original_name = alias.name; imported_name = alias.asname or original_name
                            local_import_map[imported_name] = resolved_base_path
        except Exception as e: logger.error(f"Error building import map for {norm_source_path}: {e}", exc_info=True)
        import_map_cache[norm_source_path] = local_import_map
        return local_import_map

    # Build the import map for the current source file
    import_map = _build_import_map(source_path)

    # --- Updated helper to resolve potential source name to key string ---
    resolved_cache = {}
    def _resolve_source_to_key_string(potential_source_name: Optional[str]) -> Optional[str]:
        """ Resolves a name to a module key string using the import map and path_to_key_info. """
        if not potential_source_name: return None
        cache_key = (source_path, potential_source_name)
        if cache_key in resolved_cache: return resolved_cache[cache_key]

        # Check the primary name part (e.g., 'os' in 'os.path.join', 'aliased_func' in 'aliased_func()')
        base_name = potential_source_name.split('.')[0]
        resolved_module_path = import_map.get(base_name) # Get path from import map

        found_key_string = None
        if resolved_module_path:
            # <<< *** Use path_to_key_info to get the key STRING *** >>>
            found_key_string = get_key_string_from_path(resolved_module_path, path_to_key_info)
            # if not found_key_string: logger.debug(...)

        resolved_cache[cache_key] = found_key_string
        return found_key_string
    # --- End Updated Helper ---

    # Get source key string once for logging/comparison
    # <<< *** MODIFIED key lookup *** >>>
    source_key_string = get_key_string_from_path(source_path, path_to_key_info)

    # Process Calls
    for call in calls:
        target_key_string = _resolve_source_to_key_string(call.get("potential_source"))
        if target_key_string and target_key_string != source_key_string:
            logger.debug(f"Suggesting {source_key_string} -> {target_key_string} (>) due to call: {call.get('target_name')}")
            suggestions.append((target_key_string, ">"))

    # Process Attribute Accesses
    for attr in attributes:
        target_key_string = _resolve_source_to_key_string(attr.get("potential_source"))
        if target_key_string and target_key_string != source_key_string:
            logger.debug(f"Suggesting {source_key_string} -> {target_key_string} (>) due to attr access: {attr.get('potential_source')}.{attr.get('target_name')}")
            suggestions.append((target_key_string, ">"))

    # Process Inheritance
    for inh in inheritance:
        target_key_string = _resolve_source_to_key_string(inh.get("potential_source"))
        if target_key_string and target_key_string != source_key_string:
            logger.debug(f"Suggesting {source_key_string} -> {target_key_string} (<) due to inheritance from: {inh.get('base_class_name')}")
            suggestions.append((target_key_string, "<"))

    return list(set(suggestions))

# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_python_dependencies(file_path: str,
                                path_to_key_info: Dict[str, KeyInfo], # Changed
                                project_root: str,
                                file_analysis_results: Dict[str, Any],
                                threshold: float) -> List[Tuple[str, str]]:
    """ Suggests dependencies for a Python file using contextual keys. """
    norm_file_path = normalize_path(file_path)
    analysis = file_analysis_results.get(norm_file_path)
    if analysis is None: logger.warning(f"No analysis results for {norm_file_path}"); return []
    if "error" in analysis or "skipped" in analysis: logger.info(f"Skipping sugg for {norm_file_path} due to analysis error/skip."); return []

    # 1. Explicit import dependency ('>')
    explicit_suggestions = []
    # Pass path_to_key_info down
    explicit_deps_paths = _identify_python_dependencies(norm_file_path, analysis, file_analysis_results, project_root, path_to_key_info)
    for dep_path, dep_type in explicit_deps_paths:
        # <<< *** MODIFIED key lookup *** >>>
        dep_key_string = get_key_string_from_path(dep_path, path_to_key_info)
        if dep_key_string:
            source_key_string = get_key_string_from_path(norm_file_path, path_to_key_info)
            if source_key_string and dep_key_string != source_key_string:
                logger.debug(f"Suggesting {source_key_string} -> {dep_key_string} ({dep_type}) due to explicit Python import.")
                explicit_suggestions.append((dep_key_string, dep_type))
        # else: logger.debug(...)

    # 2. Structural dependency ('>'/'<')
    structural_suggestions = _identify_structural_dependencies(norm_file_path, analysis, path_to_key_info, project_root)

    # 3. Semantic suggestions ('s'/'S')
    semantic_suggestions = suggest_semantic_dependencies(norm_file_path, path_to_key_info, project_root)

    # 4. Combine
    all_suggestions = explicit_suggestions + structural_suggestions + semantic_suggestions
    return _combine_suggestions_with_char_priority(all_suggestions)

# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_javascript_dependencies(file_path: str,
                                    path_to_key_info: Dict[str, KeyInfo], # Changed
                                    project_root: str,
                                    file_analysis_results: Dict[str, Any],
                                    threshold: float) -> List[Tuple[str, str]]:
    """ Suggests dependencies for a JS/TS file using contextual keys. """
    norm_file_path = normalize_path(file_path)
    analysis = file_analysis_results.get(norm_file_path)
    if analysis is None: logger.warning(f"No analysis results for {norm_file_path}"); return []

    explicit_suggestions = []
    # Pass path_to_key_info down
    explicit_deps_paths = _identify_javascript_dependencies(norm_file_path, analysis, file_analysis_results, project_root, path_to_key_info)
    for dep_path, dep_type in explicit_deps_paths:
        # <<< *** MODIFIED key lookup *** >>>
        dep_key_string = get_key_string_from_path(dep_path, path_to_key_info)
        if dep_key_string:
            source_key_string = get_key_string_from_path(norm_file_path, path_to_key_info)
            if source_key_string and dep_key_string != source_key_string:
                logger.debug(f"Suggesting {source_key_string} -> {dep_key_string} ({dep_type}) due to JS/TS import.")
                explicit_suggestions.append((dep_key_string, dep_type))
        # else: logger.debug(...)

    semantic_suggestions = suggest_semantic_dependencies(norm_file_path, path_to_key_info, project_root)
    return _combine_suggestions_with_char_priority(explicit_suggestions + semantic_suggestions)

# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_documentation_dependencies(file_path: str,
                                       path_to_key_info: Dict[str, KeyInfo], # Changed
                                       project_root: str,
                                       file_analysis_results: Dict[str, Any],
                                       threshold: float,
                                       embeddings_dir: str,
                                       metadata_path: str) -> List[Tuple[str, str]]:
    """ Suggests dependencies for a documentation file using contextual keys. """
    norm_file_path = normalize_path(file_path)
    analysis = file_analysis_results.get(norm_file_path)
    if analysis is None: logger.warning(f"Analysis results None for {norm_file_path}. Skipping."); return []
    if "error" in analysis: logger.warning(f"Analysis error for {norm_file_path}: {analysis['error']}. Skipping."); return []

    explicit_suggestions = []
    # Pass path_to_key_info down
    explicit_deps_paths = _identify_markdown_dependencies(norm_file_path, analysis, file_analysis_results, project_root, path_to_key_info)
    for dep_path, dep_type in explicit_deps_paths:
        # <<< *** MODIFIED key lookup *** >>>
        dep_key_string = get_key_string_from_path(dep_path, path_to_key_info)
        if dep_key_string:
            source_key_string = get_key_string_from_path(norm_file_path, path_to_key_info)
            if source_key_string and dep_key_string != source_key_string:
                logger.debug(f"Suggesting {source_key_string} -> {dep_key_string} ({dep_type}) due to Markdown link.")
                explicit_suggestions.append((dep_key_string, dep_type))
        # else: logger.debug(...)

    semantic_suggestions = suggest_semantic_dependencies(norm_file_path, path_to_key_info, project_root)
    return _combine_suggestions_with_char_priority(explicit_suggestions + semantic_suggestions)

# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_generic_dependencies(file_path: str,
                                 path_to_key_info: Dict[str, KeyInfo], # Changed
                                 project_root: str,
                                 threshold: float) -> List[Tuple[str, str]]:
    """ Suggests dependencies for a generic file (semantic only) using contextual keys. """
    norm_file_path = normalize_path(file_path)
    semantic_suggestions = suggest_semantic_dependencies(norm_file_path, path_to_key_info, project_root)
    return _combine_suggestions_with_char_priority(semantic_suggestions)


# --- Semantic Suggestion (Adapted) ---

# <<< *** MODIFIED SIGNATURE *** >>>
def suggest_semantic_dependencies(file_path: str,
                                  path_to_key_info: Dict[str, KeyInfo], # Changed
                                  project_root: str) -> List[Tuple[str, str]]:
    """
    Suggest dependencies based on semantic similarity using contextual keys.
    Assigns 's' or 'S' based on thresholds.

    Args:
        file_path: Path to the file (normalized)
        path_to_key_info: Global map from normalized paths to KeyInfo objects.
        project_root: Root directory of the project
    Returns:
        List of (dependency_key_string, character) tuples ('s' or 'S').
    """
    config = ConfigManager()
    embeddings_dir_rel = config.get_path("embeddings_dir", "cline_utils/dependency_system/analysis/embeddings")
    embeddings_dir = normalize_path(os.path.join(project_root, embeddings_dir_rel))
    if not os.path.exists(embeddings_dir): logger.warning(f"Embeddings directory not found at {embeddings_dir}. Cannot perform semantic analysis. Please run embedding generation."); return []

    # <<< *** MODIFIED key lookup and iteration *** >>>
    source_key_info = path_to_key_info.get(file_path) # file_path is already normalized
    if not source_key_info or source_key_info.is_directory: # Only compare files
        logger.debug(f"No file key info found or path is directory for semantic source: {file_path}")
        return []
    source_key_string = source_key_info.key_string

    suggested_dependencies = []
    # Iterate through all KeyInfo objects to find potential targets (files only)
    target_key_infos = [info for info in path_to_key_info.values() if not info.is_directory and info.key_string != source_key_string]

    # Get necessary context for calculate_similarity (unchanged)
    code_roots = config.get_code_root_directories()
    doc_roots = config.get_doc_directories()
    try: from .embedding_manager import calculate_similarity # Local import
    except ImportError: logger.error("Could not import calculate_similarity. Semantic suggestions disabled."); return []

    for target_key_info in target_key_infos:
        target_key_string = target_key_info.key_string
        # calculate_similarity likely needs key strings and potentially paths or config
        # Assuming calculate_similarity is adapted or accepts strings and handles lookup if needed
        try:
            # Pass necessary info to calculate_similarity.
            # If it needs paths, look them up: source_path = file_path, target_path = target_key_info.norm_path
            # If it needs key_map-like structure, we might need to build a temporary one for it.
            # For now, assume it primarily needs key strings and embeddings_dir.
            # *** We might need to adapt calculate_similarity later ***
            confidence = calculate_similarity(
                source_key_string,
                target_key_string,
                embeddings_dir,
                path_to_key_info, # Pass the full map in case it needs context
                project_root,
                code_roots,
                doc_roots
            )
        except Exception as e:
             logger.warning(f"Error calculating similarity between {source_key_string} and {target_key_string}: {e}")
             confidence = 0.0

        # --- Read thresholds from config ---
        threshold_S_strong = config.get_threshold("code_similarity")
        threshold_s_weak = config.get_threshold("doc_similarity")
        logger.debug(f"Raw confidence {source_key_string} -> {target_key_string}: {confidence:.4f}")

        # Determine character based on config thresholds
        assigned_char = None
        if confidence >= threshold_S_strong: assigned_char = 'S'; logger.debug(f"Suggesting {source_key_string} -> {target_key_string} ('S')...")
        elif confidence >= threshold_s_weak: assigned_char = 's'; logger.debug(f"Suggesting {source_key_string} -> {target_key_string} ('s')...")

        if assigned_char:
            suggested_dependencies.append((target_key_string, assigned_char))

    return suggested_dependencies

# --- Helper Functions ---

# _combine_suggestions_with_char_priority: No changes needed, works with key strings.
def _combine_suggestions_with_char_priority(suggestions: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    """
    Combine suggestions for the same target key, prioritizing based on character type.
    Priority order (highest first): '<', '>', 'x', 'd', 'S', 's', 'p'
    Handles merging '<' and '>' into 'x'.
    """
    combined: Dict[str, str] = {}
    config = ConfigManager()
    get_priority = config.get_char_priority
    for key, char in suggestions:
        if not key: continue
        current_char = combined.get(key); current_priority = get_priority(current_char) if current_char else -1
        new_priority = get_priority(char)
        if new_priority > current_priority:
            # New char has higher priority, overwrite
            logger.debug(f"Combining suggestions for target {key}: Choosing '{char}' (prio {new_priority}) over '{current_char}' (prio {current_priority}).")
            combined[key] = char
        elif new_priority == current_priority and char != current_char and current_char is not None:
            if {char, current_char} == {'<', '>'}:
                # Specific rule: < and > merge to x
                if combined.get(key) != 'x': # Avoid redundant logs/updates
                    logger.debug(f"Combining suggestions for target {key}: Conflict between '<' and '>'. Setting to 'x'.")
                    combined[key] = 'x'
            else:
                # Keep the existing character for other equal priority conflicts (arbitrary, but consistent)
                logger.debug(f"Combining suggestions for target {key}: Equal priority conflict between '{char}' and '{current_char}'. Keeping existing '{current_char}'.")
    return list(combined.items())


# --- Dependency Identification Helpers (Adapted) ---

# <<< *** MODIFIED SIGNATURE *** >>>
def _identify_python_dependencies(source_path: str, source_analysis: Dict[str, Any],
                                 file_analysis_results: Dict[str, Dict[str, Any]],
                                 project_root: str,
                                 path_to_key_info: Dict[str, KeyInfo] # Changed
                                 ) -> List[Tuple[str, str]]:
    """ Identifies Python import dependencies. Returns (abs_path, '>'). """
    dependencies = []
    imports = source_analysis.get("imports", [])
    source_dir = os.path.dirname(source_path)
    # <<< *** Use path_to_key_info keys for lookup *** >>>
    norm_file_analysis_keys = {normalize_path(k) for k in file_analysis_results.keys()} # Paths from analysis results
    tracked_paths_set = set(path_to_key_info.keys()) # Paths tracked by key manager

    for import_name_or_path in imports:
         possible_paths_abs = _convert_python_import_to_paths(import_name_or_path, source_dir, project_root)
         found = False
         for path_abs in possible_paths_abs:
             norm_path_abs = normalize_path(path_abs)
             # Check if the resolved path is tracked by the key manager
             if norm_path_abs in tracked_paths_set:
                 dependencies.append((norm_path_abs, ">"))
                 found = True
                 break
         # if not found: logger.debug(f"Could not resolve Python import '{import_name_or_path}' in {source_path} to a tracked file.")
    return list(set(dependencies))


def _convert_python_import_to_paths(import_name: str, source_dir: str, project_root: str, is_from_import: bool = False, relative_level: int = 0) -> List[str]:
    """
    Converts a Python import statement/module name to potential absolute file paths.
    Handles relative imports based on level.
    """
    potential_paths_abs = []
    normalized_project_root = normalize_path(project_root)
    normalized_source_dir = normalize_path(source_dir)

    # --- Handle Relative Imports ---
    if relative_level > 0:
        relative_module_part = import_name; level = relative_level; current_dir = normalized_source_dir
        for _ in range(level - 1):
            parent_dir = os.path.dirname(current_dir)
            if not parent_dir or parent_dir == current_dir or not parent_dir.startswith(normalized_project_root): current_dir = None; break
            current_dir = parent_dir
        if current_dir:
            if relative_module_part:
                module_path_part = relative_module_part.replace('.', os.sep); base_path = normalize_path(os.path.join(current_dir, module_path_part))
                potential_paths_abs.append(f"{base_path}.py"); potential_paths_abs.append(normalize_path(os.path.join(base_path, "__init__.py")))
            else: potential_paths_abs.append(normalize_path(os.path.join(current_dir, "__init__.py")))
    elif relative_level == 0 and import_name and not import_name.startswith('.'):
        module_path_part = import_name.replace('.', os.sep)
        # Check relative to project root(s) - consider multiple source roots if necessary?
        # For now, assume single project_root acts as the main source root.
        # TODO: Potentially check against all configured code_roots?
        base_path_in_proj = normalize_path(os.path.join(normalized_project_root, module_path_part))
        potential_paths_abs.append(f"{base_path_in_proj}.py"); potential_paths_abs.append(normalize_path(os.path.join(base_path_in_proj, "__init__.py")))
        try:
             spec = importlib.util.find_spec(import_name)
             if spec and spec.origin and spec.origin not in ('namespace', 'built-in', None):
                  origin_path = normalize_path(spec.origin)
                  if origin_path.endswith("__init__.py") or origin_path.endswith(".py"): potential_paths_abs.append(origin_path)
                  elif os.path.isdir(origin_path): potential_paths_abs.append(normalize_path(os.path.join(origin_path, "__init__.py")))
        except (ImportError, ValueError, ModuleNotFoundError, AttributeError): pass
    final_paths = [p_abs for p_abs in potential_paths_abs if p_abs.startswith(normalized_project_root)]
    return final_paths


def _identify_javascript_dependencies(source_path: str, source_analysis: Dict[str, Any],
                                    file_analyses: Dict[str, Dict[str, Any]], # Expects absolute paths as keys
                                    project_root: str,
                                    path_to_key_info: Dict[str, KeyInfo] # Changed
                                    ) -> List[Tuple[str, str]]:
    """ Identifies JS/TS import dependencies. Returns (abs_path, '>'). """
    dependencies = []; imports = source_analysis.get("imports", []); source_dir = os.path.dirname(source_path)
    js_extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    # <<< *** Use path_to_key_info keys for lookup *** >>>
    tracked_paths_set = set(path_to_key_info.keys())

    for import_path_str in imports:
        if not import_path_str or not (import_path_str.startswith('.') or import_path_str.startswith('/')) or \
           import_path_str.startswith('http:') or import_path_str.startswith('https:'): continue
        try:
            resolved_base = normalize_path(os.path.join(source_dir, import_path_str))
            possible_targets = []
            has_extension = any(import_path_str.lower().endswith(ext) for ext in js_extensions)
            if has_extension: possible_targets.append(resolved_base)
            else:
                 for ext in js_extensions: possible_targets.append(f"{resolved_base}{ext}")
                 for ext in js_extensions: possible_targets.append(normalize_path(os.path.join(resolved_base, f"index{ext}")))
            found = False
            for target_path_abs in possible_targets:
                norm_target_path = normalize_path(target_path_abs)
                # Check if tracked
                if norm_target_path in tracked_paths_set:
                    dependencies.append((norm_target_path, ">")); found = True; break # Found the dependency
            # if not found: logger.debug(f"Could not resolve JS/TS import '{import_path_str}' in {source_path} to a tracked file. Tried: {possible_targets}")
        except Exception as e: logger.error(f"Error resolving JS import '{import_path_str}' in {source_path}: {e}")
    return list(set(dependencies))

# <<< *** MODIFIED SIGNATURE *** >>>
def _identify_markdown_dependencies(source_path: str, source_analysis: Dict[str, Any],
                                  file_analyses: Dict[str, Dict[str, Any]],
                                  project_root: str,
                                  path_to_key_info: Dict[str, KeyInfo] # Changed
                                  ) -> List[Tuple[str, str]]:
    """ Identifies Markdown link dependencies. Returns (abs_path, 'd'). """
    dependencies = []; links = source_analysis.get("links", []); source_dir = os.path.dirname(source_path)
    # <<< *** Use path_to_key_info keys for lookup *** >>>
    tracked_paths_set = set(path_to_key_info.keys())

    for link in links:
        url = link.get("url", "")
        if not url or url.startswith('#') or ('://' in url) or (url.startswith('//')) or \
           (url.startswith('mailto:')) or (url.startswith('tel:')): continue
        try:
            url_cleaned = url.split('#')[0].split('?')[0]
            if not url_cleaned: continue
            resolved_path_abs = normalize_path(os.path.join(source_dir, url_cleaned))
            possible_targets = [resolved_path_abs]
            if not os.path.splitext(resolved_path_abs)[1]:
                possible_targets.append(resolved_path_abs + ".md"); possible_targets.append(resolved_path_abs + ".rst")
                possible_targets.append(normalize_path(os.path.join(resolved_path_abs, "index.md")))
                possible_targets.append(normalize_path(os.path.join(resolved_path_abs, "README.md")))
            found = False
            for target_path in possible_targets:
                 norm_target_path = normalize_path(target_path)
                 # Check if tracked
                 if norm_target_path in tracked_paths_set:
                     dependencies.append((norm_target_path, "d")); found = True; break
            # if not found: logger.debug(f"Could not resolve MD link '{url}' in {source_path} to a tracked file. Tried: {possible_targets}")
        except Exception as e: logger.error(f"Error resolving MD link '{url}' in {source_path}: {e}")
    return list(set(dependencies))

# <<< *** MODIFIED SIGNATURE *** >>>
def _identify_html_dependencies(source_path: str, source_analysis: Dict[str, Any],
                              file_analyses: Dict[str, Dict[str, Any]],
                              project_root: str,
                              path_to_key_info: Dict[str, KeyInfo] # Changed
                              ) -> List[Tuple[str, str]]:
    """ Identifies HTML dependencies. Returns various chars. """
    dependencies = []; links = source_analysis.get("links", []); scripts = source_analysis.get("scripts", [])
    stylesheets = source_analysis.get("stylesheets", []); images = source_analysis.get("images", [])
    source_dir = os.path.dirname(source_path)
    # <<< *** Use path_to_key_info keys for lookup *** >>>
    tracked_paths_set = set(path_to_key_info.keys())

    urls_to_check = []
    for link in links: urls_to_check.append((link.get("href"), "link"))
    for script in scripts: urls_to_check.append((script.get("src"), "script"))
    for style in stylesheets: urls_to_check.append((style.get("href"), "style"))
    for img in images: urls_to_check.append((img.get("src"), "image"))

    for url, resource_type in urls_to_check:
        if not url or url.startswith('#') or ('://' in url) or (url.startswith('//')) or \
           (url.startswith('mailto:')) or (url.startswith('tel:')) or url.startswith('data:'): continue
        try:
            url_cleaned = url.split('#')[0].split('?')[0]
            if not url_cleaned: continue
            resolved_path_abs = normalize_path(os.path.join(source_dir, url_cleaned))
            norm_resolved_path = normalize_path(resolved_path_abs)
            # Check if tracked
            if norm_resolved_path in tracked_paths_set:
                 dep_type = ">"; reason = f"HTML {resource_type} resource"
                 target_ext = os.path.splitext(norm_resolved_path)[1].lower()
                 if resource_type == "style" or target_ext == '.css': dep_type = 'd'; reason = "HTML stylesheet link"
                 elif resource_type == "script" or target_ext in ['.js', '.ts', '.mjs']: dep_type = '>'; reason = "HTML script link"
                 elif resource_type == "link" and target_ext in ['.html', '.htm']: dep_type = 'd'; reason = "HTML link to another HTML doc"
                 elif resource_type == "link" and target_ext in ['.md', '.rst']: dep_type = 'd'; reason = "HTML link to documentation"

                 # <<< *** MODIFIED key lookup *** >>>
                 src_key = get_key_string_from_path(source_path, path_to_key_info)
                 tgt_key = get_key_string_from_path(norm_resolved_path, path_to_key_info)
                 if src_key and tgt_key and src_key != tgt_key:
                    logger.debug(f"Suggesting {src_key} -> {tgt_key} ({dep_type}) due to {reason} ('{url}').")
                    dependencies.append((norm_resolved_path, dep_type))
                 else:
                    logger.warning(f"Could not map keys for HTML dependency: {source_path} -> {norm_resolved_path}")
            # else: logger.debug(f"Could not resolve HTML resource '{url}' in {source_path} to a tracked file. Tried: {norm_resolved_path}")
        except Exception as e: logger.error(f"Error resolving HTML resource '{url}' in {source_path}: {e}")
    return list(set(dependencies))

# <<< *** MODIFIED SIGNATURE *** >>>
def _identify_css_dependencies(source_path: str, source_analysis: Dict[str, Any],
                             file_analyses: Dict[str, Dict[str, Any]],
                             project_root: str,
                             path_to_key_info: Dict[str, KeyInfo] # Changed
                             ) -> List[Tuple[str, str]]:
    """ Identifies CSS @import dependencies. Returns (abs_path, '>'). """
    dependencies = []; imports = source_analysis.get("imports", []); source_dir = os.path.dirname(source_path)
    # <<< *** Use path_to_key_info keys for lookup *** >>>
    tracked_paths_set = set(path_to_key_info.keys())

    for import_item in imports:
        url = import_item.get("url", "")
        if not url or url.startswith('#') or ('://' in url) or (url.startswith('//')) or url.startswith('data:'): continue
        try:
            url_cleaned = url.split('#')[0].split('?')[0]
            if not url_cleaned: continue
            resolved_path_abs = normalize_path(os.path.join(source_dir, url_cleaned))
            norm_resolved_path = normalize_path(resolved_path_abs)
            # Check if tracked
            if norm_resolved_path in tracked_paths_set:
                 # <<< *** MODIFIED key lookup *** >>>
                 src_key = get_key_string_from_path(source_path, path_to_key_info)
                 tgt_key = get_key_string_from_path(norm_resolved_path, path_to_key_info)
                 if src_key and tgt_key and src_key != tgt_key:
                     logger.debug(f"Suggesting {src_key} -> {tgt_key} (>) due to CSS @import ('{url}').")
                     dependencies.append((norm_resolved_path, ">")) # Assign '>'
                 else:
                    logger.warning(f"Could not map keys for CSS dependency: {source_path} -> {norm_resolved_path}")
            # else: logger.debug(f"Could not resolve CSS import '{url}' in {source_path} to a tracked file. Tried: {norm_resolved_path}")
        except Exception as e:
             logger.error(f"Error resolving CSS import '{url}' in {source_path}: {e}")
    return list(set(dependencies))

# --- Other Helpers ---

def extract_function_calls(source_content: str, source_type: str) -> List[str]:
    """Extracts function calls from source code. (Mainly for potential future use)"""
    function_calls = []
    if source_type == "py":
        try:
            tree = ast.parse(source_content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    func = node.func
                    call_name = None
                    # Extract names from simple calls (name()) and attribute calls (obj.name())
                    if isinstance(func, ast.Name):
                         call_name = func.id
                    elif isinstance(func, ast.Attribute):
                         # Could try to resolve func.value here to get the object type if needed
                         call_name = func.attr # Just get the attribute name being called
                    # Add more complex cases like calls on subscript results etc. if needed
                    if call_name:
                        function_calls.append(call_name)
        except SyntaxError:
            logger.warning("Syntax error extracting Python function calls")
    elif source_type == "js":
        # Regex-based extraction for JS (can be less precise than AST)
        # Matches function calls like func(), obj.func(), possibly new Class()
        # Avoids matching keywords like if(), for(), while() etc.
        func_call_pattern = re.compile(r'(?:[a-zA-Z0-9_$]\s*\.\s*)?([a-zA-Z_$][\w$]*)\s*\(')
        matches = func_call_pattern.findall(source_content)
        # Common JS keywords that look like function calls but aren't (or aren't relevant here)
        keywords = {'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'instanceof', 'delete', 'void', 'super', 'this'}
        # Also filter constructor calls starting with uppercase? Might be too restrictive.
        function_calls = [match for match in matches if match not in keywords]

    return list(set(function_calls))


def suggest_initial_dependencies(key_map: Dict[str, str]) -> Dict[str, List[Tuple[str, str]]]:
    """DEPRECATED: Suggest initial dependencies. Grid initialization handles placeholders."""
    # logger.warning("suggest_initial_dependencies is deprecated. Grid initialization handles this.")
    return defaultdict(list)

# End of file