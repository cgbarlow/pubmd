# io/update_doc_tracker.py

"""
IO module for doc tracker specific data using contextual keys.
"""
from typing import Dict, Callable, List # Added List
import os

# Import only from lower-level modules
from cline_utils.dependency_system.utils.config_manager import ConfigManager
from cline_utils.dependency_system.utils.path_utils import is_subpath, normalize_path, join_paths
# <<< *** Added KeyInfo import *** >>>
from cline_utils.dependency_system.core.key_manager import KeyInfo

import logging
logger = logging.getLogger(__name__)

# <<< *** MODIFIED FUNCTION SIGNATURE AND LOGIC *** >>>
def doc_file_inclusion_logic(project_root: str, path_to_key_info: Dict[str, KeyInfo]) -> Dict[str, KeyInfo]:
    """
    Logic for determining which files/dirs (represented by KeyInfo) to include
    in the doc tracker based on configured documentation directories.

    Args:
        project_root: Absolute path to the project root.
        path_to_key_info: The global map from normalized paths to KeyInfo objects.

    Returns:
        A dictionary mapping the normalized path of each filtered item
        to its corresponding KeyInfo object.
    """
    config_manager = ConfigManager()
    doc_directories_rel: List[str] = config_manager.get_doc_directories()
    filtered_items: Dict[str, KeyInfo] = {} # {norm_path: KeyInfo}
    abs_doc_roots: List[str] = [normalize_path(os.path.join(project_root, p)) for p in doc_directories_rel]

    if not abs_doc_roots:
        logger.warning("No documentation directories configured for doc tracker filtering.")
        return {}

    # Iterate through all KeyInfo objects
    for norm_path, key_info in path_to_key_info.items():
        # Check if the item's path is equal to or within any of the configured doc roots
        if any(norm_path == doc_root or is_subpath(norm_path, doc_root) for doc_root in abs_doc_roots):
            filtered_items[norm_path] = key_info # Add the KeyInfo object

    logger.info(f"Doc tracker filter selected {len(filtered_items)} items.")
    return filtered_items

def get_doc_tracker_path(project_root: str) -> str:
    """Gets the path to the doc tracker file."""
    config_manager = ConfigManager()
    # Default relative path, can be overridden in .clinerules
    memory_dir_rel = config_manager.get_path("memory_dir", "cline_docs/memory")
    memory_dir_abs = join_paths(project_root, memory_dir_rel)

    # *** Use get_path for the filename as well, providing a default ***
    tracker_filename = config_manager.get_path("doc_tracker_filename", "doc_tracker.md")
    tracker_filename = os.path.basename(tracker_filename) # Ensure just filename

    return join_paths(memory_dir_abs, tracker_filename)

# Data structure for doc tracker
doc_tracker_data = {
    # <<< *** MODIFIED SIGNATURE *** >>>
    "file_inclusion": doc_file_inclusion_logic, # Now takes path_to_key_info, returns Dict[str, KeyInfo]
    "get_tracker_path": get_doc_tracker_path
}

# EoF