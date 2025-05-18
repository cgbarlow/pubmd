# Cache System Documentation (v7.5)

## Overview

The CRCT cache system is designed to boost performance by storing the results of potentially costly function calls (like file analysis or embedding lookups) and reusing them when the same inputs occur again. It's a dynamic system based on Time-To-Live (TTL) expiration and automatic cleanup.

#### Core Components:

1.  **`Cache` Class**: A single cache instance holding data (`key -> value`), access times, and optional dependency information. It manages TTL expiration and LRU (Least Recently Used) eviction when size limits are reached.
2.  **`CacheManager` Class**: Oversees all active `Cache` instances. It creates caches on-demand when they are first requested (e.g., via the `@cached` decorator) and handles the cleanup of expired caches to free up memory.
3.  **`@cached` Decorator**: The primary way to enable caching for a function.

#### Key Features:

-   **Dynamic Cache Creation**: Caches are created automatically the first time a specific `cache_name` is used with the `@cached` decorator. There's no need to predefine caches.
-   **Automatic Expiration (TTL)**: Each cache instance has a default TTL. If a cache is not accessed within its TTL, it becomes eligible for removal by the `CacheManager`. Individual cached items within a cache also respect TTL settings.
-   **LRU Eviction**: When an individual cache instance reaches its maximum size limit, it removes the least recently used item to make space.
-   **Targeted Invalidation**: Functions are provided to clear specific cache entries based on key patterns (supports regex) or automatically when dependent files are modified.
-   **Optional Persistence**: The system includes code to save/load caches to disk, although this feature is **disabled by default** in the current version.
-   **Isolation**: Each cache (identified by its unique `cache_name`) operates independently. Clearing one cache does not affect others.

For most interactions with the CRCT system via the LLM, the cache operates transparently in the background. This guide provides details for users interested in understanding the mechanism or potentially leveraging it in custom scripts.

---

## How to Use the Cache System

The primary interface for enabling caching is the `@cached` decorator.

#### Basic Usage

To cache a function's results, decorate it with `@cached`, providing a unique `cache_name` and typically a `key_func` to generate a unique string key based on the function's arguments.

```python
# Example within cline_utils/dependency_system/utils/cache_manager.py
from cline_utils.dependency_system.utils.cache_manager import cached

# Define a function to generate a key based on input 'x'
def create_cache_key(x):
    return f"my_function_key:{x}"

@cached(cache_name="my_function_cache", key_func=create_cache_key)
def potentially_slow_function(x):
    # Simulate an expensive computation
    print(f"Executing potentially_slow_function({x})...")
    time.sleep(1)
    return x * x

# First call: executes the function, result stored in "my_function_cache" with key "my_function_key:5"
result1 = potentially_slow_function(5)
print(f"Result 1: {result1}")

# Second call with same input: returns cached result instantly
result2 = potentially_slow_function(5)
print(f"Result 2: {result2}")

# Call with different input: executes function, new result cached
result3 = potentially_slow_function(10)
print(f"Result 3: {result3}")
```

-   `"my_function_cache"`: This name identifies the specific cache instance used for this function. A new `Cache` object is created dynamically by the `CacheManager` the first time this name is encountered.
-   `key_func=create_cache_key`: This function takes the arguments passed to `potentially_slow_function` and generates a unique string identifier for the cache entry.

#### Advanced Usage: TTL and Dependencies

You can customize the Time-To-Live for a specific cache or define dependencies.

**Custom TTL:**

```python
# Set a 5-minute TTL for this specific cache instance
@cached(cache_name="short_lived_cache", key_func=lambda arg: f"slc:{arg}", ttl=300)
def function_with_short_ttl(arg):
    # ... function logic ...
    return arg
```

**Dynamic Dependencies:**

If a cached result depends on other data (e.g., a file), you can return the dependencies along with the result. The cache system implicitly creates dependencies based on file paths used in certain cached functions (like `analyze_file`).

```python
@cached(cache_name="dependent_cache", key_func=lambda file_id: f"dep_cache:{file_id}")
def process_file_data(file_id):
    file_path = f"/path/to/data/{file_id}.json"
    # ... process file_path ...
    result = {"data": "processed_data"}
    # Implicit dependency on file_path might be handled by internal functions,
    # but you could return explicit dependencies if needed:
    # dependencies = [f"file:{normalize_path(file_path)}"]
    # return result, dependencies
    return result # Example without explicit dependency return
```

If the underlying file changes, functions like `check_file_modified` can trigger invalidation for caches linked to that file path.

#### Manual Invalidation

While the system often handles invalidation automatically (e.g., based on file modification), you can manually clear entries using `invalidate_dependent_entries` or clear entire caches using the CLI command.

```python
from cline_utils.dependency_system.utils.cache_manager import invalidate_dependent_entries

# Invalidate specific entry in "my_function_cache"
invalidate_dependent_entries(cache_name="my_function_cache", key_pattern="my_function_key:5")

# Invalidate all entries in "my_function_cache"
invalidate_dependent_entries(cache_name="my_function_cache", key_pattern="my_function_key:.*")
```

**Clearing All Caches:**

The most straightforward way for a user to clear all caches is via the `dependency_processor.py` command:

```bash
python -m cline_utils.dependency_system.dependency_processor clear-caches
```

The LLM can execute this command if you suspect caching issues are causing problems.

---

## Cache Management Details

-   **On-Demand Creation & Cleanup**: Caches are created by the `CacheManager` when first requested via `@cached(cache_name=...)`. The manager periodically cleans up `Cache` instances that haven't been accessed within their TTL, conserving memory.
-   **LRU Eviction**: Individual `Cache` instances have size limits. When full, the least recently used entry is removed.
-   **Dependency Tracking**: The system can link cache entries to dependencies (like file paths). Modifying a file triggers `check_file_modified`, which uses `invalidate_dependent_entries` to clear relevant cached data (e.g., analysis results for that file).

---

## Configuration

Cache behavior can be tuned by modifying constants directly within `cline_utils/dependency_system/utils/cache_manager.py`:

-   `DEFAULT_TTL` (seconds): Default expiration time for cache instances and entries (currently 600 seconds / 10 minutes).
-   `DEFAULT_MAX_SIZE`: Default maximum number of items per cache instance (currently 1000).
-   `CACHE_SIZES` (dictionary): Allows setting different `max_size` values for specific `cache_name`s (e.g., `{"embeddings_generation": 100, "key_generation": 5000}`).

*Note: Modifying these requires directly editing the Python file.*

---

## Persistence

The `CacheManager` can be initialized with `persist=True` to save/load cache contents to/from JSON files within the `CACHE_DIR` (a `cache` subdirectory within `cline_utils/dependency_system/utils/`).

**This feature is currently DISABLED (`persist=False`) by default.** Enabling it would preserve caches between runs but might lead to loading stale data if not managed carefully.

---

## Cache Statistics

For debugging or performance analysis, you can retrieve statistics for a specific cache:

```python
from cline_utils.dependency_system.utils.cache_manager import get_cache_stats

stats = get_cache_stats("my_function_cache") # Use the actual cache_name
print(f"Cache 'my_function_cache' Stats - Hits: {stats['hits']}, Misses: {stats['misses']}, Current Size: {stats['size']}")