ROLES = ["Admin", "Manager", "Sales Rep", "Viewer"]
REGISTERABLE_ROLES = ["Manager", "Sales Rep", "Viewer"]
STATUSES = ["Draft", "Published", "Pending"]
COMMON_TIMEZONES = [
    "UTC",
    "Asia/Katmandu",
    "Asia/Kolkata",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
]

EVENT_FIELD_INFO = {
    "name": {"type": "text", "label": "Event Name", "required": True},
    "subheading": {"type": "text", "label": "Subheading", "required": True},
    "description": {"type": "textarea", "label": "Description", "required": True},
    "bannerUrl": {"type": "url", "label": "Banner Image URL", "required": True},
    "timezone": {"type": "select", "label": "Time Zone", "required": True, "options": COMMON_TIMEZONES},
    "status": {"type": "select", "label": "Status", "required": True, "options": STATUSES},
    "startTime": {"type": "datetime", "label": "Start Date & Time", "required": True},
    "endTime": {"type": "datetime", "label": "End Date & Time", "required": True},
    "vanishTime": {"type": "datetime", "label": "Vanish Date & Time", "required": True},
    "roles": {"type": "multiselect", "label": "Roles", "required": True, "multiple": True, "options": ROLES},
}
