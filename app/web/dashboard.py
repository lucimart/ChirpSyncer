"""
Dashboard Web Interface (Sprint 6 - DASH-002)

Flask dashboard with multi-user authentication, user management, and credential management.
Provides routes for:
- Authentication: /login, /logout, /register, /api/auth/check
- User Management: /users, /users/<id>, /users/<id>/edit, /users/<id>/delete
- Credential Management: /credentials, /credentials/add, /credentials/<id>/edit,
                        /credentials/<id>/delete, /credentials/<id>/test, /credentials/share
"""

import os
import logging
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    flash,
    abort,
    g,
)
from flask_session import Session
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth, require_admin, require_self_or_admin
from app.auth.security_utils import validate_password
from app.features.analytics_tracker import AnalyticsTracker
from app.features.search_engine import SearchEngine
from app.models.feed_rule import init_feed_rules_db
from app.web.api.v1 import api_v1
from app.web.api.v1.responses import api_error
import uuid

logger = logging.getLogger(__name__)


def create_app(db_path="chirpsyncer.db", master_key=None):
    """
    Create and configure Flask application.

    Args:
        db_path: Path to SQLite database
        master_key: Master key for credential encryption (32 bytes)

    Returns:
        Configured Flask application
    """
    app = Flask(__name__)

    # Configure app
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", os.urandom(32).hex())
    app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET", app.config["SECRET_KEY"])
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["DB_PATH"] = db_path

    # Initialize master key for credentials
    if master_key is None:
        # Try to get from environment or generate
        master_key_hex = os.environ.get("MASTER_KEY")
        if master_key_hex:
            master_key = bytes.fromhex(master_key_hex)
        else:
            master_key = os.urandom(32)

    app.config["MASTER_KEY"] = master_key

    # Initialize Flask-Session
    Session(app)

    # Register API blueprint
    app.register_blueprint(api_v1)

    @app.before_request
    def ensure_api_correlation_id():
        if request.path.startswith("/api/v1") and not hasattr(g, "correlation_id"):
            g.correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))

    @app.errorhandler(404)
    def handle_404(error):
        if request.path.startswith("/api/v1"):
            return api_error("NOT_FOUND", "Resource not found", status=404)
        return error

    # Initialize database tables
    user_manager = UserManager(db_path)
    user_manager.init_db()

    credential_manager = CredentialManager(master_key, db_path)
    credential_manager.init_db()

    analytics_tracker = AnalyticsTracker(db_path)
    analytics_tracker.init_db()
    init_feed_rules_db(db_path)

    # ========================================================================
    # AUTHENTICATION ROUTES
    # ========================================================================

    @app.route("/login", methods=["GET", "POST"])
    def login():
        """Login page and handler"""
        if request.method == "GET":
            return render_template("login.html")

        # POST: Handle login
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            flash("Username and password are required", "error")
            return render_template("login.html")

        user_manager = UserManager(app.config["DB_PATH"])
        user = user_manager.authenticate_user(username, password)

        if user:
            # Create database-tracked session
            ip_address = request.remote_addr or "unknown"
            user_agent = request.headers.get("User-Agent", "unknown")
            session_token = user_manager.create_session(user.id, ip_address, user_agent)

            # Store in Flask session
            session["user_id"] = user.id
            session["username"] = user.username
            session["is_admin"] = user.is_admin
            session["session_token"] = session_token

            flash(f"Welcome back, {user.username}!", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid username or password", "error")
            return render_template("login.html")

    @app.route("/logout", methods=["POST"])
    def logout():
        """Logout handler"""
        # Delete session from database if it exists
        if "session_token" in session:
            user_manager = UserManager(app.config["DB_PATH"])
            user_manager.delete_session(session["session_token"])

        session.clear()
        flash("You have been logged out", "success")
        return redirect(url_for("login"))

    @app.route("/register", methods=["GET", "POST"])
    def register():
        """Registration page and handler"""
        if request.method == "GET":
            return render_template("register.html")

        # POST: Handle registration
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        # Validate inputs
        if not username or not email or not password:
            flash("All fields are required", "error")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match", "error")
            return render_template("register.html")

        if not validate_password(password):
            flash("Password does not meet security requirements", "error")
            return render_template("register.html")

        # Create user
        user_manager = UserManager(app.config["DB_PATH"])
        try:
            _ = user_manager.create_user(username, email, password, is_admin=False)
            flash("Registration successful! Please login.", "success")
            return redirect(url_for("login"))
        except ValueError as e:
            flash(str(e), "error")
            return render_template("register.html")

    @app.route("/api/auth/check")
    def check_auth():
        """Check if user is authenticated (API endpoint)"""
        if "user_id" in session:
            return jsonify(
                {
                    "authenticated": True,
                    "user_id": session["user_id"],
                    "username": session.get("username"),
                    "is_admin": session.get("is_admin", False),
                }
            )
        else:
            return jsonify({"authenticated": False})

    # ========================================================================
    # DASHBOARD ROUTES
    # ========================================================================

    @app.route("/")
    @require_auth
    def dashboard():
        """Main dashboard page"""
        return render_template(
            "dashboard.html",
            username=session.get("username"),
            is_admin=session.get("is_admin", False),
        )

    # ========================================================================
    # USER MANAGEMENT ROUTES
    # ========================================================================

    @app.route("/users")
    @require_admin
    def users_list():
        """List all users (admin only)"""
        user_manager = UserManager(app.config["DB_PATH"])
        users = user_manager.list_users()
        return render_template("users_list.html", users=users)

    @app.route("/users/<int:user_id>")
    @require_self_or_admin
    def user_detail(user_id):
        """User detail page (own profile or admin)"""
        user_manager = UserManager(app.config["DB_PATH"])
        user = user_manager.get_user_by_id(user_id)

        if not user:
            abort(404)

        # Get user's credentials (metadata only)
        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )
        credentials = credential_manager.list_user_credentials(user_id)

        return render_template(
            "user_detail.html",
            user=user,
            credentials=credentials,
            is_self=(session["user_id"] == user_id),
        )

    @app.route("/users/<int:user_id>/edit", methods=["POST"])
    @require_self_or_admin
    def user_edit(user_id):
        """Edit user (own profile or admin)"""
        user_manager = UserManager(app.config["DB_PATH"])

        # Get updated fields
        updates = {}
        if "email" in request.form:
            updates["email"] = request.form["email"]
        if "password" in request.form and request.form["password"]:
            if not validate_password(request.form["password"]):
                flash("Password does not meet security requirements", "error")
                return redirect(url_for("user_detail", user_id=user_id))
            updates["password"] = request.form["password"]

        # Admin can update is_active and is_admin
        if session.get("is_admin"):
            if "is_active" in request.form:
                updates["is_active"] = request.form["is_active"] == "1"
            if "is_admin" in request.form:
                updates["is_admin"] = request.form["is_admin"] == "1"

        if user_manager.update_user(user_id, **updates):
            flash("User updated successfully", "success")
        else:
            flash("Failed to update user", "error")

        return redirect(url_for("user_detail", user_id=user_id))

    @app.route("/users/<int:user_id>/delete", methods=["POST"])
    @require_admin
    def user_delete(user_id):
        """Delete user (admin only)"""
        user_manager = UserManager(app.config["DB_PATH"])

        # Prevent deleting self
        if user_id == session["user_id"]:
            flash("Cannot delete your own account", "error")
            return redirect(url_for("users_list"))

        if user_manager.delete_user(user_id):
            flash("User deleted successfully", "success")
        else:
            flash("Failed to delete user", "error")

        return redirect(url_for("users_list"))

    # ========================================================================
    # CREDENTIAL MANAGEMENT ROUTES
    # ========================================================================

    @app.route("/credentials")
    @require_auth
    def credentials_list():
        """List user's credentials"""
        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )
        credentials = credential_manager.list_user_credentials(session["user_id"])
        shared_credentials = credential_manager.get_shared_credentials(
            session["user_id"]
        )

        return render_template(
            "credentials_manage.html",
            credentials=credentials,
            shared_credentials=shared_credentials,
        )

    @app.route("/credentials/add", methods=["GET", "POST"])
    @require_auth
    def credentials_add():
        """Add new credentials"""
        if request.method == "GET":
            return render_template(
                "credentials_form.html", action="add", platforms=["twitter", "bluesky"]
            )

        # POST: Handle adding credentials
        platform = request.form.get("platform")
        credential_type = request.form.get("credential_type")

        # Build credential data based on platform and type
        data = {}
        if platform == "twitter" and credential_type == "scraping":
            data = {
                "username": request.form.get("username"),
                "password": request.form.get("password"),
                "email": request.form.get("email", ""),
                "email_password": request.form.get("email_password", ""),
            }
        elif platform == "twitter" and credential_type == "api":
            data = {
                "api_key": request.form.get("api_key"),
                "api_secret": request.form.get("api_secret"),
                "access_token": request.form.get("access_token"),
                "access_secret": request.form.get("access_secret"),
            }
        elif platform == "bluesky":
            data = {
                "username": request.form.get("username"),
                "password": request.form.get("password"),
            }

        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )
        try:
            credential_manager.save_credentials(
                session["user_id"], platform, credential_type, data
            )
            flash("Credentials added successfully", "success")
            return redirect(url_for("credentials_list"))
        except Exception as e:
            flash(f"Failed to add credentials: {str(e)}", "error")
            return render_template(
                "credentials_form.html", action="add", platforms=["twitter", "bluesky"]
            )

    @app.route("/credentials/<int:cred_id>/edit", methods=["GET", "POST"])
    @require_auth
    def credentials_edit(cred_id):
        """Edit credentials"""
        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )

        # Get credential metadata
        user_creds = credential_manager.list_user_credentials(session["user_id"])
        cred = next((c for c in user_creds if c["id"] == cred_id), None)

        if not cred:
            abort(404)

        if request.method == "GET":
            # Get decrypted credentials for editing
            decrypted = credential_manager.get_credentials(
                session["user_id"], cred["platform"], cred["credential_type"]
            )
            return render_template(
                "credentials_form.html",
                action="edit",
                credential_id=cred_id,
                platform=cred["platform"],
                credential_type=cred["credential_type"],
                data=decrypted,
            )

        # POST: Handle updating credentials
        data = {}
        platform = cred["platform"]
        credential_type = cred["credential_type"]

        if platform == "twitter" and credential_type == "scraping":
            data = {
                "username": request.form.get("username"),
                "password": request.form.get("password"),
                "email": request.form.get("email", ""),
                "email_password": request.form.get("email_password", ""),
            }
        elif platform == "twitter" and credential_type == "api":
            data = {
                "api_key": request.form.get("api_key"),
                "api_secret": request.form.get("api_secret"),
                "access_token": request.form.get("access_token"),
                "access_secret": request.form.get("access_secret"),
            }
        elif platform == "bluesky":
            data = {
                "username": request.form.get("username"),
                "password": request.form.get("password"),
            }

        if credential_manager.update_credentials(
            session["user_id"], platform, credential_type, data
        ):
            flash("Credentials updated successfully", "success")
        else:
            flash("Failed to update credentials", "error")

        return redirect(url_for("credentials_list"))

    @app.route("/credentials/<int:cred_id>/delete", methods=["POST"])
    @require_auth
    def credentials_delete(cred_id):
        """Delete credentials"""
        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )

        # Get credential metadata to verify ownership
        user_creds = credential_manager.list_user_credentials(session["user_id"])
        cred = next((c for c in user_creds if c["id"] == cred_id), None)

        if not cred:
            abort(404)

        # Check if user is the owner of the credential (not just shared with them)
        if cred.get("owner_user_id") and cred["owner_user_id"] != session["user_id"]:
            flash("Cannot delete shared credentials", "error")
            abort(403)

        if credential_manager.delete_credentials(
            session["user_id"], cred["platform"], cred["credential_type"]
        ):
            flash("Credentials deleted successfully", "success")
        else:
            flash("Failed to delete credentials", "error")

        return redirect(url_for("credentials_list"))

    @app.route("/credentials/<int:cred_id>/test", methods=["POST"])
    @require_auth
    def credentials_test(cred_id):
        """Test credentials by attempting to login"""
        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )

        # Get credential metadata
        user_creds = credential_manager.list_user_credentials(session["user_id"])
        cred = next((c for c in user_creds if c["id"] == cred_id), None)

        if not cred:
            return jsonify({"success": False, "error": "Credential not found"}), 404

        # Get decrypted credentials
        data = credential_manager.get_credentials(
            session["user_id"], cred["platform"], cred["credential_type"]
        )

        if not data:
            return jsonify({"success": False, "error": "Failed to load credentials"})

        # Test credentials against actual API
        from app.integrations.credential_validator import validate_credentials

        try:
            success, message = validate_credentials(
                cred["platform"], cred["credential_type"], data
            )

            return jsonify(
                {
                    "success": success,
                    "message": message,
                    "platform": cred["platform"],
                    "credential_type": cred["credential_type"],
                }
            )
        except Exception as e:
            logger.error(f"Error validating credentials: {str(e)}")
            return jsonify({"success": False, "error": "An internal error occurred"})

    @app.route("/credentials/share", methods=["POST"])
    @require_auth
    def credentials_share():
        """Share credentials with other users"""
        credential_id = request.form.get("credential_id")
        user_ids_str = request.form.get("user_ids", "")

        # Parse user IDs
        try:
            user_ids = [
                int(uid.strip()) for uid in user_ids_str.split(",") if uid.strip()
            ]
        except ValueError:
            flash("Invalid user IDs", "error")
            return redirect(url_for("credentials_list"))

        credential_manager = CredentialManager(
            app.config["MASTER_KEY"], app.config["DB_PATH"]
        )

        # Get credential metadata
        user_creds = credential_manager.list_user_credentials(session["user_id"])
        cred = next((c for c in user_creds if c["id"] == int(credential_id)), None)

        if not cred:
            flash("Credential not found", "error")
            return redirect(url_for("credentials_list"))

        if credential_manager.share_credentials(
            session["user_id"], cred["platform"], cred["credential_type"], user_ids
        ):
            flash("Credentials shared successfully", "success")
        else:
            flash("Failed to share credentials", "error")

        return redirect(url_for("credentials_list"))

    # ========================================================================
    # TASK MANAGEMENT ROUTES (Sprint 6 - TASK-003)
    # ========================================================================

    def _get_scheduler():
        """Get TaskScheduler instance (mock-aware for testing)"""
        if "TASK_SCHEDULER" in app.config:
            return app.config["TASK_SCHEDULER"]
        # In production, get from app context or singleton
        # For now, return None if not configured
        return None

    @app.route("/tasks")
    @require_auth
    def tasks_list():
        """List all scheduled tasks with status"""
        scheduler = _get_scheduler()

        if not scheduler:
            flash("Task scheduler not available", "error")
            return render_template(
                "tasks_list.html", tasks=[], is_admin=session.get("is_admin", False)
            )

        try:
            tasks = scheduler.get_all_tasks()
            return render_template(
                "tasks_list.html",
                tasks=tasks,
                is_admin=session.get("is_admin", False),
                username=session.get("username"),
            )
        except Exception as e:
            flash(f"Error loading tasks: {str(e)}", "error")
            return render_template(
                "tasks_list.html",
                tasks=[],
                is_admin=session.get("is_admin", False),
                username=session.get("username"),
            )

    @app.route("/tasks/<task_name>")
    @require_auth
    def task_detail(task_name):
        """Show task execution history and details"""
        scheduler = _get_scheduler()

        if not scheduler:
            abort(404)

        try:
            task_status = scheduler.get_task_status(task_name)
            if not task_status:
                abort(404)

            task_history = scheduler.get_task_history(task_name, limit=50)

            return render_template(
                "task_detail.html",
                task=task_status,
                history=task_history,
                is_admin=session.get("is_admin", False),
                username=session.get("username"),
            )
        except Exception as e:
            flash(f"Error loading task details: {str(e)}", "error")
            abort(404)
            return None  # Explicit return to satisfy static analysis

    @app.route("/tasks/<task_name>/trigger", methods=["POST"])
    @require_admin
    def task_trigger(task_name):
        """Manually trigger a task now (admin only) - Returns JSON"""
        scheduler = _get_scheduler()

        if not scheduler:
            return jsonify({"success": False, "error": "Scheduler not available"})

        try:
            success = scheduler.trigger_task_now(task_name)

            if success:
                return jsonify(
                    {"success": True, "message": f"Task {task_name} triggered"}
                )
            else:
                return jsonify({"success": False, "error": "Failed to trigger task"})
        except Exception as e:
            logger.error(f"Error triggering task: {str(e)}")
            return jsonify({"success": False, "error": "An internal error occurred"})

    @app.route("/tasks/<task_name>/toggle", methods=["POST"])
    @require_admin
    def task_toggle(task_name):
        """Enable or disable a task (admin only)"""
        scheduler = _get_scheduler()

        if not scheduler:
            return jsonify({"success": False, "error": "Scheduler not available"}), 500

        try:
            task_status = scheduler.get_task_status(task_name)
            if not task_status:
                return jsonify({"success": False, "error": "Task not found"}), 404

            # Toggle based on current state
            if task_status.get("enabled"):
                success = scheduler.pause_task(task_name)
                action = "paused"
            else:
                success = scheduler.resume_task(task_name)
                action = "resumed"

            if success:
                return jsonify({"success": True, "action": action})
            else:
                return (
                    jsonify({"success": False, "error": f"Failed to {action} task"}),
                    500,
                )
        except Exception as e:
            logger.error(f"Error toggling task: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/tasks/<task_name>/configure", methods=["POST"])
    @require_admin
    def task_configure(task_name):
        """Update task schedule (admin only)"""
        scheduler = _get_scheduler()

        if not scheduler:
            flash("Task scheduler not available", "error")
            return redirect(url_for("tasks_list"))

        try:
            schedule = request.form.get("schedule")
            if not schedule:
                flash("Schedule is required", "error")
                return redirect(url_for("task_detail", task_name=task_name))

            # Update task schedule
            if hasattr(scheduler, "update_task_schedule"):
                success = scheduler.update_task_schedule(task_name, schedule)
                if success:
                    flash(
                        f'Task "{task_name}" schedule updated successfully', "success"
                    )
                else:
                    flash(f"Failed to update task schedule", "error")
            else:
                flash("Schedule update not supported", "error")

        except Exception as e:
            flash(f"Error updating schedule: {str(e)}", "error")

        return redirect(url_for("task_detail", task_name=task_name))

    @app.route("/api/tasks/status")
    @require_auth
    def api_tasks_status():
        """Get current task status (JSON API)"""
        scheduler = _get_scheduler()

        if not scheduler:
            return jsonify({"success": False, "error": "Scheduler not available"}), 500

        try:
            tasks = scheduler.get_all_tasks()
            return jsonify({"success": True, "tasks": tasks, "count": len(tasks)})
        except Exception as e:
            logger.error(f"Error getting tasks status: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/tasks/<task_id>/status")
    @require_auth
    def api_task_status(task_id):
        """Get specific task status (JSON API)"""
        scheduler = _get_scheduler()

        if not scheduler:
            return jsonify({"success": False, "error": "Scheduler not available"}), 500

        try:
            task_status = scheduler.get_task_status(task_id)
            if not task_status:
                return jsonify({"success": False, "error": "Task not found"}), 404

            # Map task state to status
            status = "running" if task_status.get("enabled") else "paused"
            if task_status.get("last_run"):
                if task_status.get("success_count", 0) > 0:
                    status = "completed"
                elif task_status.get("failure_count", 0) > 0:
                    status = "failed"

            return jsonify(
                {
                    "success": True,
                    "task_id": task_id,
                    "name": task_status.get("task_name"),
                    "status": status,
                    "enabled": bool(task_status.get("enabled")),
                    "last_run": task_status.get("last_run"),
                    "next_run": task_status.get("next_run"),
                    "run_count": task_status.get("run_count", 0),
                    "success_count": task_status.get("success_count", 0),
                    "failure_count": task_status.get("failure_count", 0),
                }
            )
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    # ========================================================================
    # ANALYTICS ROUTES (Sprint 7 - ANALYTICS-001)
    # ========================================================================

    @app.route("/analytics")
    @require_auth
    def analytics_dashboard():
        """Analytics dashboard page"""
        return render_template(
            "analytics.html",
            username=session.get("username"),
            is_admin=session.get("is_admin", False),
        )

    @app.route("/api/analytics/overview")
    @require_auth
    def analytics_overview():
        """Get analytics overview (JSON API)"""
        try:
            analytics_tracker = AnalyticsTracker(app.config["DB_PATH"])
            user_id = session["user_id"]

            # Get analytics for different periods
            daily = analytics_tracker.get_user_analytics(user_id, "daily")
            weekly = analytics_tracker.get_user_analytics(user_id, "weekly")
            monthly = analytics_tracker.get_user_analytics(user_id, "monthly")

            # Get top tweet
            top_tweets = analytics_tracker.get_top_tweets(
                user_id, metric="engagement_rate", limit=1
            )
            top_tweet = top_tweets[0] if top_tweets else None

            return jsonify(
                {
                    "success": True,
                    "daily": daily,
                    "weekly": weekly,
                    "monthly": monthly,
                    "top_tweet": top_tweet,
                }
            )

        except Exception as e:
            logger.error(f"Error getting analytics overview: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/analytics/top-tweets")
    @require_auth
    def analytics_top_tweets():
        """Get top performing tweets (JSON API)"""
        try:
            analytics_tracker = AnalyticsTracker(app.config["DB_PATH"])
            user_id = session["user_id"]

            # Get parameters from query string
            metric = request.args.get("metric", "engagement_rate")
            limit = int(request.args.get("limit", 10))

            top_tweets = analytics_tracker.get_top_tweets(
                user_id, metric=metric, limit=limit
            )

            return jsonify(
                {
                    "success": True,
                    "tweets": top_tweets,
                    "metric": metric,
                    "count": len(top_tweets),
                }
            )

        except Exception as e:
            logger.error(f"Error getting top tweets: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/analytics/record-metrics", methods=["POST"])
    @require_auth
    def analytics_record_metrics():
        """Record metrics for a tweet (JSON API)"""
        try:
            data = request.get_json(force=True)
            if data is None:
                return jsonify({"success": False, "error": "Invalid JSON"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid JSON format"}), 400

        try:
            analytics_tracker = AnalyticsTracker(app.config["DB_PATH"])
            user_id = session["user_id"]

            tweet_id = data.get("tweet_id")
            metrics = data.get("metrics", {})

            if not tweet_id:
                return jsonify({"success": False, "error": "tweet_id is required"}), 400

            result = analytics_tracker.record_metrics(tweet_id, user_id, metrics)

            return jsonify({"success": result, "tweet_id": tweet_id})

        except Exception as e:
            logger.error(f"Error recording metrics: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/analytics/create-snapshot", methods=["POST"])
    @require_auth
    def analytics_create_snapshot():
        """Create analytics snapshot (JSON API)"""
        try:
            data = request.get_json(force=True)
            if data is None:
                return jsonify({"success": False, "error": "Invalid JSON"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid JSON format"}), 400

        try:
            analytics_tracker = AnalyticsTracker(app.config["DB_PATH"])
            user_id = session["user_id"]

            period = data.get("period", "daily")

            result = analytics_tracker.create_snapshot(user_id, period)

            return jsonify({"success": result, "period": period})

        except Exception as e:
            logger.error(f"Error creating snapshot: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/analytics/export")
    @require_auth
    def analytics_export():
        """Export analytics data to CSV"""
        try:
            import csv
            import io
            import sqlite3
            from datetime import datetime
            from flask import Response

            # Check format parameter
            export_format = request.args.get("format", "")
            if export_format != "csv":
                return (
                    jsonify(
                        {"success": False, "error": "Only CSV format is supported"}
                    ),
                    400,
                )

            user_id = session["user_id"]
            start_date = request.args.get("start_date")
            end_date = request.args.get("end_date")

            # Connect to database
            conn = sqlite3.connect(app.config["DB_PATH"])
            cursor = conn.cursor()

            # Build query with optional date filtering
            query = """
                SELECT tweet_id, impressions, likes, retweets, replies,
                       engagements, engagement_rate, timestamp
                FROM tweet_metrics
                WHERE user_id = ?
            """
            params = [user_id]

            # Add date range filtering if provided
            if start_date:
                try:
                    start_dt = datetime.fromisoformat(start_date)
                    start_timestamp = int(start_dt.timestamp())
                    query += " AND timestamp >= ?"
                    params.append(start_timestamp)
                except ValueError:
                    conn.close()
                    return (
                        jsonify(
                            {"success": False, "error": "Invalid start_date format"}
                        ),
                        400,
                    )

            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date)
                    # Add one day to include the entire end date
                    end_timestamp = int(end_dt.timestamp()) + 86400
                    query += " AND timestamp < ?"
                    params.append(end_timestamp)
                except ValueError:
                    conn.close()
                    return (
                        jsonify({"success": False, "error": "Invalid end_date format"}),
                        400,
                    )

            # Order by timestamp descending
            query += " ORDER BY timestamp DESC"

            # Execute query
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()

            # Create CSV in memory
            output = io.StringIO()
            csv_writer = csv.writer(output)

            # Write headers
            csv_writer.writerow(
                [
                    "tweet_id",
                    "impressions",
                    "likes",
                    "retweets",
                    "replies",
                    "engagements",
                    "engagement_rate",
                    "created_at",
                ]
            )

            # Write data rows
            for row in rows:
                # Convert timestamp to ISO format for created_at
                created_at = datetime.fromtimestamp(row[7]).isoformat()
                csv_writer.writerow(
                    [
                        row[0],  # tweet_id
                        row[1],  # impressions
                        row[2],  # likes
                        row[3],  # retweets
                        row[4],  # replies
                        row[5],  # engagements
                        row[6],  # engagement_rate
                        created_at,  # created_at
                    ]
                )

            # Get CSV content
            csv_content = output.getvalue()
            output.close()

            # Return CSV with proper headers
            return Response(
                csv_content,
                mimetype="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=analytics_export.csv"
                },
            )

        except Exception as e:
            logger.error(f"Error exporting analytics: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    @app.route("/api/analytics/snapshots")
    @require_auth
    def analytics_snapshots():
        """Get analytics snapshots for the user"""
        try:
            user_id = session["user_id"]

            # Get snapshots from analytics tracker
            snapshots = analytics_tracker.get_snapshots(user_id)

            return jsonify({"success": True, "snapshots": snapshots})
        except Exception as e:
            logger.error(f"Error getting snapshots: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    # ========================================================================
    # SEARCH ROUTES (Sprint 9 - TASK-901, TASK-902)
    # ========================================================================

    @app.route("/api/search")
    @require_auth
    def api_search():
        """
        Search tweets with filters (JSON API).

        Query parameters:
        - q: Search query (required)
        - date_from: Unix timestamp (minimum date)
        - date_to: Unix timestamp (maximum date)
        - hashtags: Comma-separated list of hashtags
        - author: Filter by tweet author username
        - has_media: Boolean (true/false) - filter by media presence
        - min_likes: Minimum likes count
        - min_retweets: Minimum retweets count
        - limit: Maximum results (default 50, max 100)
        """
        try:
            user_id = session["user_id"]

            # Get search query (required)
            query = request.args.get("q", "").strip()
            if not query:
                return jsonify({"success": False, "error": "Query parameter 'q' is required"}), 400

            # Build filters from query parameters
            filters = {}

            # Date filters
            date_from = request.args.get("date_from")
            if date_from:
                try:
                    filters["date_from"] = int(date_from)
                except ValueError:
                    return jsonify({"success": False, "error": "Invalid date_from format"}), 400

            date_to = request.args.get("date_to")
            if date_to:
                try:
                    filters["date_to"] = int(date_to)
                except ValueError:
                    return jsonify({"success": False, "error": "Invalid date_to format"}), 400

            # Hashtags filter
            hashtags = request.args.get("hashtags")
            if hashtags:
                filters["hashtags"] = [h.strip().lstrip("#") for h in hashtags.split(",") if h.strip()]

            # Author filter
            author = request.args.get("author")
            if author:
                filters["author"] = author.strip().lstrip("@")

            # Media filter (Sprint 9 - TASK-901)
            has_media = request.args.get("has_media")
            if has_media is not None:
                filters["has_media"] = has_media.lower() == "true"

            # Engagement filters (Sprint 9 - TASK-902)
            min_likes = request.args.get("min_likes")
            if min_likes is not None:
                try:
                    filters["min_likes"] = int(min_likes)
                except ValueError:
                    return jsonify({"success": False, "error": "Invalid min_likes format"}), 400

            min_retweets = request.args.get("min_retweets")
            if min_retweets is not None:
                try:
                    filters["min_retweets"] = int(min_retweets)
                except ValueError:
                    return jsonify({"success": False, "error": "Invalid min_retweets format"}), 400

            # Limit
            limit = request.args.get("limit", 50)
            try:
                limit = min(int(limit), 100)  # Cap at 100
            except ValueError:
                limit = 50

            # Execute search
            search_engine = SearchEngine(app.config["DB_PATH"])
            results = search_engine.search_with_filters(query, user_id, filters)

            # Apply limit
            results = results[:limit]

            return jsonify({
                "success": True,
                "query": query,
                "filters": filters,
                "results": results,
                "count": len(results),
            })

        except Exception as e:
            logger.error(f"Error in search: {str(e)}")
            return (
                jsonify({"success": False, "error": "An internal error occurred"}),
                500,
            )

    return app


def main():
    """Run dashboard server"""
    app = create_app()
    # Use environment variable for debug mode (defaults to False for security)
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    # nosemgrep: python.flask.security.audit.app-run-param-config.avoid_app_run_with_bad_host
    app.run(
        host="0.0.0.0",  # nosec B104 - binding to all interfaces intentional for containerized deployment
        port=5000,
        debug=debug_mode,
    )


if __name__ == "__main__":
    main()
