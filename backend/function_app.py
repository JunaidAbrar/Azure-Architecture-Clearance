"""
Azure Functions entry point for Clearance API.
Uses ASGI middleware to wrap the FastAPI application.
"""

import azure.functions as func
from main import app

# Create the Azure Functions app with ASGI middleware
# This wraps our FastAPI app to work with Azure Functions
app_func = func.AsgiFunctionApp(
    app=app,
    http_auth_level=func.AuthLevel.ANONYMOUS
)
