import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend" / "src"
BACKEND_ROOT = ROOT / "app" / "web" / "api" / "v1"


def _strip_query(path: str) -> str:
    if "?" in path:
        path = path.split("?", 1)[0]
    # Strip MSW glob patterns (e.g., /api/v1/foo*)
    path = path.rstrip("*")
    return path


def _normalize_path(path: str) -> str:
    if not path.startswith("/"):
        path = f"/{path}"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return path


def _route_to_regex(route: str) -> re.Pattern:
    pattern = re.sub(r"<[^>]+>", r"[^/]+", route)
    return re.compile(rf"^{pattern}$")


def _extract_backend_routes() -> list[str]:
    routes: list[str] = []
    for path in BACKEND_ROOT.glob("*.py"):
        if path.name == "__init__.py":
            continue
        text = path.read_text(encoding="utf-8")
        prefix = ""
        prefix_match = re.search(r"url_prefix\s*=\s*['\"]([^'\"]+)['\"]", text)
        if prefix_match:
            prefix = prefix_match.group(1)
        for match in re.finditer(r"@\w+\.route\(\s*['\"]([^'\"]*)['\"]", text):
            route = match.group(1)
            route = _normalize_path(route)
            if prefix:
                route = _normalize_path(f"{prefix}{route}")
            routes.append(route)
    return routes


def _extract_frontend_api_calls() -> list[str]:
    endpoints: set[str] = set()
    for path in FRONTEND_ROOT.rglob("*.ts*"):
        if "__tests__" in path.parts:
            continue
        if path.suffix == ".d.ts":
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in re.findall(r"/api/v1/[^\s\"'`\\)]+", text):
            endpoint = _strip_query(match)
            endpoint = re.sub(r"\$\{[^}]+\}", "<var>", endpoint)
            # Skip base URL patterns used in API client classes (e.g., /api/v1/instagram${endpoint})
            # These are dynamically constructed with method-specific paths
            if endpoint.endswith("<var>"):
                continue
            endpoints.add(_normalize_path(endpoint))
    api_path = FRONTEND_ROOT / "lib" / "api.ts"
    if api_path.exists():
        text = api_path.read_text(encoding="utf-8")
        for match in re.finditer(r"request\(\s*['\"]([^'\"]+)['\"]", text):
            endpoint = match.group(1)
            if endpoint.startswith("/api/"):
                endpoints.add(_normalize_path(_strip_query(endpoint)))
                continue
            endpoint = _normalize_path(f"/api/v1{_strip_query(endpoint)}")
            endpoints.add(endpoint)
        for match in re.finditer(r"request\(\s*`([^`]+)`", text):
            template = match.group(1)
            endpoint = re.sub(r"\$\{[^}]+\}", "<var>", template)
            endpoint = re.sub(r"(?<!/)<var>", "", endpoint)
            endpoint = _normalize_path(endpoint)
            if not endpoint.startswith("/api/"):
                endpoint = _normalize_path(f"/api/v1{endpoint}")
            endpoints.add(_strip_query(endpoint))
    return sorted(endpoints)


def main() -> int:
    frontend_routes = _extract_frontend_api_calls()
    backend_routes = _extract_backend_routes()
    backend_patterns = [
        _route_to_regex(_normalize_path(f"/api/v1{route}")) for route in backend_routes
    ]

    missing: list[str] = []
    for endpoint in frontend_routes:
        if not endpoint.startswith("/api/v1"):
            continue
        if any(pattern.match(endpoint) for pattern in backend_patterns):
            continue
        missing.append(endpoint)

    if missing:
        print("Missing backend routes for frontend API calls:")
        for endpoint in sorted(set(missing)):
            print(f"- {endpoint}")
        return 1

    print("API integration check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
