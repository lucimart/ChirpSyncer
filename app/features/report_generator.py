"""
Report Generator (Sprint 7 - REPORTS-001)

Generates analytics reports in multiple formats (CSV, JSON, HTML, PDF).
Supports engagement reports, growth reports, top tweets reports, and data exports.
"""

import sqlite3
import json
import csv
import io
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time


class ReportGenerator:
    """
    Report Generator for analytics data.

    Supports multiple output formats:
    - CSV: Spreadsheet export
    - JSON: API/programmatic access
    - HTML: Web viewing/email
    - PDF: Professional reports (optional)

    Email delivery:
    - Reports can be emailed directly to recipients
    - Uses NotificationService for email sending
    - Supports all report formats
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize ReportGenerator.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with Row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _parse_period(self, period: str) -> int:
        """
        Parse period string to number of days.

        Args:
            period: Period string (e.g., 'week', '30d', '7d')

        Returns:
            Number of days

        Raises:
            ValueError: If period format is invalid
        """
        period_map = {"week": 7, "month": 30, "year": 365}

        if period in period_map:
            return period_map[period]

        # Try to parse format like '30d', '7d', etc.
        if period.endswith("d"):
            try:
                return int(period[:-1])
            except ValueError:
                raise ValueError(f"Invalid period format: {period}")

        raise ValueError(f"Invalid period: {period}")

    def _validate_format(self, format: str):
        """
        Validate output format.

        Args:
            format: Output format

        Raises:
            ValueError: If format is unsupported
        """
        supported_formats = ["csv", "json", "html", "pdf"]
        if format.lower() not in supported_formats:
            raise ValueError(
                f'Unsupported format: {format}. Supported: {", ".join(supported_formats)}'
            )

    def _get_tweets_in_period(self, user_id: int, days: int) -> List[Dict[str, Any]]:
        """
        Get tweets for user in specified period.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            List of tweet dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cutoff_time = int(time.time()) - (days * 86400)

        cursor.execute(
            """
            SELECT
                id,
                twitter_id,
                bluesky_uri,
                original_text,
                likes_count,
                retweets_count,
                replies_count,
                created_at,
                has_media,
                is_thread
            FROM synced_posts
            WHERE user_id = ? AND created_at >= ?
            ORDER BY created_at DESC
        """,
            (user_id, cutoff_time),
        )

        rows = cursor.fetchall()
        conn.close()

        tweets = []
        for row in rows:
            tweets.append(
                {
                    "id": row["id"],
                    "tweet_id": row["twitter_id"] or row["bluesky_uri"],
                    "text": row["original_text"],
                    "likes": row["likes_count"] or 0,
                    "retweets": row["retweets_count"] or 0,
                    "replies": row["replies_count"] or 0,
                    "created_at": row["created_at"],
                    "has_media": bool(row["has_media"]),
                    "is_thread": bool(row["is_thread"]),
                    "total_engagement": (row["likes_count"] or 0)
                    + (row["retweets_count"] or 0)
                    + (row["replies_count"] or 0),
                }
            )

        return tweets

    def _calculate_engagement_rate(
        self, likes: int, retweets: int, replies: int, impressions: int = None
    ) -> float:
        """
        Calculate engagement rate.

        Args:
            likes: Number of likes
            retweets: Number of retweets
            replies: Number of replies
            impressions: Number of impressions (optional, defaults to estimated)

        Returns:
            Engagement rate as percentage
        """
        total_engagement = likes + retweets + replies

        # If impressions not available, estimate based on engagement
        # Rough estimate: impressions ≈ engagement * 10 (assuming ~10% engagement rate)
        if impressions is None or impressions == 0:
            impressions = max(total_engagement * 10, 100)

        if impressions == 0:
            return 0.0

        return round((total_engagement / impressions) * 100, 2)

    def generate_engagement_report(
        self, user_id: int, period: str, format: str
    ) -> bytes:
        """
        Generate engagement report for specified period.

        Args:
            user_id: User ID
            period: Time period ('week', '30d', etc.)
            format: Output format ('csv', 'json', 'html', 'pdf')

        Returns:
            Report as bytes

        Raises:
            ValueError: If format or period is invalid
        """
        self._validate_format(format)
        period_days = self._parse_period(period)

        # Get tweets in period
        tweets = self._get_tweets_in_period(user_id, period_days)

        # Calculate metrics
        total_tweets = len(tweets)
        total_likes = sum(t["likes"] for t in tweets)
        total_retweets = sum(t["retweets"] for t in tweets)
        total_replies = sum(t["replies"] for t in tweets)
        total_engagement = total_likes + total_retweets + total_replies

        # Calculate average engagement rate
        if total_tweets > 0:
            avg_engagement_rate = round(total_engagement / total_tweets, 2)
        else:
            avg_engagement_rate = 0.0

        # Find top tweet
        top_tweet = None
        if tweets:
            top_tweet = max(tweets, key=lambda t: t["total_engagement"])

        # Build report data
        report_data = {
            "period": period,
            "period_days": period_days,
            "total_tweets": total_tweets,
            "total_likes": total_likes,
            "total_retweets": total_retweets,
            "total_replies": total_replies,
            "total_engagement": total_engagement,
            "avg_engagement_rate": avg_engagement_rate,
            "top_tweet": (
                {
                    "tweet_id": top_tweet["tweet_id"],
                    "text": top_tweet["text"],
                    "engagement": top_tweet["total_engagement"],
                }
                if top_tweet
                else None
            ),
            "generated_at": datetime.now().isoformat(),
        }

        # Format output
        if format == "json":
            return self._format_json(report_data)
        elif format == "csv":
            return self._format_csv_engagement(report_data)
        elif format == "html":
            return self._format_html_engagement(report_data)
        elif format == "pdf":
            return self._format_pdf_engagement(report_data)

    def generate_growth_report(self, user_id: int, format: str) -> bytes:
        """
        Generate growth report comparing two periods.

        Args:
            user_id: User ID
            format: Output format ('csv', 'json', 'html', 'pdf')

        Returns:
            Report as bytes

        Raises:
            ValueError: If format is invalid
        """
        self._validate_format(format)

        # Compare last 7 days vs previous 7 days
        period_days = 7

        # Get tweets for both periods
        recent_tweets = self._get_tweets_in_period(user_id, period_days)
        all_tweets = self._get_tweets_in_period(user_id, period_days * 2)

        # Calculate metrics for both periods
        recent_count = len(recent_tweets)

        # Previous period tweets (between 7-14 days ago)
        cutoff_recent = int(time.time()) - (period_days * 86400)
        cutoff_previous = cutoff_recent - (period_days * 86400)
        previous_tweets = [
            t for t in all_tweets if cutoff_previous <= t["created_at"] < cutoff_recent
        ]
        previous_count = len(previous_tweets)

        # Calculate change
        tweets_change = recent_count - previous_count

        # Calculate engagement trends
        recent_engagement = sum(t["total_engagement"] for t in recent_tweets)
        previous_engagement = sum(t["total_engagement"] for t in previous_tweets)

        # Determine trend
        if recent_engagement > previous_engagement * 1.1:  # 10% threshold
            trend = "increasing"
        elif recent_engagement < previous_engagement * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"

        # Build report data
        report_data = {
            "period_days": period_days,
            "first_period_tweets": previous_count,
            "second_period_tweets": recent_count,
            "tweets_change": tweets_change,
            "first_period_engagement": previous_engagement,
            "second_period_engagement": recent_engagement,
            "engagement_change": recent_engagement - previous_engagement,
            "engagement_trend": trend,
            "generated_at": datetime.now().isoformat(),
        }

        # Format output
        if format == "json":
            return self._format_json(report_data)
        elif format == "csv":
            return self._format_csv_growth(report_data)
        elif format == "html":
            return self._format_html_growth(report_data)
        elif format == "pdf":
            return self._format_pdf_growth(report_data)

    def generate_top_tweets_report(
        self, user_id: int, limit: int, format: str
    ) -> bytes:
        """
        Generate top tweets report.

        Args:
            user_id: User ID
            limit: Maximum number of tweets to include
            format: Output format ('csv', 'json', 'html', 'pdf')

        Returns:
            Report as bytes

        Raises:
            ValueError: If format is invalid
        """
        self._validate_format(format)

        # Get all tweets for user (last 30 days by default)
        tweets = self._get_tweets_in_period(user_id, 30)

        # Sort by total engagement
        tweets.sort(key=lambda t: t["total_engagement"], reverse=True)

        # Limit results
        top_tweets = tweets[:limit]

        # Format output
        if format == "json":
            return self._format_json(top_tweets)
        elif format == "csv":
            return self._format_csv_top_tweets(top_tweets)
        elif format == "html":
            return self._format_html_top_tweets(top_tweets, limit)
        elif format == "pdf":
            return self._format_pdf_top_tweets(top_tweets, limit)

    def export_data(self, user_id: int, data_type: str, format: str) -> bytes:
        """
        Export data in specified format.

        Args:
            user_id: User ID
            data_type: Type of data to export ('tweets', 'engagement')
            format: Output format ('csv', 'json', 'html', 'pdf')

        Returns:
            Exported data as bytes

        Raises:
            ValueError: If format or data_type is invalid
        """
        self._validate_format(format)

        supported_types = ["tweets", "engagement"]
        if data_type not in supported_types:
            raise ValueError(
                f'Unsupported data type: {data_type}. Supported: {", ".join(supported_types)}'
            )

        # Get data based on type
        if data_type == "tweets":
            data = self._get_tweets_in_period(user_id, 365)  # All tweets from last year
        elif data_type == "engagement":
            # Same as tweets but focused on engagement metrics
            data = self._get_tweets_in_period(user_id, 365)
        else:
            # This should never happen due to validation above, but satisfies static analysis
            raise ValueError(f"Invalid data_type: {data_type}")

        # Format output
        if format == "json":
            return self._format_json(data)
        elif format == "csv":
            return self._format_csv_export(data, data_type)
        elif format == "html":
            return self._format_html_export(data, data_type)
        elif format == "pdf":
            return self._format_pdf_export(data, data_type)

    # ========================================================================
    # FORMAT HELPERS - JSON
    # ========================================================================

    def _format_json(self, data: Any) -> bytes:
        """Format data as JSON"""
        return json.dumps(data, indent=2).encode("utf-8")

    # ========================================================================
    # FORMAT HELPERS - CSV
    # ========================================================================

    def _format_csv_engagement(self, data: Dict[str, Any]) -> bytes:
        """Format engagement report as CSV"""
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "period",
                "period_days",
                "total_tweets",
                "total_likes",
                "total_retweets",
                "total_replies",
                "total_engagement",
                "avg_engagement_rate",
                "generated_at",
            ],
        )

        writer.writeheader()
        writer.writerow(
            {
                "period": data["period"],
                "period_days": data["period_days"],
                "total_tweets": data["total_tweets"],
                "total_likes": data["total_likes"],
                "total_retweets": data["total_retweets"],
                "total_replies": data["total_replies"],
                "total_engagement": data["total_engagement"],
                "avg_engagement_rate": data["avg_engagement_rate"],
                "generated_at": data["generated_at"],
            }
        )

        return output.getvalue().encode("utf-8")

    def _format_csv_growth(self, data: Dict[str, Any]) -> bytes:
        """Format growth report as CSV"""
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "period_days",
                "first_period_tweets",
                "second_period_tweets",
                "tweets_change",
                "engagement_trend",
                "generated_at",
            ],
        )

        writer.writeheader()
        writer.writerow(
            {
                "period_days": data["period_days"],
                "first_period_tweets": data["first_period_tweets"],
                "second_period_tweets": data["second_period_tweets"],
                "tweets_change": data["tweets_change"],
                "engagement_trend": data["engagement_trend"],
                "generated_at": data["generated_at"],
            }
        )

        return output.getvalue().encode("utf-8")

    def _format_csv_top_tweets(self, tweets: List[Dict[str, Any]]) -> bytes:
        """Format top tweets as CSV"""
        output = io.StringIO()

        if not tweets:
            return output.getvalue().encode("utf-8")

        writer = csv.DictWriter(
            output,
            fieldnames=[
                "tweet_id",
                "text",
                "likes",
                "retweets",
                "replies",
                "total_engagement",
                "has_media",
                "is_thread",
            ],
        )

        writer.writeheader()
        for tweet in tweets:
            writer.writerow(
                {
                    "tweet_id": tweet["tweet_id"],
                    "text": tweet["text"],
                    "likes": tweet["likes"],
                    "retweets": tweet["retweets"],
                    "replies": tweet["replies"],
                    "total_engagement": tweet["total_engagement"],
                    "has_media": tweet["has_media"],
                    "is_thread": tweet["is_thread"],
                }
            )

        return output.getvalue().encode("utf-8")

    def _format_csv_export(self, data: List[Dict[str, Any]], data_type: str) -> bytes:
        """Format data export as CSV"""
        output = io.StringIO()

        if not data:
            return output.getvalue().encode("utf-8")

        if data_type == "tweets" or data_type == "engagement":
            writer = csv.DictWriter(
                output,
                fieldnames=[
                    "tweet_id",
                    "text",
                    "likes",
                    "retweets",
                    "replies",
                    "total_engagement",
                    "created_at",
                    "has_media",
                    "is_thread",
                ],
            )

            writer.writeheader()
            for item in data:
                writer.writerow(
                    {
                        "tweet_id": item["tweet_id"],
                        "text": item["text"],
                        "likes": item["likes"],
                        "retweets": item["retweets"],
                        "replies": item["replies"],
                        "total_engagement": item["total_engagement"],
                        "created_at": (
                            datetime.fromtimestamp(item["created_at"]).isoformat()
                            if item.get("created_at")
                            else ""
                        ),
                        "has_media": item["has_media"],
                        "is_thread": item["is_thread"],
                    }
                )

        return output.getvalue().encode("utf-8")

    # ========================================================================
    # FORMAT HELPERS - HTML
    # ========================================================================

    def _format_html_engagement(self, data: Dict[str, Any]) -> bytes:
        """Format engagement report as HTML"""
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Engagement Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .report-container {{
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #1DA1F2;
            border-bottom: 3px solid #1DA1F2;
            padding-bottom: 10px;
        }}
        .metrics {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }}
        .metric {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #1DA1F2;
        }}
        .metric-label {{
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
        }}
        .metric-value {{
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }}
        .footer {{
            margin-top: 30px;
            color: #666;
            font-size: 12px;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <h1>Engagement Report</h1>
        <p><strong>Period:</strong> {data['period']} ({data['period_days']} days)</p>

        <div class="metrics">
            <div class="metric">
                <div class="metric-label">Total Tweets</div>
                <div class="metric-value">{data['total_tweets']}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Total Likes</div>
                <div class="metric-value">{data['total_likes']}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Total Retweets</div>
                <div class="metric-value">{data['total_retweets']}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Total Replies</div>
                <div class="metric-value">{data['total_replies']}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Total Engagement</div>
                <div class="metric-value">{data['total_engagement']}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Avg Engagement/Tweet</div>
                <div class="metric-value">{data['avg_engagement_rate']}</div>
            </div>
        </div>

        {'<h2>Top Tweet</h2><p>' + data['top_tweet']['text'][:100] + '...</p><p><strong>Engagement:</strong> ' + str(data['top_tweet']['engagement']) + '</p>' if data['top_tweet'] else ''}

        <div class="footer">
            Generated at {data['generated_at']}
        </div>
    </div>
</body>
</html>
"""
        return html.encode("utf-8")

    def _format_html_growth(self, data: Dict[str, Any]) -> bytes:
        """Format growth report as HTML"""
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Growth Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{ color: #1DA1F2; }}
        .metric {{ margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>Growth Report</h1>
    <div class="metric">
        <strong>Tweets Change:</strong> {data['tweets_change']:+d}
    </div>
    <div class="metric">
        <strong>Engagement Trend:</strong> {data['engagement_trend'].capitalize()}
    </div>
    <div class="metric">
        <strong>Previous Period:</strong> {data['first_period_tweets']} tweets
    </div>
    <div class="metric">
        <strong>Recent Period:</strong> {data['second_period_tweets']} tweets
    </div>
</body>
</html>
"""
        return html.encode("utf-8")

    def _format_html_top_tweets(
        self, tweets: List[Dict[str, Any]], limit: int
    ) -> bytes:
        """Format top tweets as HTML"""
        tweets_html = ""
        for i, tweet in enumerate(tweets, 1):
            tweets_html += f"""
            <div class="tweet">
                <h3>#{i} - {tweet['total_engagement']} total engagement</h3>
                <p>{tweet['text'][:200]}...</p>
                <p><strong>Likes:</strong> {tweet['likes']} | <strong>Retweets:</strong> {tweet['retweets']} | <strong>Replies:</strong> {tweet['replies']}</p>
            </div>
            """

        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Top Tweets Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{ color: #1DA1F2; }}
        .tweet {{
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #1DA1F2;
        }}
    </style>
</head>
<body>
    <h1>Top Tweets (Top {limit})</h1>
    {tweets_html}
</body>
</html>
"""
        return html.encode("utf-8")

    def _format_html_export(self, data: List[Dict[str, Any]], data_type: str) -> bytes:
        """Format data export as HTML"""
        return self._format_html_top_tweets(data, len(data))

    # ========================================================================
    # FORMAT HELPERS - PDF (Optional)
    # ========================================================================

    def _format_pdf_engagement(self, data: Dict[str, Any]) -> bytes:
        """Format engagement report as PDF (optional, requires WeasyPrint)"""
        try:
            from weasyprint import HTML

            html_content = self._format_html_engagement(data).decode("utf-8")
            return HTML(string=html_content).write_pdf()
        except ImportError:
            # Fallback to HTML if WeasyPrint not available
            return self._format_html_engagement(data)

    def _format_pdf_growth(self, data: Dict[str, Any]) -> bytes:
        """Format growth report as PDF (optional)"""
        try:
            from weasyprint import HTML

            html_content = self._format_html_growth(data).decode("utf-8")
            return HTML(string=html_content).write_pdf()
        except ImportError:
            return self._format_html_growth(data)

    def _format_pdf_top_tweets(self, tweets: List[Dict[str, Any]], limit: int) -> bytes:
        """Format top tweets as PDF (optional)"""
        try:
            from weasyprint import HTML

            html_content = self._format_html_top_tweets(tweets, limit).decode("utf-8")
            return HTML(string=html_content).write_pdf()
        except ImportError:
            return self._format_html_top_tweets(tweets, limit)

    def _format_pdf_export(self, data: List[Dict[str, Any]], data_type: str) -> bytes:
        """Format data export as PDF (optional)"""
        try:
            from weasyprint import HTML

            html_content = self._format_html_export(data, data_type).decode("utf-8")
            return HTML(string=html_content).write_pdf()
        except ImportError:
            return self._format_html_export(data, data_type)

    # ========================================================================
    # EMAIL DELIVERY
    # ========================================================================

    def email_report(
        self, report_content: bytes, report_type: str, format: str, recipient_email: str
    ) -> Dict[str, Any]:
        """
        Email a generated report to specified recipient.

        Args:
            report_content: The report content (bytes)
            report_type: Type of report ('engagement', 'growth', 'top_tweets')
            format: Report format ('pdf', 'csv', 'json', 'html')
            recipient_email: Email address to send to

        Returns:
            Dict with status and message
        """
        try:
            from app.services.notification_service import NotificationService

            # NotificationService loads SMTP config from environment
            notifier = NotificationService()

            # Create email subject
            subject = f"ChirpSyncer {report_type.title()} Report ({format.upper()})"

            # Email body with inline content or attachment handling
            if format == "html":
                # HTML can be inlined
                body = report_content.decode("utf-8")
            else:
                # Other formats as text
                body = (
                    f"{report_type.title()} Report\n\n{report_content.decode('utf-8')}"
                )

            # Send email
            result = notifier.send_email(
                to=recipient_email, subject=subject, body=body, html=(format == "html")
            )

            return {
                "success": True,
                "message": f"Report emailed to {recipient_email}",
                "email_id": result.get("email_id"),
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_and_email_engagement_report(
        self, user_id: int, period: str, format: str, recipient_email: str
    ) -> Dict[str, Any]:
        """Generate engagement report and email it"""
        report = self.generate_engagement_report(user_id, period, format)
        return self.email_report(report, "engagement", format, recipient_email)

    def generate_and_email_growth_report(
        self, user_id: int, format: str, recipient_email: str
    ) -> Dict[str, Any]:
        """Generate growth report and email it"""
        report = self.generate_growth_report(user_id, format)
        return self.email_report(report, "growth", format, recipient_email)

    def generate_and_email_top_tweets_report(
        self, user_id: int, limit: int, format: str, recipient_email: str
    ) -> Dict[str, Any]:
        """Generate top tweets report and email it"""
        report = self.generate_top_tweets_report(user_id, limit, format)
        return self.email_report(report, "top_tweets", format, recipient_email)
