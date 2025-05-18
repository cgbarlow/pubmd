# analysis/project_analyzer.py

from collections import defaultdict
import fnmatch
import json
import os
from typing import Any, Dict, Optional, List, Tuple
# from cline_utils.dependency_system.core.dependency_grid import decompress
from cline_utils.dependency_system.io import tracker_io
from cline_utils.dependency_system.core import key_manager

import logging
from cline_utils.dependency_system.analysis.dependency_analyzer import analyze_file
from cline_utils.dependency_system.utils.batch_processor import BatchProcessor, process_items
from cline_utils.dependency_system.analysis.dependency_suggester import suggest_dependencies
from cline_utils.dependency_system.analysis.embedding_manager import generate_embeddings
from cline_utils.dependency_system.utils.cache_manager import cached, file_modified, clear_all_caches
from cline_utils.dependency_system.utils.config_manager import ConfigManager
from cline_utils.dependency_system.utils.path_utils import is_subpath, normalize_path, get_project_root
from cline_utils.dependency_system.utils.template_generator import generate_final_review_checklist
from cline_utils.dependency_system.utils.visualize_dependencies import generate_mermaid_diagram

logger = logging.getLogger(__name__)

# Type alias from tracker_io
PathMigrationInfo = Dict[str, Tuple[Optional[str], Optional[str]]]

# Caching for analyze_project (Consider if key_func needs more refinement)
# @cached("project_analysis",
#        key_func=lambda force_analysis=False, force_embeddings=False, **kwargs:
#        f"analyze_project:{normalize_path(get_project_root())}:{(os.path.getmtime(ConfigManager().config_path) if os.path.exists(ConfigManager().config_path) else 0)}:{force_analysis}:{force_embeddings}")
def analyze_project(force_analysis: bool = False, force_embeddings: bool = False) -> Dict[str, Any]:
    """
    Analyzes all files in a project to identify dependencies between them,
    initialize trackers, suggest dependencies using the new contextual key system,
    and generate relevant project templates like the final review checklist.
    Also auto-generates dependency diagrams if enabled.

    Args:
        force_analysis: Bypass cache and force reanalysis of files
        force_embeddings: Force regeneration of embeddings
    Returns:
        Dictionary containing project-wide analysis results and status
    """
    # --- Initial Setup ---
    config = ConfigManager()
    project_root = get_project_root()
    logger.info(f"Starting project analysis in directory: {project_root}")

    analyzer_batch_processor = BatchProcessor() # Define if used, otherwise remove
    if force_analysis: logger.info("Force analysis requested. Clearing all caches."); clear_all_caches()
    analysis_results: Dict[str, Any] = { # Use analysis_results for consistency
        "status": "success", "message": "",
        "warnings": [], # Add a warnings list
        "tracker_initialization": {},
        "embedding_generation": {},
        "dependency_suggestion": {},
        "tracker_update": {},
        "file_analysis": {},
        "template_generation": {},
        "auto_visualization": {}
    }
    excluded_dirs_rel = config.get_excluded_dirs(); excluded_paths_rel = config.get_excluded_paths(); excluded_extensions = set(config.get_excluded_extensions()); excluded_file_patterns_config = config.config.get("excluded_file_patterns", [])
    excluded_dirs_abs_set = {normalize_path(os.path.join(project_root, p)) for p in excluded_dirs_rel}; all_excluded_paths_abs_set = set(excluded_paths_rel).union(excluded_dirs_abs_set)
    norm_project_root = normalize_path(project_root)
    # Check if norm_project_root itself is excluded by checking if it starts with or equals any excluded path
    if any(norm_project_root == excluded_path or norm_project_root.startswith(excluded_path + os.sep)
           for excluded_path in all_excluded_paths_abs_set):
        logger.info(f"Skipping analysis of excluded project root: {project_root}"); analysis_results["status"] = "skipped"; analysis_results["message"] = "Project root is excluded"; return analysis_results

    # --- Root Directories Setup ---
    code_root_directories_rel = config.get_code_root_directories()
    doc_directories_rel = config.get_doc_directories()
    all_roots_rel = sorted(list(set(code_root_directories_rel + doc_directories_rel)))
    abs_code_roots = {normalize_path(os.path.join(project_root, r)) for r in code_root_directories_rel}; abs_doc_roots = {normalize_path(os.path.join(project_root, r)) for r in doc_directories_rel}; abs_all_roots = {normalize_path(os.path.join(project_root, r)) for r in all_roots_rel}

    old_map_existed_before_gen = False
    try:
        # Determine the expected path for the old map file RELATIVE to key_manager.py
        # Use the imported key_manager module to find its location
        key_manager_dir = os.path.dirname(os.path.abspath(key_manager.__file__))
        old_map_path = normalize_path(os.path.join(key_manager_dir, key_manager.OLD_GLOBAL_KEY_MAP_FILENAME))
        old_map_existed_before_gen = os.path.exists(old_map_path)
        if old_map_existed_before_gen:
            logger.info(f"Found existing '{key_manager.OLD_GLOBAL_KEY_MAP_FILENAME}' before key generation. Grid migration will prioritize it.")
        else:
            logger.info(f"'{key_manager.OLD_GLOBAL_KEY_MAP_FILENAME}' not found before key generation. Grid migration will use tracker definitions as fallback.")
    except Exception as path_err:
        logger.error(f"Error determining path or checking existence of old key map file: {path_err}. Assuming it didn't exist.")
        old_map_existed_before_gen = False

    # --- Key Generation ---
    logger.info("Generating/Regenerating keys...")
    path_to_key_info: Dict[str, key_manager.KeyInfo] = {}
    newly_generated_keys: List[key_manager.KeyInfo] = []
    try:
        # Call generate_keys using the module reference
        path_to_key_info, newly_generated_keys = key_manager.generate_keys(
            all_roots_rel,
            excluded_dirs=excluded_dirs_rel,
            excluded_extensions=excluded_extensions,
            precomputed_excluded_paths=all_excluded_paths_abs_set
        )
        analysis_results["tracker_initialization"]["key_generation"] = "success"
        logger.info(f"Generated {len(path_to_key_info)} keys for {len(path_to_key_info)} files/dirs.")
        if newly_generated_keys: logger.info(f"Assigned {len(newly_generated_keys)} new keys.")
    except key_manager.KeyGenerationError as kge:
        analysis_results["status"] = "error"; analysis_results["message"] = f"Key generation failed: {kge}"; logger.critical(analysis_results["message"]); return analysis_results
    except Exception as e:
        analysis_results["status"] = "error"; analysis_results["message"] = f"Key generation failed unexpectedly: {e}"; logger.exception(analysis_results["message"]); return analysis_results

    # --- Build Path Migration Map (Early, after new keys are generated) ---
    logger.info("Building path migration map for analysis and updates...")
    old_global_map = key_manager.load_old_global_key_map() # Load old map (can be None)
    path_migration_info: PathMigrationInfo
    try:
        path_migration_info = tracker_io._build_path_migration_map(old_global_map, path_to_key_info)
    except ValueError as ve:
         logger.critical(f"Failed to build migration map during analysis: {ve}. Downstream functions may fail.")
         analysis_results["status"] = "error"; analysis_results["message"] = f"Migration map build failed: {ve}"; return analysis_results
    except Exception as e:
         logger.critical(f"Unexpected error building migration map during analysis: {e}. Downstream functions may fail.", exc_info=True)
         analysis_results["status"] = "error"; analysis_results["message"] = f"Migration map build error: {e}"; return analysis_results


    # --- File Identification and Filtering ---
    logger.info("Identifying files for analysis...")
    files_to_analyze_abs = []
    for abs_root_dir in abs_all_roots:
        if not os.path.isdir(abs_root_dir):
            logger.warning(f"Configured root directory not found: {abs_root_dir}")
            continue
        # Use os.walk - order within walk is OS-dependent but shouldn't affect analysis analysis_results
        for root, dirs, files in os.walk(abs_root_dir, topdown=True):
            norm_root = normalize_path(root)
            dirs[:] = [d for d in dirs if d not in excluded_dirs_rel and normalize_path(os.path.join(norm_root, d)) not in all_excluded_paths_abs_set]
            is_root_excluded_by_path = False
            if norm_root in all_excluded_paths_abs_set or \
               any(is_subpath(norm_root, excluded) for excluded in all_excluded_paths_abs_set):
                 is_root_excluded_by_path = True
            if is_root_excluded_by_path:
                dirs[:] = []; continue
            for file_name in files:
                file_path_abs = normalize_path(os.path.join(norm_root, file_name))
                file_basename = os.path.basename(file_path_abs) # Use file_name directly
                _, file_ext = os.path.splitext(file_name)
                file_ext = file_ext.lower()
                # Check all exclusion criteria
                is_excluded = (
                    file_path_abs in all_excluded_paths_abs_set
                    or any(is_subpath(file_path_abs, excluded) for excluded in all_excluded_paths_abs_set)
                    or file_ext in excluded_extensions
                    or any(fnmatch.fnmatch(file_basename, pattern) for pattern in excluded_file_patterns_config)
                )
                if is_excluded:
                    logger.debug(f"Skipping excluded file: {file_path_abs}")
                    continue
                if file_path_abs in path_to_key_info:
                    files_to_analyze_abs.append(file_path_abs)
                else:
                    logger.warning(f"File found but no key generated: {file_path_abs}")
    logger.info(f"Found {len(files_to_analyze_abs)} files to analyze.")

    # --- File Analysis ---
    logger.info("Starting file analysis...")
    # Use process_items for potential parallelization
    # Pass force_analysis flag down to analyze_file if caching is implemented there
    analysis_results_list = process_items(
        files_to_analyze_abs,
        analyze_file,
        force=force_analysis
    )
    file_analysis_results: Dict[str, Any] = {}
    analyzed_count, skipped_count, error_count = 0, 0, 0
    for file_path_abs, analysis_result in zip(files_to_analyze_abs, analysis_results_list):
        if analysis_result:
            if "error" in analysis_result: logger.warning(f"Analysis error for {file_path_abs}: {analysis_result['error']}"); error_count += 1
            elif "skipped" in analysis_result: skipped_count += 1
            else: file_analysis_results[file_path_abs] = analysis_result; analyzed_count += 1
        else: logger.warning(f"Analysis returned no result for {file_path_abs}"); error_count += 1
    analysis_results["file_analysis"] = file_analysis_results
    logger.info(f"File analysis complete. Analyzed: {analyzed_count}, Skipped: {skipped_count}, Errors: {error_count}")

    # --- Create file_to_module mapping (Adapted for path_to_key_info) ---
    # Maps normalized absolute file path -> normalized absolute parent directory path (module path)
    logger.info("Creating file-to-module mapping...")
    file_to_module: Dict[str, str] = {}
    # Iterate through all the generated key information from path_to_key_info
    for key_info_obj in path_to_key_info.values(): # Iterate over KeyInfo objects
        # We only care about mapping files
        if not key_info_obj.is_directory:
            # Ensure the file has a parent path recorded
            if key_info_obj.parent_path:
                file_path = key_info_obj.norm_path
                module_path = key_info_obj.parent_path # Direct parent directory path
                file_to_module[file_path] = module_path
                logger.debug(f"Mapped file '{file_path}' to module '{module_path}'") # Optional debug log

            else:
                logger.warning(f"File '{key_info_obj.norm_path}' (Key: {key_info_obj.key_string}) has no parent path in KeyInfo. Cannot map to a module.")
    logger.info(f"File-to-module mapping created with {len(file_to_module)} entries.")

    # --- Embedding generation ---
    logger.info("Starting embedding generation...")
    try:
        # Pass path_to_key_info instead of key_map
        success = generate_embeddings(all_roots_rel, path_to_key_info, force=force_embeddings)
        analysis_results["embedding_generation"]["status"] = "success" if success else "partial_failure"
        if not success: analysis_results["warnings"].append("Embedding generation failed for some paths."); logger.warning("Embedding generation failed or skipped for some paths.")
        else: logger.info("Embedding generation completed successfully.")
    except Exception as e:
        analysis_results["embedding_generation"]["status"] = "error"
        analysis_results["status"] = "error" # Upgrade status to error if embedding process fails critically
        analysis_results["message"] = f"Embedding generation process failed critically: {e}"
        logger.exception(analysis_results["message"]); return analysis_results

    # --- Dependency Suggestion ---
    logger.info("Starting dependency suggestion...")
    try:
        # Start with initial suggestions (e.g., from key generation if any)
        # Use defaultdict for easier merging
        all_suggestions: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
        suggestion_count = 0
        # Use list of keys corresponding to analyzed files
        analyzed_file_paths = list(file_analysis_results.keys())
        # Use configured threshold for doc_similarity
        doc_similarity_threshold = config.get_threshold("doc_similarity")
        for file_path_abs in analyzed_file_paths:
            file_key_info = path_to_key_info.get(file_path_abs)
            if not file_key_info:
                logger.warning(f"No key info found for analyzed file {file_path_abs}, skipping suggestion.")
                continue
            file_key_string = file_key_info.key_string # Get the actual key string
            # Pass path_to_key_info instead of key_map
            suggestions_for_file = suggest_dependencies(
                file_path_abs, path_to_key_info, project_root,
                file_analysis_results, threshold=doc_similarity_threshold
            )
            if suggestions_for_file:
                # Suggestions are returned as (target_key_string, dep_char)
                all_suggestions[file_key_string].extend(suggestions_for_file)
                suggestion_count += len(suggestions_for_file)
        logger.info(f"Generated {suggestion_count} raw suggestions from file analysis.")

        # --- Combine suggestions within each source key using priority ---
        # This step is crucial before adding reciprocal ones
        logger.debug("Combining suggestions per source key using priorities...")
        combined_suggestions_per_source: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
        # Import helper here to avoid potential circular dependencies at module level
        from cline_utils.dependency_system.analysis.dependency_suggester import _combine_suggestions_with_char_priority
        for source_key, suggestion_list in all_suggestions.items():
             combined_suggestions_per_source[source_key] = _combine_suggestions_with_char_priority(suggestion_list)
        all_suggestions = combined_suggestions_per_source # Replace raw with combined
        analysis_results["dependency_suggestion"]["status"] = "success"
        logger.info("Dependency suggestion combining completed.")
    except Exception as e:
        analysis_results["status"] = "error"; analysis_results["message"] = f"Dependency suggestion failed critically: {e}"; logger.exception(analysis_results["message"]); return analysis_results

    # --- Update Trackers ---
    logger.info("Updating trackers...")
    # --- Update Mini Trackers FIRST ---
    analysis_results["tracker_update"]["mini"] = {}
    mini_tracker_paths_updated = set() # Track paths to avoid duplicates if structure overlaps

    potential_mini_tracker_dirs: Dict[str, key_manager.KeyInfo] = {}
    for code_root_abs in abs_code_roots:
        for path, key_info_obj in path_to_key_info.items(): # Iterate over KeyInfo objects
            if key_info_obj.is_directory and key_info_obj.parent_path == code_root_abs:
               potential_mini_tracker_dirs[path] = key_info_obj
            elif key_info_obj.is_directory and path == code_root_abs:
                 potential_mini_tracker_dirs[path] = key_info_obj

    logger.info(f"Identified {len(potential_mini_tracker_dirs)} potential directories for mini-trackers.")

    # Iterate through the identified module paths
    for norm_module_path, module_key_info_obj in potential_mini_tracker_dirs.items(): # Iterate over KeyInfo objects
        module_key_string = module_key_info_obj.key_string # Get key string for logging if needed
        # Check if directory is NOT empty before trying to update/create tracker
        if os.path.isdir(norm_module_path) and not _is_empty_dir(norm_module_path):
            if norm_module_path in mini_tracker_paths_updated: continue # Skip if already processed
            mini_tracker_path = tracker_io.get_tracker_path(project_root, tracker_type="mini", module_path=norm_module_path)
            logger.info(f"Updating mini tracker for module '{norm_module_path}' (Key: {module_key_string}) at: {mini_tracker_path}")
            mini_tracker_paths_updated.add(norm_module_path)
            try:
                # Update the mini-tracker. Suggestions are applied internally by update_tracker.
                # Pass the GLOBAL suggestions here. update_tracker will filter them based on the module.
                tracker_io.update_tracker(
                    output_file_suggestion=mini_tracker_path,
                    path_to_key_info=path_to_key_info, # Pass the main map
                    tracker_type="mini",
                    suggestions=all_suggestions, # Pass combined & reciprocal suggestions (keyed by key strings)
                    file_to_module=file_to_module,
                    new_keys=newly_generated_keys, # Pass list of KeyInfo objects
                    force_apply_suggestions=False,
                    use_old_map_for_migration=old_map_existed_before_gen
                )
                analysis_results["tracker_update"]["mini"][norm_module_path] = "success"
            except Exception as mini_err:
                 logger.error(f"Error updating mini tracker {mini_tracker_path}: {mini_err}", exc_info=True)
                 analysis_results["tracker_update"]["mini"][norm_module_path] = "failure"; analysis_results["status"] = "warning"
        elif os.path.isdir(norm_module_path): logger.debug(f"Skipping mini-tracker update for empty directory: {norm_module_path}")

    # --- Update Doc Tracker ---
    doc_tracker_path = tracker_io.get_tracker_path(project_root, tracker_type="doc") if doc_directories_rel else None
    if doc_tracker_path:
        logger.info(f"Updating doc tracker: {doc_tracker_path}")
        try:
            tracker_io.update_tracker(
                output_file_suggestion=doc_tracker_path, path_to_key_info=path_to_key_info,
                tracker_type="doc", suggestions=all_suggestions, file_to_module=file_to_module,
                new_keys=newly_generated_keys, force_apply_suggestions=False,
                use_old_map_for_migration=old_map_existed_before_gen
            )
            analysis_results["tracker_update"]["doc"] = "success"
        except Exception as doc_err:
            logger.error(f"Error updating doc tracker {doc_tracker_path}: {doc_err}", exc_info=True)
            analysis_results["tracker_update"]["doc"] = "failure"; analysis_results["status"] = "warning"

    # --- Update Main Tracker LAST (using aggregation) ---
    main_tracker_path = tracker_io.get_tracker_path(project_root, tracker_type="main")
    logger.info(f"Updating main tracker (with aggregation): {main_tracker_path}")
    try:
        # update_tracker for "main" will call the aggregation function internally.
        # Aggregation needs path_to_key_info and file_to_module.
        tracker_io.update_tracker(
            output_file_suggestion=main_tracker_path, path_to_key_info=path_to_key_info,
            tracker_type="main", suggestions=None, file_to_module=file_to_module,
            new_keys=newly_generated_keys, force_apply_suggestions=False,
            use_old_map_for_migration=old_map_existed_before_gen
        )
        analysis_results["tracker_update"]["main"] = "success"
    except Exception as main_err:
        logger.error(f"Error updating main tracker {main_tracker_path}: {main_err}", exc_info=True)
        analysis_results["tracker_update"]["main"] = "failure"; analysis_results["status"] = "warning"

    # --- Template Generation ---
    logger.info("Starting template generation (e.g., final review checklist)...")
    try:
        # Pass the pre-computed current global map and path migration map
        checklist_generated_successfully = generate_final_review_checklist(
            global_key_map_param=path_to_key_info,
            path_migration_info_param=path_migration_info
        )
        if checklist_generated_successfully:
            analysis_results["template_generation"]["final_review_checklist"] = "success"
            logger.info("Final review checklist generated successfully.")
        else:
            analysis_results["template_generation"]["final_review_checklist"] = "failure"
            logger.warning("Final review checklist generation failed. Check logs for details.")
            if analysis_results["status"] == "success":
                 analysis_results["status"] = "warning"; analysis_results["message"] += " Warning: Failed to generate final review checklist."
    except Exception as template_err:
        analysis_results["template_generation"]["final_review_checklist"] = "error"
        logger.error(f"Critical error during template generation: {template_err}", exc_info=True)
        if analysis_results["status"] == "success": analysis_results["status"] = "warning"
        analysis_results["message"] += f" Critical error during template generation: {template_err}."

    # --- Auto Diagram Generation ---
    auto_generate_enabled = config.config.get("visualization", {}).get("auto_generate_on_analyze", True)
    if auto_generate_enabled:
        logger.info("Starting automatic diagram generation...")
        analysis_results["auto_visualization"] = {"overview": "skipped", "modules": {}}
        memory_dir_rel_analyzer = config.get_path('memory_dir', 'cline_docs')
        default_diagram_subdir = "dependency_diagrams"
        default_auto_diagram_dir_abs = normalize_path(os.path.join(project_root, memory_dir_rel_analyzer, default_diagram_subdir))
        auto_diagram_output_dir_config_rel = config.config.get("visualization", {}).get("auto_diagram_output_dir") # Check if user set a path

        if auto_diagram_output_dir_config_rel:
            auto_diagram_output_dir_abs = normalize_path(os.path.join(project_root, auto_diagram_output_dir_config_rel))
            logger.info(f"Using configured auto diagram output directory: {auto_diagram_output_dir_abs}")
        else:
            auto_diagram_output_dir_abs = default_auto_diagram_dir_abs
            logger.info(f"Using default auto diagram output directory: {auto_diagram_output_dir_abs}")

        try:
            if not os.path.exists(auto_diagram_output_dir_abs):
                os.makedirs(auto_diagram_output_dir_abs, exist_ok=True)

            # Find all tracker paths *again* here, as they might have just been created/updated
            current_tracker_paths = tracker_io.find_all_tracker_paths(config, project_root)

            # --- Generate Project Overview Diagram ---
            logger.info("Generating project overview diagram...")
            overview_filename = "project_overview_dependencies.mermaid"
            overview_path = os.path.join(auto_diagram_output_dir_abs, overview_filename)
            # Pass path_migration_info to generate_mermaid_diagram
            overview_mermaid_code = generate_mermaid_diagram(
                focus_keys_list=[], global_path_to_key_info_map=path_to_key_info,
                path_migration_info=path_migration_info, # Pass the map
                all_tracker_paths_list=list(current_tracker_paths), config_manager_instance=config
            )
            if overview_mermaid_code and "// No relevant data" not in overview_mermaid_code and "Error:" not in overview_mermaid_code[:20]:
                with open(overview_path, 'w', encoding='utf-8') as f: f.write(overview_mermaid_code)
                logger.info(f"Project overview diagram saved to {overview_path}")
                analysis_results["auto_visualization"]["overview"] = "success"
            else:
                logger.warning(f"Skipping save for project overview diagram (no data or failed generation). Error: {overview_mermaid_code if overview_mermaid_code and 'Error:' in overview_mermaid_code[:20] else 'No data'}")
                analysis_results["auto_visualization"]["overview"] = "nodata_or_failed"

            # --- Generate Per-Module Diagrams ---
            module_keys_to_visualize = []
            for key_info_obj_analyzer in path_to_key_info.values():
                if key_info_obj_analyzer.is_directory:
                    is_top_level_module_dir_analyzer = False
                    for acr_path_analyzer in abs_code_roots: # abs_code_roots defined earlier
                        if key_info_obj_analyzer.norm_path == acr_path_analyzer: is_top_level_module_dir_analyzer = True; break
                        if key_info_obj_analyzer.parent_path == acr_path_analyzer: is_top_level_module_dir_analyzer = True; break
                    if is_top_level_module_dir_analyzer:
                         module_keys_to_visualize.append(key_info_obj_analyzer.key_string)

            module_keys_unique = sorted(list(set(module_keys_to_visualize)))
            logger.info(f"Identified module keys for auto-visualization: {module_keys_unique}")
            analysis_results["auto_visualization"]["modules"] = {mk: "skipped" for mk in module_keys_unique} # Initialize module status

            for module_key_str in module_keys_unique:
                logger.info(f"Generating diagram for module: {module_key_str}...")
                module_diagram_filename = f"module_{module_key_str}_dependencies.mermaid".replace("/", "_").replace("\\", "_")
                module_diagram_path = os.path.join(auto_diagram_output_dir_abs, module_diagram_filename)
                # Pass path_migration_info here as well
                module_mermaid_code = generate_mermaid_diagram(
                    focus_keys_list=[module_key_str], global_path_to_key_info_map=path_to_key_info,
                    path_migration_info=path_migration_info, # Pass the map
                    all_tracker_paths_list=list(current_tracker_paths), config_manager_instance=config
                )
                if module_mermaid_code and "// No relevant data" not in module_mermaid_code and "Error:" not in module_mermaid_code[:20]:
                    with open(module_diagram_path, 'w', encoding='utf-8') as f: f.write(module_mermaid_code)
                    logger.info(f"Module {module_key_str} diagram saved to {module_diagram_path}")
                    analysis_results["auto_visualization"]["modules"][module_key_str] = "success"
                else:
                    logger.warning(f"Skipping save for module {module_key_str} diagram (no data or failed generation). Error: {module_mermaid_code if module_mermaid_code and 'Error:' in module_mermaid_code[:20] else 'No data'}")
                    analysis_results["auto_visualization"]["modules"][module_key_str] = "nodata_or_failed"
        except Exception as viz_err:
            logger.error(f"Error during automatic diagram generation: {viz_err}", exc_info=True)
            analysis_results["auto_visualization"]["status"] = "error"
            if analysis_results["status"] == "success": analysis_results["status"] = "warning"
            analysis_results["message"] += f" Warning: Automatic diagram generation failed: {viz_err}."
    else:
        logger.info("Automatic diagram generation is disabled in config.")
        analysis_results["auto_visualization"]["status"] = "disabled"

    # --- Final Status Check & Return ---
    if analysis_results["status"] == "success": print("Project analysis completed successfully."); analysis_results["message"] = "Project analysis completed successfully."
    elif analysis_results["status"] == "warning": print(f"Project analysis completed with warnings: {analysis_results.get('message', '')} Check logs.")
    else: print(f"Project analysis failed: {analysis_results.get('message', '')}. Check logs.")
    return analysis_results

def _is_empty_dir(dir_path: str) -> bool:
    """
    Checks if a directory is empty (contains no files or subdirectories).
    Handles potential permission errors.
    """
    try: return not os.listdir(dir_path)
    except FileNotFoundError:
        logger.warning(f"Directory not found while checking if empty: {dir_path}")
        return True # Treat non-existent as empty for skipping purposes
    except NotADirectoryError:
         logger.warning(f"Path is not a directory while checking if empty: {dir_path}")
         return True # Treat non-directory as empty for skipping purposes
    except OSError as e:
        logger.error(f"OS error checking if directory is empty {dir_path}: {e}")
        return False # Assume not empty on permission error etc. to be safe

# --- End of project_analyzer.py ---