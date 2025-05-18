# analysis/embedding_manager.py

"""
Module for managing embeddings generation and similarity calculations using contextual keys.
Handles embedding creation from project files and cosine similarity between embeddings.
"""
import sys
import torch
import os
import json
from typing import List, Dict, Optional, Tuple, Any
import numpy as np
import ast

# Import only from lower-level modules
# <<< *** MODIFIED IMPORTS *** >>>
from cline_utils.dependency_system.utils.path_utils import is_subpath, normalize_path, is_valid_project_path, get_project_root
from cline_utils.dependency_system.utils.config_manager import ConfigManager
from cline_utils.dependency_system.utils.cache_manager import cached, invalidate_dependent_entries
from cline_utils.dependency_system.core.key_manager import (
    KeyInfo, # Added
    validate_key,
    sort_key_strings_hierarchically, # Import the correct sorting function
    # generate_keys is typically called *before* this, not needed here
)
# from cline_utils.dependency_system.io.tracker_io import read_tracker_file, write_tracker_file # Not used directly here

import logging
logger = logging.getLogger(__name__)

# Default model configuration
DEFAULT_MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
MODEL_INSTANCE = None
SELECTED_DEVICE = None

def _get_best_device() -> str:
    """Automatically determines the best available torch device."""
    # 1. Check CUDA
    if torch.cuda.is_available(): logger.info("CUDA is available. Using CUDA."); return "cuda"
    # 2. Check MPS (Apple Silicon GPU) - Requires PyTorch 1.12+ and macOS 12.3+
    # Check if MPS is available and supported
    # Add platform check to avoid errors on non-macOS
    elif sys.platform == "darwin" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available() and torch.backends.mps.is_built(): logger.info("Apple MPS is available. Using MPS."); return "mps"
    else: logger.info("Using CPU."); return "cpu"

def _select_device() -> str:
    """Selects device based on config override or automatic detection."""
    global SELECTED_DEVICE
    if SELECTED_DEVICE is None:
        config_manager = ConfigManager(); config_device = config_manager.config.get("compute", {}).get("embedding_device", "auto").lower()
        if config_device in ["cuda", "mps", "cpu"]:
            # Validate configured device choice
            if config_device == "cuda" and not torch.cuda.is_available(): logger.warning(f"Config specified 'cuda', but CUDA is not available. Falling back to auto-detection."); SELECTED_DEVICE = _get_best_device()
            elif config_device == "mps" and not (sys.platform == "darwin" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available() and torch.backends.mps.is_built()): logger.warning(f"Config specified 'mps', but MPS is not available/built. Falling back to auto-detection."); SELECTED_DEVICE = _get_best_device()
            else: logger.info(f"Using device specified in config: {config_device}"); SELECTED_DEVICE = config_device
        elif config_device == "auto": logger.info("Auto-detecting device."); SELECTED_DEVICE = _get_best_device()
        else: logger.warning(f"Invalid device '{config_device}'. Auto-detecting."); SELECTED_DEVICE = _get_best_device()
    return SELECTED_DEVICE

def _load_model():
    """Loads the sentence transformer model if not already loaded, using the selected device."""
    global MODEL_INSTANCE
    if MODEL_INSTANCE is None:
        device = _select_device()
        try:
            from sentence_transformers import SentenceTransformer
            MODEL_INSTANCE = SentenceTransformer(DEFAULT_MODEL_NAME, device=device)
            logger.info(f"Loaded sentence transformer model: {DEFAULT_MODEL_NAME} on device: {device}")
        except ImportError as e: logger.error(f"Failed to import SentenceTransformer: {e}. Please install it (`pip install sentence-transformers`)"); raise
        except Exception as e: logger.error(f"Failed to load model {DEFAULT_MODEL_NAME} on device {device}: {e}"); raise
    return MODEL_INSTANCE

# --- Preprocessing (unchanged) ---
def _preprocess_content_for_embedding(file_path: str, content: str) -> str:
    """
    Preprocesses file content before embedding generation.
    Currently removes Python import lines.
    Future enhancements: Contextual weighting, comment/docstring handling.

    Args:
        file_path: The path to the file (used to determine file type).
        content: The original file content.

    Returns:
        The preprocessed content string.
    """
    # Simple check based on extension for now
    if file_path.lower().endswith(".py"):
        lines = content.splitlines()
        filtered_lines = [line for line in lines if not (line.strip().startswith("import ") or line.strip().startswith("from "))]
        weighted_definitions = []
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                segment = None
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)): segment = ast.get_source_segment(content, node)
                if segment: weighted_definitions.extend([segment, segment]) # Weighting
        except Exception as e: logger.warning(f"AST weighting failed for {file_path}: {e}. Proceeding without.")
        final_content_list = filtered_lines + weighted_definitions
        return "\n".join(final_content_list)
    # TODO: Add preprocessing for other file types if needed (e.g., remove boilerplate HTML/JS?)
    return content # Return original content for non-Python files

# --- Embedding Generation ---
# <<< *** MODIFIED SIGNATURE AND LOGIC *** >>>
# Caching removed due to complexity and risk of stale data; relies on internal checks.
def generate_embeddings(project_paths: List[str],
                        path_to_key_info: Dict[str, KeyInfo], # Changed from global_key_map
                        force: bool = False) -> bool:
    """
    Generate embeddings for all files in the specified project paths using contextual keys.

    Args:
        project_paths: List of project directory paths (relative to project root)
        path_to_key_info: The global map from normalized paths to KeyInfo objects.
        force: If True, regenerate embeddings even if they exist
    Returns:
        success: bool indicating overall success.
    """
    if not project_paths: logger.error("No project paths provided."); return False
    if not path_to_key_info: logger.warning("path_to_key_info map is empty. Cannot generate embeddings."); return False

    try: model = _load_model()
    except Exception: return False

    config_manager = ConfigManager(); project_root = get_project_root()
    embeddings_dir = config_manager.get_path("embeddings_dir", "cline_utils/dependency_system/analysis/embeddings")
    if not os.path.isabs(embeddings_dir): embeddings_dir = os.path.join(project_root, embeddings_dir)
    os.makedirs(embeddings_dir, exist_ok=True)

    overall_success = True
    keys_skipped_mtime = set() # Track keys skipped due to mtime match

    for relative_path in project_paths:
        # Validate and normalize the individual project path relative to project_root
        current_project_path = normalize_path(os.path.join(project_root, relative_path))
        if not is_valid_project_path(current_project_path): logger.error(f"Invalid path skipped: {current_project_path}"); overall_success = False; continue

        # Determine metadata path (specific to this root path being processed)
        project_name = os.path.basename(current_project_path)
        project_embeddings_dir = normalize_path(os.path.join(embeddings_dir, project_name)) # This subdir approach might be redundant now? Check if needed.
        metadata_file = normalize_path(os.path.join(project_embeddings_dir, "metadata.json")) # If using mirrored structure, maybe one metadata file at base embeddings_dir?
        os.makedirs(project_embeddings_dir, exist_ok=True) # Keep for now if subdirs are used for something else
        logger.info(f"Processing embeddings for files under: {current_project_path}")

        # Load existing metadata (unchanged logic)
        existing_metadata = {}
        if not force and os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f: existing_metadata = json.load(f)
                if existing_metadata.get("version") != "1.0": logger.warning(f"Incompatible metadata version in {metadata_file}. Regenerating."); existing_metadata = {}
            except Exception as e: logger.warning(f"Corrupted/missing metadata {metadata_file}: {e}. Regenerating."); existing_metadata = {}

        # --- Filter path_to_key_info for the current path ---
        # <<< *** MODIFIED FILTERING *** >>>
        key_info_for_current_path: Dict[str, KeyInfo] = {
            norm_path: info for norm_path, info in path_to_key_info.items()
            if info.norm_path.startswith(current_project_path) and not info.is_directory # Only process files within this path
        }

        if not key_info_for_current_path:
            logger.warning(f"No files found via path_to_key_info within path: {current_project_path}")
            continue

        # --- Read file contents (batch read could optimize) ---
        # <<< *** MODIFIED ITERATION *** >>>
        file_contents: Dict[str, str] = {} # Map key_string -> content
        for norm_path, key_info in key_info_for_current_path.items():
            abs_file_path = key_info.norm_path # Already normalized absolute path
            key_string = key_info.key_string
            if not os.path.isfile(abs_file_path):
                 logger.warning(f"Path is not a file: {abs_file_path} for key {key_string}. Skipping read.")
                 continue
            try:
                is_binary = False; # (Binary check unchanged)
                with open(abs_file_path, 'rb') as f_check:
                    if b'\0' in f_check.read(1024): is_binary = True
                if is_binary: logger.debug(f"Skipping binary file: {abs_file_path}"); continue
                # Read content
                with open(abs_file_path, 'r', encoding='utf-8') as f: file_contents[key_string] = f.read()
            except UnicodeDecodeError: logger.debug(f"Skipping non-UTF8 file: {abs_file_path}")
            except Exception as e: logger.warning(f"Failed to read {abs_file_path}: {e}")

        # --- Generate or load embeddings ---
        # <<< *** MODIFIED ITERATION AND CHECKS *** >>>
        current_embeddings: Dict[str, np.ndarray] = {} # Map key_string -> embedding
        keys_skipped_mtime_this_pass = set() # Track skips for *this* pass/project_path

        for norm_path, key_info in key_info_for_current_path.items():
            key_string = key_info.key_string
            abs_file_path = key_info.norm_path # Use path from KeyInfo

            if not os.path.exists(abs_file_path): # Re-check existence
                logger.debug(f"Skipping key {key_string} as file path {abs_file_path} does not exist.")
                continue
            if not _is_valid_file(abs_file_path): # Check exclusions
                logger.debug(f"Skipping excluded/invalid file: {abs_file_path}")
                continue

            should_generate = True
            metadata_key_entry = existing_metadata.get("keys", {}).get(key_string)

            if metadata_key_entry and not force:
                # Find the expected .npy path using the mirrored structure
                try:
                    relative_file_path_for_npy = os.path.relpath(abs_file_path, project_root)
                    mirrored_npy_path = normalize_path(os.path.join(embeddings_dir, relative_file_path_for_npy) + ".npy")
                except ValueError: mirrored_npy_path = None

                if mirrored_npy_path and os.path.exists(mirrored_npy_path):
                    try:
                        current_mtime = os.path.getmtime(abs_file_path)
                        metadata_mtime = metadata_key_entry.get("mtime")
                        logger.debug(f"Checking mtime {key_string}: Current={current_mtime}, Meta={metadata_mtime}")
                        if metadata_mtime is not None and current_mtime == metadata_mtime:
                            logger.debug(f"  MTime match. Skipping generation for {key_string}.")
                            should_generate = False
                            keys_skipped_mtime_this_pass.add(key_string) # Track skip
                        elif metadata_mtime is None: logger.debug(f"  Meta mtime missing. Regen {key_string}.")
                        else: logger.debug(f"  MTime mismatch. Regen {key_string}.")
                    except FileNotFoundError: logger.warning(f"Source file {abs_file_path} gone. Skip {key_string}."); should_generate = False
                    except Exception as e: logger.warning(f"Mtime check failed for {key_string}: {e}. Regen."); should_generate = True
                else: logger.debug(f"NPY not found {mirrored_npy_path}. Gen {key_string}."); should_generate = True
            elif force: logger.info(f"Force flag set. Regen {key_string}."); should_generate = True
            else: logger.debug(f"Key {key_string} not in meta or meta missing. Gen."); should_generate = True

            # Generate new or updated embedding if needed
            if should_generate:
                original_content = file_contents.get(key_string, "")
                processed_content = _preprocess_content_for_embedding(abs_file_path, original_content)
                if processed_content.strip():
                    try:
                        logger.debug(f"Encoding content for key: {key_string}...")
                        embedding = model.encode(processed_content, show_progress_bar=False, convert_to_numpy=True)
                        current_embeddings[key_string] = embedding
                        logger.debug(f"Encoding successful for key: {key_string}.")
                        # Save using mirrored structure (logic unchanged, uses abs_file_path)
                        try:
                            relative_file_path = os.path.relpath(abs_file_path, project_root)
                            # Construct mirrored path under embeddings_dir (base embeddings dir)
                            mirrored_path_base = os.path.join(embeddings_dir, relative_file_path)
                            mirrored_dir = os.path.dirname(mirrored_path_base)
                            # Ensure the mirrored directory exists
                            os.makedirs(mirrored_dir, exist_ok=True)
                            save_path = normalize_path(mirrored_path_base + ".npy")
                            logger.debug(f"Saving embedding for {key_string} to {save_path}...")
                            np.save(save_path, embedding)
                            logger.info(f"Generated/saved embedding for {key_string} to {save_path}")
                        except Exception as e: logger.error(f"Failed save embedding {key_string} ({abs_file_path}) to {save_path}: {e}"); overall_success = False
                    except Exception as e: logger.error(f"Failed generate embedding {key_string} ({abs_file_path}): {e}"); overall_success = False
                else: logger.debug(f"Skipping empty file content for key {key_string} ({abs_file_path})")

        # Update the global skip set
        keys_skipped_mtime.update(keys_skipped_mtime_this_pass)

        # --- Save metadata (using key strings and paths from KeyInfo) ---
        # <<< *** MODIFIED METADATA POPULATION *** >>>
        valid_keys_in_metadata = {}
        for norm_path, key_info in key_info_for_current_path.items():
            key_string = key_info.key_string
            abs_v_path = key_info.norm_path # Path from KeyInfo
            # Include if file still exists AND (embedding was generated OR skipped due to mtime)
            if os.path.exists(abs_v_path) and (key_string in current_embeddings or key_string in keys_skipped_mtime_this_pass):
                 try:
                    valid_keys_in_metadata[key_string] = {
                        "path": abs_v_path, # Save normalized absolute path
                        "mtime": os.path.getmtime(abs_v_path)
                    }
                 except FileNotFoundError: logger.warning(f"File {abs_v_path} gone before meta save for {key_string}.")
                 except Exception as e: logger.error(f"Error getting mtime for {abs_v_path} ({key_string}): {e}.")

        if not valid_keys_in_metadata: logger.warning(f"No valid files processed for metadata in {current_project_path}. Skipping save.")
        else:
            metadata = {"version": "1.0", "model": DEFAULT_MODEL_NAME, "keys": valid_keys_in_metadata}
            try:
                # Save metadata specific to this project path (or adjust if one global metadata is preferred)
                with open(metadata_file, 'w', encoding='utf-8') as f: json.dump(metadata, f, indent=2)
                logger.info(f"Saved metadata for scope {project_name} to {metadata_file}")
            except Exception as e: logger.error(f"Failed write metadata {metadata_file}: {e}"); overall_success = False

    # --- End Loop ---
    if overall_success: logger.info(f"Completed embedding generation for paths: {project_paths}")
    else: logger.warning(f"Embedding generation completed with errors for paths: {project_paths}")
    return overall_success

# --- Similarity Calculation Helper ---
# Add code_roots and doc_roots to signature to match calculate_similarity arguments passed by @cached
def _get_similarity_cache_key(key1_str: str, key2_str: str, embeddings_dir: str,
                              path_to_key_info: Dict[str, KeyInfo], project_root: str,
                              code_roots: List[str], doc_roots: List[str], **kwargs) -> str:
    """Generates a cache key for calculate_similarity, including .npy mtimes."""
    norm_embeddings_dir = normalize_path(embeddings_dir)
    norm_project_root = normalize_path(project_root)

    def get_npy_mtime(key_str: str) -> float:
        """Gets the mtime of the .npy file for a key, or 0 if not found."""
        key_info = next((info for info in path_to_key_info.values() if info.key_string == key_str), None)
        if not key_info or not key_info.norm_path.startswith(norm_project_root):
            return 0.0
        try:
            relative_file_path = os.path.relpath(key_info.norm_path, norm_project_root)
            npy_path = normalize_path(os.path.join(norm_embeddings_dir, relative_file_path) + ".npy")
            if os.path.exists(npy_path):
                return os.path.getmtime(npy_path)
            else:
                return 0.0
        except (ValueError, OSError):
            return 0.0 # Error calculating path or getting mtime

    # Sort keys to ensure consistent key order
    # Use hierarchical sorting for key strings
    sorted_keys = sort_key_strings_hierarchically([key1_str, key2_str])
    mtime1 = get_npy_mtime(sorted_keys[0])
    mtime2 = get_npy_mtime(sorted_keys[1])

    return f"similarity:{sorted_keys[0]}:{sorted_keys[1]}:{norm_embeddings_dir}:{mtime1}:{mtime2}"

# --- Similarity Calculation ---
# <<< *** MODIFIED SIGNATURE AND LOGIC *** >>>
@cached("similarity_calculation",
        key_func=_get_similarity_cache_key) # Use helper function for key generation
def calculate_similarity(key1_str: str, # Renamed for clarity
                         key2_str: str, # Renamed for clarity
                         embeddings_dir: str,
                         path_to_key_info: Dict[str, KeyInfo], # Changed
                         project_root: str,
                         code_roots: List[str],
                         doc_roots: List[str]) -> float:
    """
    Calculate cosine similarity between embeddings of two key strings using contextual keys.

    Args:
        key1_str: First key string
        key2_str: Second key string
        embeddings_dir: Base directory containing mirrored embedding .npy files
        path_to_key_info: Global map from normalized paths to KeyInfo objects.
        project_root: Root directory of the project
        code_roots: List of code root directories (relative to project_root)
        doc_roots: List of documentation root directories (relative to project_root)

    Returns:
        Cosine similarity score (0.0 to 1.0), or 0.0 on failure
    """
    if not (validate_key(key1_str) and validate_key(key2_str)):
        logger.warning(f"Invalid key format for similarity: {key1_str}, {key2_str}"); return 0.0

    # <<< *** MODIFIED key validation check *** >>>
    # Check if keys exist in the provided map
    key1_info = next((info for info in path_to_key_info.values() if info.key_string == key1_str), None)
    key2_info = next((info for info in path_to_key_info.values() if info.key_string == key2_str), None)

    if not key1_info or not key2_info:
        missing_keys = []
        if not key1_info: missing_keys.append(key1_str)
        if not key2_info: missing_keys.append(key2_str)
        logger.warning(f"Key(s) not found in path_to_key_info map for similarity: {', '.join(missing_keys)}")
        return 0.0

    if key1_str == key2_str: return 1.0

    if not os.path.isabs(embeddings_dir): embeddings_dir = normalize_path(os.path.join(project_root, embeddings_dir))

    # <<< *** MODIFIED HELPER to use path_to_key_info *** >>>
    def get_embedding_path(key_str: str) -> Optional[str]:
        """Helper to find the correct .npy file path using KeyInfo."""
        # Find the KeyInfo object for this key string
        key_info = next((info for info in path_to_key_info.values() if info.key_string == key_str), None)
        if not key_info:
            logger.warning(f"Could not find KeyInfo for key string {key_str}.")
            return None

        norm_abs_file_path = key_info.norm_path # Get path from KeyInfo
        norm_project_root = normalize_path(project_root)
        if not norm_abs_file_path.startswith(norm_project_root):
             logger.warning(f"File path {norm_abs_file_path} for key {key_str} is outside project root.")
             return None
        try:
            relative_file_path = os.path.relpath(norm_abs_file_path, norm_project_root)
            expected_npy_path = normalize_path(os.path.join(embeddings_dir, relative_file_path) + ".npy")
            return expected_npy_path
        except ValueError as e: logger.error(f"Error calc rel path for {norm_abs_file_path}: {e}"); return None
        except Exception as e: logger.error(f"Unexpected error getting embedding path for key {key_str}: {e}"); return None


    file1_path = get_embedding_path(key1_str)
    file2_path = get_embedding_path(key2_str)

    if not file1_path or not file2_path or not (os.path.exists(file1_path) and os.path.exists(file2_path)):
        missing = []
        if not file1_path or not (file1_path and os.path.exists(file1_path)): missing.append(file1_path or f"{key1_str}.npy (path error)")
        if not file2_path or not (file2_path and os.path.exists(file2_path)): missing.append(file2_path or f"{key2_str}.npy (path error)")
        relative_missing = [os.path.relpath(m, embeddings_dir) if m and os.path.isabs(m) and embeddings_dir in m else m for m in missing]
        logger.debug(f"Embedding files missing/path error during similarity: {', '.join(relative_missing)}")
        return 0.0

    # (Loading and calculation logic unchanged)
    try:
        emb1 = np.load(file1_path); emb2 = np.load(file2_path)
        if emb1.ndim > 1: emb1 = emb1.flatten()
        if emb2.ndim > 1: emb2 = emb2.flatten()
        norm1 = np.linalg.norm(emb1); norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0: logger.debug(f"Zero vector for {key1_str if norm1==0 else ''}{' and ' if norm1==0 and norm2==0 else ''}{key2_str if norm2==0 else ''}. Sim=0."); return 0.0
        similarity = float(np.dot(emb1, emb2) / (norm1 * norm2))
        return max(0.0, min(1.0, similarity))
    except Exception as e:
        logger.exception(f"Failed similarity calc for {key1_str} & {key2_str}: {e}"); return 0.0

# --- File Validation Helper ---
@cached("file_validation",
       key_func=lambda file_path: f"is_valid_file:{normalize_path(file_path)}:{os.path.getmtime(ConfigManager().config_path)}")
def _is_valid_file(file_path: str) -> bool:
    """
    Check if a file is valid for embedding generation.

    Args:
        file_path: Normalized path to the file
    Returns:
        True if the file should be processed, False otherwise
    """
    config = ConfigManager()
    # Ensure paths are fetched correctly using project_root if needed
    # Use get_project_root from path_utils
    project_root = get_project_root()
    # Corrected: Use specific getter methods or .config property
    exclude_dirs_raw = config.get_excluded_dirs(); exclude_dirs = [normalize_path(os.path.join(project_root, d)) for d in exclude_dirs_raw] # Normalize exclusion paths
    exclude_exts = config.get_excluded_extensions(); exclude_files_raw = config.config.get("exclude_files", []) # Access underlying dict for non-standard keys
    exclude_files = [normalize_path(os.path.join(project_root, f)) for f in exclude_files_raw] # Normalize exclusion files
    norm_file_path = normalize_path(file_path) # Normalize the file path being checked
    logger.debug(f"_is_valid_file: Checking path: {norm_file_path}") # DEBUG
    logger.debug(f"_is_valid_file: Excluded Dirs (absolute): {exclude_dirs}") # DEBUG
    logger.debug(f"_is_valid_file: Excluded Exts: {exclude_exts}") # DEBUG
    logger.debug(f"_is_valid_file: Excluded Files (absolute): {exclude_files}") # DEBUG
    # Check against normalized exclude_files list
    if norm_file_path in exclude_files:
         logger.debug(f"_is_valid_file: Path excluded by exclude_files list.") # DEBUG
         return False
    file_name = os.path.basename(norm_file_path)
    if file_name.startswith('.'): return False
    if any(norm_file_path.startswith(ex_dir + os.sep) or norm_file_path == ex_dir for ex_dir in exclude_dirs): return False # Ensure checking prefix correctly
    ext = os.path.splitext(norm_file_path)[1].lower()
    if ext in exclude_exts: return False
    try: return os.path.isfile(norm_file_path) and os.path.getsize(norm_file_path) < 10 * 1024 * 1024
    except OSError: return False

# --- CLI ---
# register_parser, command_handler: Unchanged for now, as project_analyzer handles the main flow.
# If CLI usage is needed, command_handler would need updating to fetch path_to_key_info first.
def register_parser(subparsers):
    """Register command-line interface commands."""
    parser = subparsers.add_parser("generate-embeddings", help="Generate embeddings for project files")
    parser.add_argument("project_paths", nargs="+", help="Paths to project directories (relative to project root)")
    parser.add_argument("--force", action="store_true", help="Force regeneration of embeddings")
    parser.set_defaults(func=command_handler)

def command_handler(args):
    """ (Implementation unchanged - NOTE: Needs adaptation if used directly) """
    # This handler would need to call generate_keys first to get path_to_key_info
    logger.error("Direct CLI command for generate-embeddings needs adaptation for contextual keys. Use project analysis flow.")
    # success = generate_embeddings(args.project_paths, ??? path_to_key_info ???, args.force) # Needs path_to_key_info
    # if success: print(...) else: print(...)
    return 1

# EoF