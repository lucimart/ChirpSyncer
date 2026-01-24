"""
RSS/Atom Feed Integration

Endpoints for reading RSS and Atom feeds:
- Parse feeds
- List feed entries
- OPML import/export
- Feed discovery
"""

import hashlib
from datetime import datetime
from typing import Optional
from xml.etree import ElementTree as ET

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error

rss_bp = Blueprint("rss", __name__, url_prefix="/rss")

# Namespaces for Atom feeds
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


def parse_rss_date(date_str: str) -> Optional[str]:
    """Parse RSS/Atom date to ISO format."""
    if not date_str:
        return None

    formats = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.isoformat()
        except ValueError:
            continue

    return date_str


def parse_rss_feed(root: ET.Element) -> dict:
    """Parse RSS 2.0 feed."""
    channel = root.find("channel")
    if channel is None:
        return {"error": "Invalid RSS feed: no channel element"}

    feed = {
        "type": "rss",
        "title": channel.findtext("title", ""),
        "link": channel.findtext("link", ""),
        "description": channel.findtext("description", ""),
        "language": channel.findtext("language"),
        "last_build_date": parse_rss_date(channel.findtext("lastBuildDate", "")),
        "image": None,
        "entries": [],
    }

    # Feed image
    image = channel.find("image")
    if image is not None:
        feed["image"] = {
            "url": image.findtext("url", ""),
            "title": image.findtext("title", ""),
            "link": image.findtext("link", ""),
        }

    # Parse items
    for item in channel.findall("item"):
        entry = {
            "id": item.findtext("guid", "") or item.findtext("link", ""),
            "title": item.findtext("title", ""),
            "link": item.findtext("link", ""),
            "description": item.findtext("description", ""),
            "published": parse_rss_date(item.findtext("pubDate", "")),
            "author": item.findtext("author") or item.findtext("dc:creator", ""),
            "categories": [cat.text for cat in item.findall("category") if cat.text],
            "enclosures": [],
        }

        # Media enclosures
        for enclosure in item.findall("enclosure"):
            entry["enclosures"].append({
                "url": enclosure.get("url", ""),
                "type": enclosure.get("type", ""),
                "length": enclosure.get("length", ""),
            })

        feed["entries"].append(entry)

    return feed


def parse_atom_feed(root: ET.Element) -> dict:
    """Parse Atom feed."""
    feed = {
        "type": "atom",
        "title": root.findtext("atom:title", "", ATOM_NS),
        "link": "",
        "description": root.findtext("atom:subtitle", "", ATOM_NS),
        "updated": parse_rss_date(root.findtext("atom:updated", "", ATOM_NS)),
        "author": None,
        "entries": [],
    }

    # Find link
    for link in root.findall("atom:link", ATOM_NS):
        if link.get("rel") == "alternate" or not link.get("rel"):
            feed["link"] = link.get("href", "")
            break

    # Feed author
    author = root.find("atom:author", ATOM_NS)
    if author is not None:
        feed["author"] = {
            "name": author.findtext("atom:name", "", ATOM_NS),
            "email": author.findtext("atom:email", "", ATOM_NS),
            "uri": author.findtext("atom:uri", "", ATOM_NS),
        }

    # Parse entries
    for entry in root.findall("atom:entry", ATOM_NS):
        item = {
            "id": entry.findtext("atom:id", "", ATOM_NS),
            "title": entry.findtext("atom:title", "", ATOM_NS),
            "link": "",
            "summary": entry.findtext("atom:summary", "", ATOM_NS),
            "content": entry.findtext("atom:content", "", ATOM_NS),
            "published": parse_rss_date(entry.findtext("atom:published", "", ATOM_NS)),
            "updated": parse_rss_date(entry.findtext("atom:updated", "", ATOM_NS)),
            "author": None,
            "categories": [],
        }

        # Entry link
        for link in entry.findall("atom:link", ATOM_NS):
            if link.get("rel") == "alternate" or not link.get("rel"):
                item["link"] = link.get("href", "")
                break

        # Entry author
        author = entry.find("atom:author", ATOM_NS)
        if author is not None:
            item["author"] = {
                "name": author.findtext("atom:name", "", ATOM_NS),
                "email": author.findtext("atom:email", "", ATOM_NS),
            }

        # Categories
        for cat in entry.findall("atom:category", ATOM_NS):
            term = cat.get("term")
            if term:
                item["categories"].append(term)

        feed["entries"].append(item)

    return feed


@rss_bp.route("/parse", methods=["POST"])
def parse_feed():
    """Parse an RSS or Atom feed from URL."""
    body = request.get_json() or {}
    feed_url = body.get("url")

    if not feed_url:
        return api_error("Feed URL is required", 400)

    try:
        resp = http_requests.get(
            feed_url,
            headers={
                "User-Agent": "ChirpSyncer/1.0 RSS Reader",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
            },
            timeout=30,
        )

        if not resp.ok:
            return api_error(f"Failed to fetch feed: {resp.status_code}", resp.status_code)

        content = resp.text
        root = ET.fromstring(content)

        # Detect feed type
        if root.tag == "rss":
            feed = parse_rss_feed(root)
        elif root.tag == "{http://www.w3.org/2005/Atom}feed":
            feed = parse_atom_feed(root)
        elif root.tag == "feed":
            # Atom without namespace
            feed = parse_atom_feed(root)
        else:
            return api_error("Unknown feed format", 400)

        feed["url"] = feed_url
        feed["fetched_at"] = datetime.utcnow().isoformat()

        return api_response(feed)

    except ET.ParseError as e:
        return api_error(f"Invalid XML: {str(e)}", 400)
    except http_requests.RequestException as e:
        return api_error(f"Request failed: {str(e)}", 500)


@rss_bp.route("/discover", methods=["POST"])
def discover_feeds():
    """Discover RSS/Atom feeds from a webpage."""
    body = request.get_json() or {}
    page_url = body.get("url")

    if not page_url:
        return api_error("Page URL is required", 400)

    try:
        resp = http_requests.get(
            page_url,
            headers={
                "User-Agent": "ChirpSyncer/1.0 Feed Discovery",
                "Accept": "text/html",
            },
            timeout=30,
        )

        if not resp.ok:
            return api_error(f"Failed to fetch page: {resp.status_code}", resp.status_code)

        content = resp.text
        feeds = []

        # Parse HTML to find feed links
        # Look for <link rel="alternate" type="application/rss+xml" ...>
        import re

        link_pattern = r'<link[^>]+rel=["\']alternate["\'][^>]*>'
        for match in re.finditer(link_pattern, content, re.IGNORECASE):
            link_tag = match.group(0)

            # Extract type
            type_match = re.search(r'type=["\']([^"\']+)["\']', link_tag)
            if not type_match:
                continue

            feed_type = type_match.group(1)
            if feed_type not in ["application/rss+xml", "application/atom+xml"]:
                continue

            # Extract href
            href_match = re.search(r'href=["\']([^"\']+)["\']', link_tag)
            if not href_match:
                continue

            href = href_match.group(1)

            # Make absolute URL
            if href.startswith("/"):
                from urllib.parse import urlparse
                parsed = urlparse(page_url)
                href = f"{parsed.scheme}://{parsed.netloc}{href}"
            elif not href.startswith("http"):
                href = f"{page_url.rstrip('/')}/{href}"

            # Extract title
            title_match = re.search(r'title=["\']([^"\']+)["\']', link_tag)
            title = title_match.group(1) if title_match else ""

            feeds.append({
                "url": href,
                "type": "rss" if "rss" in feed_type else "atom",
                "title": title,
            })

        return api_response({"feeds": feeds, "source_url": page_url})

    except http_requests.RequestException as e:
        return api_error(f"Request failed: {str(e)}", 500)


@rss_bp.route("/opml/parse", methods=["POST"])
def parse_opml():
    """Parse OPML file to extract feed list."""
    if "file" in request.files:
        file = request.files["file"]
        content = file.read().decode("utf-8")
    else:
        body = request.get_json() or {}
        content = body.get("content", "")

    if not content:
        return api_error("OPML content or file required", 400)

    try:
        root = ET.fromstring(content)
        feeds = []

        # OPML structure: opml/body/outline
        body_elem = root.find("body")
        if body_elem is None:
            return api_error("Invalid OPML: no body element", 400)

        def parse_outline(outline, folder=""):
            """Recursively parse outline elements."""
            xml_url = outline.get("xmlUrl")
            if xml_url:
                feeds.append({
                    "url": xml_url,
                    "title": outline.get("title") or outline.get("text", ""),
                    "html_url": outline.get("htmlUrl", ""),
                    "type": outline.get("type", "rss"),
                    "folder": folder,
                })
            else:
                # This is a folder
                folder_name = outline.get("title") or outline.get("text", "")
                for child in outline.findall("outline"):
                    parse_outline(child, folder_name)

        for outline in body_elem.findall("outline"):
            parse_outline(outline)

        # Get OPML metadata
        head = root.find("head")
        metadata = {}
        if head is not None:
            metadata = {
                "title": head.findtext("title", ""),
                "date_created": head.findtext("dateCreated", ""),
                "owner_name": head.findtext("ownerName", ""),
            }

        return api_response({
            "feeds": feeds,
            "total": len(feeds),
            "metadata": metadata,
        })

    except ET.ParseError as e:
        return api_error(f"Invalid OPML XML: {str(e)}", 400)


@rss_bp.route("/opml/export", methods=["POST"])
def export_opml():
    """Generate OPML from feed list."""
    body = request.get_json() or {}
    feeds = body.get("feeds", [])
    title = body.get("title", "ChirpSyncer Feeds")
    owner_name = body.get("owner_name", "")

    if not feeds:
        return api_error("No feeds provided", 400)

    # Build OPML
    opml = ET.Element("opml", version="2.0")

    head = ET.SubElement(opml, "head")
    ET.SubElement(head, "title").text = title
    ET.SubElement(head, "dateCreated").text = datetime.utcnow().strftime(
        "%a, %d %b %Y %H:%M:%S GMT"
    )
    if owner_name:
        ET.SubElement(head, "ownerName").text = owner_name

    body_elem = ET.SubElement(opml, "body")

    # Group by folder
    folders = {}
    for feed in feeds:
        folder = feed.get("folder", "")
        if folder not in folders:
            folders[folder] = []
        folders[folder].append(feed)

    # Create outlines
    for folder, folder_feeds in folders.items():
        if folder:
            folder_outline = ET.SubElement(body_elem, "outline", text=folder, title=folder)
            parent = folder_outline
        else:
            parent = body_elem

        for feed in folder_feeds:
            ET.SubElement(
                parent,
                "outline",
                type="rss",
                text=feed.get("title", ""),
                title=feed.get("title", ""),
                xmlUrl=feed.get("url", ""),
                htmlUrl=feed.get("html_url", ""),
            )

    xml_str = ET.tostring(opml, encoding="unicode", xml_declaration=True)

    return api_response({
        "opml": xml_str,
        "feed_count": len(feeds),
    })


@rss_bp.route("/validate", methods=["POST"])
def validate_feed():
    """Validate a feed URL."""
    body = request.get_json() or {}
    feed_url = body.get("url")

    if not feed_url:
        return api_error("Feed URL is required", 400)

    result = {
        "url": feed_url,
        "valid": False,
        "type": None,
        "title": None,
        "entry_count": 0,
        "errors": [],
    }

    try:
        resp = http_requests.get(
            feed_url,
            headers={
                "User-Agent": "ChirpSyncer/1.0 Feed Validator",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
            },
            timeout=15,
        )

        if not resp.ok:
            result["errors"].append(f"HTTP error: {resp.status_code}")
            return api_response(result)

        content = resp.text
        root = ET.fromstring(content)

        if root.tag == "rss":
            result["type"] = "rss"
            channel = root.find("channel")
            if channel is not None:
                result["title"] = channel.findtext("title", "")
                result["entry_count"] = len(channel.findall("item"))
                result["valid"] = True
            else:
                result["errors"].append("RSS feed missing channel element")

        elif root.tag in ["{http://www.w3.org/2005/Atom}feed", "feed"]:
            result["type"] = "atom"
            result["title"] = root.findtext("{http://www.w3.org/2005/Atom}title", "")
            result["entry_count"] = len(root.findall("{http://www.w3.org/2005/Atom}entry"))
            result["valid"] = True

        else:
            result["errors"].append(f"Unknown root element: {root.tag}")

    except ET.ParseError as e:
        result["errors"].append(f"XML parse error: {str(e)}")
    except http_requests.RequestException as e:
        result["errors"].append(f"Request error: {str(e)}")

    return api_response(result)


@rss_bp.route("/hash", methods=["POST"])
def get_feed_hash():
    """Get hash of feed content for change detection."""
    body = request.get_json() or {}
    feed_url = body.get("url")

    if not feed_url:
        return api_error("Feed URL is required", 400)

    try:
        resp = http_requests.get(
            feed_url,
            headers={
                "User-Agent": "ChirpSyncer/1.0 RSS Reader",
            },
            timeout=15,
        )

        if not resp.ok:
            return api_error(f"Failed to fetch feed: {resp.status_code}", resp.status_code)

        content_hash = hashlib.sha256(resp.content).hexdigest()
        etag = resp.headers.get("ETag")
        last_modified = resp.headers.get("Last-Modified")

        return api_response({
            "url": feed_url,
            "content_hash": content_hash,
            "etag": etag,
            "last_modified": last_modified,
            "content_length": len(resp.content),
        })

    except http_requests.RequestException as e:
        return api_error(f"Request failed: {str(e)}", 500)
