# Mergington High School Activities API

A FastAPI application for browsing extracurricular activities and managing site-wide announcements.

## Features

- Browse extracurricular activities with filtering and search
- Sign in as a teacher to register or unregister students
- Show active site-wide announcements from MongoDB
- Manage announcements in the UI with add, edit, and delete controls

## Getting Started

1. Install the dependencies from the repository root:

   ```
   pip install -r requirements.txt
   ```

2. Make sure MongoDB is available at `mongodb://localhost:27017/`.

3. Run the application from the repository root:

   ```
   uvicorn src.app:app --reload
   ```

4. Open your browser and go to:
   - App: http://localhost:8000/
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/activities` | Get all activities with their details and current participant count |
| GET | `/activities/days` | Get all days with scheduled activities |
| POST | `/activities/{activity_name}/signup?email=student@mergington.edu&teacher_username=principal` | Register a student for an activity |
| POST | `/activities/{activity_name}/unregister?email=student@mergington.edu&teacher_username=principal` | Remove a student from an activity |
| GET | `/announcements` | Get active announcements visible on the public site |
| GET | `/announcements/manage?teacher_username=principal` | Get all announcements for management |
| POST | `/announcements?teacher_username=principal` | Create a new announcement |
| PUT | `/announcements/{announcement_id}?teacher_username=principal` | Update an existing announcement |
| DELETE | `/announcements/{announcement_id}?teacher_username=principal` | Delete an announcement |
| POST | `/auth/login?username=principal&password=admin789` | Sign in as a teacher/admin |
| GET | `/auth/check-session?username=principal` | Validate a stored teacher session |

## Data Model

The application stores data in MongoDB.

1. **Activities**

   - Description
   - Schedule and structured schedule details
   - Maximum number of participants allowed
   - List of participant email addresses

2. **Teachers**

   - Username
   - Display name
   - Argon2 password hash
   - Role

3. **Announcements**

   - Message
   - Optional start date
   - Required expiration date
   - Last editor display name
   - Last updated timestamp

## Seed Data

Database initialization includes example activities, teacher accounts, and a sample announcement so the homepage has content on first run.
